"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase, type TimeEntry, type Profile } from "@/lib/supabase";

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
  const ms = new Date(entry.clock_out).getTime() - new Date(entry.clock_in).getTime();
  const netMinutes = Math.max(0, ms / 60000 - entry.break_minutes);
  return Math.round((netMinutes / 60) * 100) / 100;
}

function weekBounds(): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
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
  const [loading, setLoading] = useState(true);
  const [clockingIn, setClocingIn] = useState(false);

  // Clock-in form state
  const [selectedUserId, setSelectedUserId] = useState("");
  const [jobName, setJobName] = useState("");
  const [entryNote, setEntryNote] = useState("");

  // Filters
  const [filterName, setFilterName] = useState("");

  const fetchData = useCallback(async () => {
    const [profilesRes, entriesRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .eq("is_active", true)
        .order("full_name"),
      supabase
        .from("time_entries")
        .select("*, profiles(full_name, role)")
        .order("clock_in", { ascending: false })
        .limit(200),
    ]);
    if (profilesRes.data) setProfiles(profilesRes.data);
    if (entriesRes.data) setEntries(entriesRes.data as TimeEntry[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    // Refresh every 60s so the live duration ticks
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  async function handleClockIn(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUserId) return;
    setClocingIn(true);
    await supabase.from("time_entries").insert({
      user_id: selectedUserId,
      job_name: jobName || null,
      notes: entryNote || null,
      clock_in: new Date().toISOString(),
    });
    setJobName("");
    setEntryNote("");
    setSelectedUserId("");
    setClocingIn(false);
    fetchData();
  }

  async function handleClockOut(entryId: string) {
    await supabase
      .from("time_entries")
      .update({ clock_out: new Date().toISOString() })
      .eq("id", entryId);
    fetchData();
  }

  async function handleBreakUpdate(entryId: string, currentBreak: number) {
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

  // Derived state
  const clockedIn = entries.filter((e) => !e.clock_out);
  const completed = entries.filter((e) => !!e.clock_out);

  const { start: weekStart, end: weekEnd } = weekBounds();
  const weekEntries = completed.filter((e) => {
    const d = new Date(e.clock_in);
    return d >= weekStart && d <= weekEnd;
  });

  // Weekly summary: hours per person
  const weeklySummary: Record<string, { name: string; hours: number }> = {};
  for (const e of weekEntries) {
    const name = e.profiles?.full_name ?? "Unknown";
    if (!weeklySummary[e.user_id]) weeklySummary[e.user_id] = { name, hours: 0 };
    weeklySummary[e.user_id].hours += totalHours(e);
  }

  const filteredCompleted = completed.filter((e) => {
    if (!filterName) return true;
    return e.profiles?.full_name?.toLowerCase().includes(filterName.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Loading time cards…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">⏱ Hours &amp; Time Cards</h1>

      {/* ── Clock In Form ──────────────────────────────────────────────── */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h2 className="font-semibold text-lg mb-4">Clock In</h2>
        <form onSubmit={handleClockIn} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optional)
            </label>
            <input
              type="text"
              placeholder="Any notes for this shift…"
              value={entryNote}
              onChange={(e) => setEntryNote(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={clockingIn || !selectedUserId}
              className="bg-green-700 hover:bg-green-800 text-white font-semibold px-6 py-2.5 rounded-lg text-sm disabled:opacity-50 transition-colors"
            >
              {clockingIn ? "Clocking in…" : "✅ Clock In Now"}
            </button>
          </div>
        </form>
      </section>

      {/* ── Currently Clocked In ──────────────────────────────────────── */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h2 className="font-semibold text-lg mb-4">
          Currently Clocked In
          <span className="ml-2 bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded-full">
            {clockedIn.length} active
          </span>
        </h2>
        {clockedIn.length === 0 ? (
          <p className="text-sm text-gray-400">Nobody clocked in right now.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Job</th>
                  <th className="pb-2 font-medium">Clock-In</th>
                  <th className="pb-2 font-medium">Duration</th>
                  <th className="pb-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {clockedIn.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="py-2.5 font-medium">
                      {entry.profiles?.full_name ?? "—"}
                    </td>
                    <td className="py-2.5 text-gray-600">
                      {entry.job_name ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="py-2.5 text-gray-600">{formatTime(entry.clock_in)}</td>
                    <td className="py-2.5">
                      <span className="bg-amber-50 text-amber-700 text-xs font-mono px-2 py-0.5 rounded">
                        {formatDuration(entry.clock_in)}
                      </span>
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

      {/* ── Weekly Summary ────────────────────────────────────────────── */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h2 className="font-semibold text-lg mb-1">This Week</h2>
        <p className="text-xs text-gray-400 mb-4">
          {weekStart.toLocaleDateString()} – {weekEnd.toLocaleDateString()} · 1099 contractor hours
        </p>
        {Object.keys(weeklySummary).length === 0 ? (
          <p className="text-sm text-gray-400">No completed shifts this week.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.values(weeklySummary)
              .sort((a, b) => b.hours - a.hours)
              .map((row) => (
                <div
                  key={row.name}
                  className="bg-gray-50 rounded-lg p-3 border border-gray-100"
                >
                  <div className="text-sm font-medium text-gray-800">{row.name}</div>
                  <div className="text-2xl font-bold text-green-700 mt-1">
                    {row.hours.toFixed(1)}
                    <span className="text-sm font-normal text-gray-400 ml-1">hrs</span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </section>

      {/* ── Timesheet ─────────────────────────────────────────────────── */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">Timesheet</h2>
          <input
            type="text"
            placeholder="Filter by name…"
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-44"
          />
        </div>
        {filteredCompleted.length === 0 ? (
          <p className="text-sm text-gray-400">No completed shifts yet.</p>
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
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredCompleted.slice(0, 100).map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="py-2 font-medium">
                      {entry.profiles?.full_name ?? "—"}
                    </td>
                    <td className="py-2 text-gray-500 whitespace-nowrap">
                      {formatDate(entry.clock_in)}
                    </td>
                    <td className="py-2 text-gray-600">
                      {entry.job_name ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="py-2 font-mono text-xs">{formatTime(entry.clock_in)}</td>
                    <td className="py-2 font-mono text-xs">
                      {entry.clock_out ? formatTime(entry.clock_out) : "—"}
                    </td>
                    <td className="py-2">
                      <button
                        onClick={() => handleBreakUpdate(entry.id, entry.break_minutes)}
                        className="text-xs text-gray-500 hover:text-gray-800 underline"
                        title="Click to edit break minutes"
                      >
                        {entry.break_minutes}m
                      </button>
                    </td>
                    <td className="py-2 font-semibold text-green-700">
                      {totalHours(entry).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredCompleted.length > 100 && (
              <p className="text-xs text-gray-400 mt-2 text-center">
                Showing 100 of {filteredCompleted.length} entries
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
