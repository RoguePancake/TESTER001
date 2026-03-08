"use client";

import { useEffect, useState, useCallback } from "react";
import {
  supabase,
  type TimeEntry,
  type Profile,
  type JobSite,
} from "@/lib/supabase";

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDuration(clockIn: string, clockOut?: string | null): string {
  const start = new Date(clockIn).getTime();
  const end = clockOut ? new Date(clockOut).getTime() : Date.now();
  const totalMinutes = Math.floor((end - start) / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${hours}h ${mins}m`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function totalHours(entry: TimeEntry): number {
  if (!entry.clock_out) return 0;
  const ms =
    new Date(entry.clock_out).getTime() - new Date(entry.clock_in).getTime();
  const netMinutes = Math.max(0, ms / 60000 - entry.break_minutes);
  return Math.round((netMinutes / 60) * 100) / 100;
}

function weekBounds(): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() - day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function HoursPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [jobSites, setJobSites] = useState<JobSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [clockingIn, setClockingIn] = useState(false);

  // Clock-in form state
  const [selectedUserId, setSelectedUserId] = useState("");
  const [jobName, setJobName] = useState("");
  const [entryNote, setEntryNote] = useState("");

  // Filters
  const [filterName, setFilterName] = useState("");
  const [filterJob, setFilterJob] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  // View mode
  const [viewMode, setViewMode] = useState<"active" | "weekly" | "timesheet">("active");

  const fetchData = useCallback(async () => {
    if (!supabase) return;
    const [profilesRes, entriesRes, sitesRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .eq("is_active", true)
        .order("full_name"),
      supabase
        .from("time_entries")
        .select("*, profiles(full_name, role)")
        .order("clock_in", { ascending: false })
        .limit(500),
      supabase
        .from("job_sites")
        .select("*")
        .eq("status", "active")
        .order("name"),
    ]);
    if (profilesRes.data) setProfiles(profilesRes.data);
    if (entriesRes.data) setEntries(entriesRes.data as TimeEntry[]);
    if (sitesRes.data) setJobSites(sitesRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  async function handleClockIn(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUserId || !supabase) return;
    setClockingIn(true);
    await supabase.from("time_entries").insert({
      user_id: selectedUserId,
      job_name: jobName || null,
      notes: entryNote || null,
      clock_in: new Date().toISOString(),
    });

    // Cross-post to NAF
    const profile = profiles.find((p) => p.id === selectedUserId);
    await supabase.from("naf_entries").insert({
      entry_type: "clock_in",
      body: `${profile?.full_name || "Crew member"} clocked in${jobName ? ` at ${jobName}` : ""}${entryNote ? ` — ${entryNote}` : ""}`,
      job_name: jobName || null,
      user_id: selectedUserId,
    });

    setJobName("");
    setEntryNote("");
    setSelectedUserId("");
    setClockingIn(false);
    fetchData();
  }

  async function handleClockOut(entryId: string) {
    if (!supabase) return;
    const entry = entries.find((e) => e.id === entryId);
    await supabase
      .from("time_entries")
      .update({ clock_out: new Date().toISOString() })
      .eq("id", entryId);

    // Cross-post to NAF
    if (entry) {
      const profile = profiles.find((p) => p.id === entry.user_id);
      const ms = Date.now() - new Date(entry.clock_in).getTime();
      const hrs = Math.floor(ms / 3600000);
      const mins = Math.floor((ms % 3600000) / 60000);
      await supabase.from("naf_entries").insert({
        entry_type: "clock_out",
        body: `${profile?.full_name || "Crew member"} clocked out — ${hrs}h ${mins}m${entry.job_name ? ` from ${entry.job_name}` : ""}`,
        job_name: entry.job_name || null,
        user_id: entry.user_id,
      });
    }
    fetchData();
  }

  async function handleBreakUpdate(entryId: string, currentBreak: number) {
    if (!supabase) return;
    const input = window.prompt(
      "Break minutes for this shift:",
      String(currentBreak)
    );
    if (input === null) return;
    const mins = parseInt(input, 10);
    if (isNaN(mins) || mins < 0) return;
    await supabase
      .from("time_entries")
      .update({ break_minutes: mins })
      .eq("id", entryId);
    fetchData();
  }

  async function handleDeleteEntry(entryId: string) {
    if (!supabase) return;
    const confirmed = window.confirm("Delete this time entry?");
    if (!confirmed) return;
    await supabase.from("time_entries").delete().eq("id", entryId);
    fetchData();
  }

  async function handleEditNotes(entryId: string, currentNotes: string | null) {
    if (!supabase) return;
    const input = window.prompt("Notes for this shift:", currentNotes || "");
    if (input === null) return;
    await supabase
      .from("time_entries")
      .update({ notes: input.trim() || null })
      .eq("id", entryId);
    fetchData();
  }

  // Derived state
  const clockedIn = entries.filter((e) => !e.clock_out);
  const completed = entries.filter((e) => !!e.clock_out);

  const { start: weekStart, end: weekEnd } = weekBounds();
  const weekEntries = completed.filter((e) => {
    const d = new Date(e.clock_in);
    return d >= weekStart && d <= weekEnd;
  });

  // Weekly summary: hours per person
  const weeklySummary: Record<string, { name: string; role: string; hours: number; shifts: number; overtimeHrs: number }> = {};
  for (const e of weekEntries) {
    const name = e.profiles?.full_name ?? "Unknown";
    const role = (e.profiles as { role?: string })?.role ?? "";
    if (!weeklySummary[e.user_id])
      weeklySummary[e.user_id] = { name, role, hours: 0, shifts: 0, overtimeHrs: 0 };
    weeklySummary[e.user_id].hours += totalHours(e);
    weeklySummary[e.user_id].shifts += 1;
  }

  // Calculate overtime (40hr threshold)
  for (const key of Object.keys(weeklySummary)) {
    const s = weeklySummary[key];
    if (s.hours > 40) {
      s.overtimeHrs = s.hours - 40;
    }
  }

  const totalWeekHours = Object.values(weeklySummary).reduce(
    (sum, s) => sum + s.hours,
    0
  );

  // Filtered timesheet
  const filteredCompleted = completed.filter((e) => {
    if (filterName && !e.profiles?.full_name?.toLowerCase().includes(filterName.toLowerCase()))
      return false;
    if (filterJob) {
      const job = e.job_name || "";
      if (!job.toLowerCase().includes(filterJob.toLowerCase())) return false;
    }
    if (filterDateFrom) {
      const d = new Date(e.clock_in);
      const from = new Date(filterDateFrom);
      from.setHours(0, 0, 0, 0);
      if (d < from) return false;
    }
    if (filterDateTo) {
      const d = new Date(e.clock_in);
      const to = new Date(filterDateTo);
      to.setHours(23, 59, 59, 999);
      if (d > to) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Loading time cards...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          ⏱ Hours & Time Cards
        </h1>
        <div className="flex gap-1">
          {(
            [
              { id: "active", label: "Active" },
              { id: "weekly", label: "Weekly" },
              { id: "timesheet", label: "Timesheet" },
            ] as const
          ).map((v) => (
            <button
              key={v.id}
              onClick={() => setViewMode(v.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                viewMode === v.id
                  ? "bg-green-700 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Clock In Form ──────────────────────────────────────────────── */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h2 className="font-semibold text-lg mb-4">Clock In</h2>
        <form
          onSubmit={handleClockIn}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Crew Member <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">— Select crew member —</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name} ({p.role})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Job / Site
            </label>
            <input
              type="text"
              placeholder="e.g. Smith Residence"
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
              list="job-sites-hours"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <datalist id="job-sites-hours">
              {jobSites.map((s) => (
                <option key={s.id} value={s.name} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <input
              type="text"
              placeholder="Shift notes..."
              value={entryNote}
              onChange={(e) => setEntryNote(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={clockingIn || !selectedUserId}
              className="w-full bg-green-700 hover:bg-green-800 text-white font-semibold px-6 py-2.5 rounded-lg text-sm disabled:opacity-50 transition-colors"
            >
              {clockingIn ? "Clocking in..." : "✅ Clock In Now"}
            </button>
          </div>
        </form>
      </section>

      {/* ── Currently Clocked In ──────────────────────────────────────── */}
      {(viewMode === "active" || clockedIn.length > 0) && (
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="font-semibold text-lg mb-4">
            Currently Clocked In
            <span className="ml-2 bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded-full">
              {clockedIn.length} active
            </span>
          </h2>
          {clockedIn.length === 0 ? (
            <p className="text-sm text-gray-400">
              Nobody clocked in right now.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-100">
                    <th className="pb-2 font-medium">Name</th>
                    <th className="pb-2 font-medium">Role</th>
                    <th className="pb-2 font-medium">Job</th>
                    <th className="pb-2 font-medium">Clock-In</th>
                    <th className="pb-2 font-medium">Duration</th>
                    <th className="pb-2 font-medium">Notes</th>
                    <th className="pb-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {clockedIn.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="py-2.5 font-medium">
                        {entry.profiles?.full_name ?? "—"}
                      </td>
                      <td className="py-2.5 text-gray-500 text-xs">
                        {(entry.profiles as { role?: string })?.role ?? "—"}
                      </td>
                      <td className="py-2.5 text-gray-600">
                        {entry.job_name ?? (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="py-2.5 text-gray-600 font-mono text-xs">
                        {formatTime(entry.clock_in)}
                      </td>
                      <td className="py-2.5">
                        <span className="bg-amber-50 text-amber-700 text-xs font-mono px-2 py-0.5 rounded">
                          {formatDuration(entry.clock_in)}
                        </span>
                      </td>
                      <td className="py-2.5 text-xs text-gray-500 max-w-[150px] truncate">
                        {entry.notes || "—"}
                      </td>
                      <td className="py-2.5">
                        <button
                          onClick={() => handleClockOut(entry.id)}
                          className="bg-red-600 hover:bg-red-700 text-white text-xs font-medium px-3 py-1 rounded-md transition-colors"
                        >
                          Clock Out
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ── Weekly Summary ────────────────────────────────────────────── */}
      {(viewMode === "active" || viewMode === "weekly") && (
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-semibold text-lg">This Week</h2>
            <span className="text-sm font-bold text-green-700">
              {totalWeekHours.toFixed(1)} total hrs
            </span>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            {weekStart.toLocaleDateString()} –{" "}
            {weekEnd.toLocaleDateString()}
          </p>
          {Object.keys(weeklySummary).length === 0 ? (
            <p className="text-sm text-gray-400">
              No completed shifts this week.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.values(weeklySummary)
                .sort((a, b) => b.hours - a.hours)
                .map((row) => (
                  <div
                    key={row.name}
                    className="bg-gray-50 rounded-lg p-3 border border-gray-100"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-gray-800">
                        {row.name}
                      </div>
                      <span className="text-xs text-gray-400">
                        {row.role}
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-green-700 mt-1">
                      {row.hours.toFixed(1)}
                      <span className="text-sm font-normal text-gray-400 ml-1">
                        hrs
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-500">
                        {row.shifts} shifts
                      </span>
                      {row.overtimeHrs > 0 && (
                        <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">
                          {row.overtimeHrs.toFixed(1)}h OT
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </section>
      )}

      {/* ── Timesheet ─────────────────────────────────────────────────── */}
      {(viewMode === "active" || viewMode === "timesheet") && (
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="font-semibold text-lg">Timesheet</h2>
            <div className="flex gap-2 flex-wrap">
              <input
                type="text"
                placeholder="Filter by name..."
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-36"
              />
              <input
                type="text"
                placeholder="Filter by job..."
                value={filterJob}
                onChange={(e) => setFilterJob(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-36"
              />
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                title="From date"
              />
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                title="To date"
              />
              {(filterName || filterJob || filterDateFrom || filterDateTo) && (
                <button
                  onClick={() => {
                    setFilterName("");
                    setFilterJob("");
                    setFilterDateFrom("");
                    setFilterDateTo("");
                  }}
                  className="text-xs text-red-600 hover:text-red-700 px-2"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          {filteredCompleted.length === 0 ? (
            <p className="text-sm text-gray-400">No completed shifts found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-100">
                    <th className="pb-2 font-medium">Name</th>
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Job</th>
                    <th className="pb-2 font-medium">In</th>
                    <th className="pb-2 font-medium">Out</th>
                    <th className="pb-2 font-medium">Break</th>
                    <th className="pb-2 font-medium">Net Hrs</th>
                    <th className="pb-2 font-medium">Notes</th>
                    <th className="pb-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredCompleted.slice(0, 200).map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="py-2 font-medium">
                        {entry.profiles?.full_name ?? "—"}
                      </td>
                      <td className="py-2 text-gray-500 whitespace-nowrap">
                        {formatDate(entry.clock_in)}
                      </td>
                      <td className="py-2 text-gray-600">
                        {entry.job_name ?? (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="py-2 font-mono text-xs">
                        {formatTime(entry.clock_in)}
                      </td>
                      <td className="py-2 font-mono text-xs">
                        {entry.clock_out
                          ? formatTime(entry.clock_out)
                          : "—"}
                      </td>
                      <td className="py-2">
                        <button
                          onClick={() =>
                            handleBreakUpdate(
                              entry.id,
                              entry.break_minutes
                            )
                          }
                          className="text-xs text-gray-500 hover:text-gray-800 underline"
                          title="Click to edit break minutes"
                        >
                          {entry.break_minutes}m
                        </button>
                      </td>
                      <td className="py-2 font-semibold text-green-700">
                        {totalHours(entry).toFixed(2)}
                      </td>
                      <td className="py-2 text-xs text-gray-500 max-w-[120px] truncate">
                        <button
                          onClick={() => handleEditNotes(entry.id, entry.notes)}
                          className="hover:text-gray-800 underline"
                        >
                          {entry.notes || "Add note"}
                        </button>
                      </td>
                      <td className="py-2">
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="text-xs text-red-500 hover:text-red-700"
                          title="Delete entry"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredCompleted.length > 200 && (
                <p className="text-xs text-gray-400 mt-2 text-center">
                  Showing 200 of {filteredCompleted.length} entries
                </p>
              )}
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  {filteredCompleted.length} entries
                </span>
                <span className="text-sm font-semibold text-green-700">
                  Total:{" "}
                  {filteredCompleted
                    .reduce((sum, e) => sum + totalHours(e), 0)
                    .toFixed(1)}{" "}
                  hrs
                </span>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
