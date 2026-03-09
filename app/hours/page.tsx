"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  supabase,
  type TimeEntry,
  type Profile,
  type JobSite,
} from "@/lib/supabase";

// ── localStorage keys ─────────────────────────────────────────────────────
const LS_ENTRIES = "payclock_entries";
const LS_PROFILES = "payclock_profiles";
const LS_COUNTER = "payclock_counter";

// ── Extended TimeEntry with extra fields ──────────────────────────────────
interface ExtendedTimeEntry extends TimeEntry {
  pay_rate?: number | null;
  work_type?: string | null;
  travel_time?: number | null;
  location_note?: string | null;
  weather?: string | null;
  equipment_used?: string | null;
  sqft_completed?: number | null;
  materials_used?: string | null;
  supervisor_approved?: boolean;
}

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

function totalHours(entry: ExtendedTimeEntry): number {
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

function calcGrossPay(entry: ExtendedTimeEntry): number | null {
  if (!entry.pay_rate || !entry.clock_out) return null;
  return Math.round(totalHours(entry) * entry.pay_rate * 100) / 100;
}

// ── localStorage helpers ──────────────────────────────────────────────────

function loadLocalEntries(): ExtendedTimeEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_ENTRIES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalEntries(entries: ExtendedTimeEntry[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_ENTRIES, JSON.stringify(entries));
}

function loadLocalProfiles(): Profile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_PROFILES);
    if (raw) return JSON.parse(raw);
  } catch {
    // fall through
  }
  const defaults: Profile[] = [
    { id: "crew-1", full_name: "Alex Rivera", role: "Lead Installer", is_active: true, created_at: new Date().toISOString() },
    { id: "crew-2", full_name: "Sam Brooks", role: "Installer", is_active: true, created_at: new Date().toISOString() },
    { id: "crew-3", full_name: "Jordan Lee", role: "Laborer", is_active: true, created_at: new Date().toISOString() },
  ];
  localStorage.setItem(LS_PROFILES, JSON.stringify(defaults));
  return defaults;
}

function saveLocalProfiles(profiles: Profile[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_PROFILES, JSON.stringify(profiles));
}

function nextLocalId(): string {
  if (typeof window === "undefined") return `entry-${Date.now()}`;
  const counter = parseInt(localStorage.getItem(LS_COUNTER) || "0", 10) + 1;
  localStorage.setItem(LS_COUNTER, String(counter));
  return `entry-${counter}-${Date.now()}`;
}

// ── Work Type Options ──────────────────────────────────────────────────────
const WORK_TYPES = [
  "Installation",
  "Removal",
  "Repair",
  "Site Prep",
  "Grading",
  "Base Work",
  "Seaming",
  "Infill",
  "Landscaping",
  "Cleanup",
  "Delivery",
  "Training",
  "Office/Admin",
  "Other",
];

const WEATHER_OPTIONS = [
  "Clear/Sunny",
  "Partly Cloudy",
  "Overcast",
  "Light Rain",
  "Heavy Rain",
  "Hot (90+)",
  "Cold (<40)",
  "Windy",
  "Snow/Ice",
];

// ── Page ──────────────────────────────────────────────────────────────────

export default function PayClockPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [entries, setEntries] = useState<ExtendedTimeEntry[]>([]);
  const [jobSites, setJobSites] = useState<JobSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [clockingIn, setClockingIn] = useState(false);
  const [tick, setTick] = useState(0);

  // Clock-in form state
  const [selectedUserId, setSelectedUserId] = useState("");
  const [jobName, setJobName] = useState("");
  const [entryNote, setEntryNote] = useState("");
  const [payRate, setPayRate] = useState("");
  const [workType, setWorkType] = useState("");
  const [travelTime, setTravelTime] = useState("");
  const [locationNote, setLocationNote] = useState("");
  const [weather, setWeather] = useState("");
  const [equipmentUsed, setEquipmentUsed] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Add crew member form
  const [showAddCrew, setShowAddCrew] = useState(false);
  const [newCrewName, setNewCrewName] = useState("");
  const [newCrewRole, setNewCrewRole] = useState("Installer");

  // Filters
  const [filterName, setFilterName] = useState("");
  const [filterJob, setFilterJob] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterWorkType, setFilterWorkType] = useState("");

  // View mode
  const [viewMode, setViewMode] = useState<"active" | "weekly" | "timesheet">("active");

  // Clock-out extras
  const [clockOutSqft, setClockOutSqft] = useState("");
  const [clockOutMaterials, setClockOutMaterials] = useState("");
  const [showClockOutExtras, setShowClockOutExtras] = useState<string | null>(null);

  const isLocal = !supabase;
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Live duration ticker ────────────────────────────────────────────
  useEffect(() => {
    tickRef.current = setInterval(() => setTick((t) => t + 1), 15000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  // ── Data fetching ───────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (isLocal) {
      setProfiles(loadLocalProfiles());
      setEntries(loadLocalEntries());
      setJobSites([]);
      setLoading(false);
      return;
    }
    const [profilesRes, entriesRes, sitesRes] = await Promise.all([
      supabase!
        .from("profiles")
        .select("*")
        .eq("is_active", true)
        .order("full_name"),
      supabase!
        .from("time_entries")
        .select("*, profiles(full_name, role)")
        .order("clock_in", { ascending: false })
        .limit(500),
      supabase!
        .from("job_sites")
        .select("*")
        .eq("status", "active")
        .order("name"),
    ]);
    if (profilesRes.data) setProfiles(profilesRes.data);
    if (entriesRes.data) setEntries(entriesRes.data as ExtendedTimeEntry[]);
    if (sitesRes.data) setJobSites(sitesRes.data);
    setLoading(false);
  }, [isLocal]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ── Clock In ────────────────────────────────────────────────────────

  async function handleClockIn(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUserId) return;
    setClockingIn(true);

    const parsedRate = payRate ? parseFloat(payRate) : null;
    const parsedTravel = travelTime ? parseInt(travelTime, 10) : null;

    if (isLocal) {
      const profile = profiles.find((p) => p.id === selectedUserId);
      const newEntry: ExtendedTimeEntry = {
        id: nextLocalId(),
        user_id: selectedUserId,
        job_name: jobName || null,
        clock_in: new Date().toISOString(),
        clock_out: null,
        break_minutes: 0,
        notes: entryNote || null,
        created_at: new Date().toISOString(),
        profiles: profile,
        pay_rate: parsedRate,
        work_type: workType || null,
        travel_time: parsedTravel,
        location_note: locationNote || null,
        weather: weather || null,
        equipment_used: equipmentUsed || null,
        sqft_completed: null,
        materials_used: null,
        supervisor_approved: false,
      };
      const updated = [newEntry, ...entries];
      setEntries(updated);
      saveLocalEntries(updated);
    } else {
      await supabase!.from("time_entries").insert({
        user_id: selectedUserId,
        job_name: jobName || null,
        notes: entryNote || null,
        clock_in: new Date().toISOString(),
      });
      const profile = profiles.find((p) => p.id === selectedUserId);
      await supabase!.from("naf_entries").insert({
        entry_type: "clock_in",
        body: `${profile?.full_name || "Crew member"} clocked in${jobName ? ` at ${jobName}` : ""}${workType ? ` (${workType})` : ""}${entryNote ? ` — ${entryNote}` : ""}`,
        job_name: jobName || null,
        user_id: selectedUserId,
      });
      await fetchData();
    }

    setJobName("");
    setEntryNote("");
    setPayRate("");
    setWorkType("");
    setTravelTime("");
    setLocationNote("");
    setWeather("");
    setEquipmentUsed("");
    setSelectedUserId("");
    setShowAdvanced(false);
    setClockingIn(false);
  }

  // ── Clock Out ───────────────────────────────────────────────────────

  async function handleClockOut(entryId: string) {
    const sqft = clockOutSqft ? parseFloat(clockOutSqft) : null;
    const mats = clockOutMaterials || null;

    if (isLocal) {
      const updated = entries.map((e) =>
        e.id === entryId
          ? {
              ...e,
              clock_out: new Date().toISOString(),
              sqft_completed: sqft,
              materials_used: mats,
            }
          : e
      );
      setEntries(updated);
      saveLocalEntries(updated);
    } else {
      const entry = entries.find((e) => e.id === entryId);
      await supabase!
        .from("time_entries")
        .update({ clock_out: new Date().toISOString() })
        .eq("id", entryId);
      if (entry) {
        const profile = profiles.find((p) => p.id === entry.user_id);
        const ms = Date.now() - new Date(entry.clock_in).getTime();
        const hrs = Math.floor(ms / 3600000);
        const mins = Math.floor((ms % 3600000) / 60000);
        await supabase!.from("naf_entries").insert({
          entry_type: "clock_out",
          body: `${profile?.full_name || "Crew member"} clocked out — ${hrs}h ${mins}m${entry.job_name ? ` from ${entry.job_name}` : ""}`,
          job_name: entry.job_name || null,
          user_id: entry.user_id,
        });
      }
      await fetchData();
    }
    setShowClockOutExtras(null);
    setClockOutSqft("");
    setClockOutMaterials("");
  }

  // ── Break Update ────────────────────────────────────────────────────

  async function handleBreakUpdate(entryId: string, currentBreak: number) {
    const input = window.prompt("Break minutes for this shift:", String(currentBreak));
    if (input === null) return;
    const mins = parseInt(input, 10);
    if (isNaN(mins) || mins < 0) return;

    if (isLocal) {
      const updated = entries.map((e) =>
        e.id === entryId ? { ...e, break_minutes: mins } : e
      );
      setEntries(updated);
      saveLocalEntries(updated);
    } else {
      await supabase!.from("time_entries").update({ break_minutes: mins }).eq("id", entryId);
      await fetchData();
    }
  }

  // ── Delete Entry ────────────────────────────────────────────────────

  async function handleDeleteEntry(entryId: string) {
    const confirmed = window.confirm("Delete this time entry?");
    if (!confirmed) return;

    if (isLocal) {
      const updated = entries.filter((e) => e.id !== entryId);
      setEntries(updated);
      saveLocalEntries(updated);
    } else {
      await supabase!.from("time_entries").delete().eq("id", entryId);
      await fetchData();
    }
  }

  // ── Edit Notes ──────────────────────────────────────────────────────

  async function handleEditNotes(entryId: string, currentNotes: string | null) {
    const input = window.prompt("Notes for this shift:", currentNotes || "");
    if (input === null) return;

    if (isLocal) {
      const updated = entries.map((e) =>
        e.id === entryId ? { ...e, notes: input.trim() || null } : e
      );
      setEntries(updated);
      saveLocalEntries(updated);
    } else {
      await supabase!.from("time_entries").update({ notes: input.trim() || null }).eq("id", entryId);
      await fetchData();
    }
  }

  // ── Edit Pay Rate ───────────────────────────────────────────────────

  function handleEditPayRate(entryId: string, currentRate: number | null | undefined) {
    const input = window.prompt("Hourly pay rate ($):", String(currentRate || ""));
    if (input === null) return;
    const rate = parseFloat(input);
    if (isNaN(rate) || rate < 0) return;

    const updated = entries.map((e) =>
      e.id === entryId ? { ...e, pay_rate: rate || null } : e
    );
    setEntries(updated);
    if (isLocal) saveLocalEntries(updated);
  }

  // ── Approve Entry ───────────────────────────────────────────────────

  function handleToggleApproval(entryId: string) {
    const updated = entries.map((e) =>
      e.id === entryId ? { ...e, supervisor_approved: !e.supervisor_approved } : e
    );
    setEntries(updated);
    if (isLocal) saveLocalEntries(updated);
  }

  // ── Add Crew Member ─────────────────────────────────────────────────

  function handleAddCrew(e: React.FormEvent) {
    e.preventDefault();
    if (!newCrewName.trim()) return;
    const newProfile: Profile = {
      id: `crew-${Date.now()}`,
      full_name: newCrewName.trim(),
      role: newCrewRole,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    const updated = [...profiles, newProfile];
    setProfiles(updated);
    saveLocalProfiles(updated);
    setNewCrewName("");
    setNewCrewRole("Installer");
    setShowAddCrew(false);
  }

  // ── Derived state ───────────────────────────────────────────────────

  void tick;

  const clockedIn = entries.filter((e) => !e.clock_out);
  const completed = entries.filter((e) => !!e.clock_out);

  const { start: weekStart, end: weekEnd } = weekBounds();
  const weekEntries = completed.filter((e) => {
    const d = new Date(e.clock_in);
    return d >= weekStart && d <= weekEnd;
  });

  // Weekly summary
  const weeklySummary: Record<string, {
    name: string; role: string; hours: number; shifts: number;
    overtimeHrs: number; totalPay: number; totalSqft: number;
    workTypes: Set<string>;
  }> = {};

  for (const e of weekEntries) {
    const name = e.profiles?.full_name ?? "Unknown";
    const role = (e.profiles as { role?: string })?.role ?? "";
    if (!weeklySummary[e.user_id])
      weeklySummary[e.user_id] = {
        name, role, hours: 0, shifts: 0, overtimeHrs: 0,
        totalPay: 0, totalSqft: 0, workTypes: new Set(),
      };
    const hrs = totalHours(e);
    weeklySummary[e.user_id].hours += hrs;
    weeklySummary[e.user_id].shifts += 1;
    const pay = calcGrossPay(e);
    if (pay) weeklySummary[e.user_id].totalPay += pay;
    if (e.sqft_completed) weeklySummary[e.user_id].totalSqft += e.sqft_completed;
    if (e.work_type) weeklySummary[e.user_id].workTypes.add(e.work_type);
  }

  for (const key of Object.keys(weeklySummary)) {
    const s = weeklySummary[key];
    if (s.hours > 40) s.overtimeHrs = s.hours - 40;
  }

  const totalWeekHours = Object.values(weeklySummary).reduce((sum, s) => sum + s.hours, 0);
  const totalWeekPay = Object.values(weeklySummary).reduce((sum, s) => sum + s.totalPay, 0);

  // Today's stats
  const todayStr = new Date().toISOString().split("T")[0];
  const todayEntries = completed.filter((e) => e.clock_in.split("T")[0] === todayStr);
  const todayHours = todayEntries.reduce((sum, e) => sum + totalHours(e), 0);
  const todayPay = todayEntries.reduce((sum, e) => sum + (calcGrossPay(e) || 0), 0);

  // Filtered timesheet
  const filteredCompleted = completed.filter((e) => {
    if (filterName && !e.profiles?.full_name?.toLowerCase().includes(filterName.toLowerCase()))
      return false;
    if (filterJob) {
      const job = e.job_name || "";
      if (!job.toLowerCase().includes(filterJob.toLowerCase())) return false;
    }
    if (filterWorkType && e.work_type !== filterWorkType) return false;
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
        Loading Pay Clock...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          ⏱ Pay Clock
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

      {/* ── Today's Stats Strip ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-green-700 text-white rounded-xl p-3 text-center shadow-sm">
          <div className="text-2xl font-bold">{clockedIn.length}</div>
          <div className="text-xs opacity-80">On Clock Now</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3 text-center shadow-sm">
          <div className="text-2xl font-bold text-gray-900">{todayHours.toFixed(1)}</div>
          <div className="text-xs text-gray-500">Today&apos;s Hours</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3 text-center shadow-sm">
          <div className="text-2xl font-bold text-gray-900">{totalWeekHours.toFixed(1)}</div>
          <div className="text-xs text-gray-500">Week Hours</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3 text-center shadow-sm">
          <div className="text-2xl font-bold text-gray-900">{todayEntries.length + clockedIn.length}</div>
          <div className="text-xs text-gray-500">Today&apos;s Shifts</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3 text-center shadow-sm">
          <div className="text-2xl font-bold text-green-700">
            {todayPay > 0 ? `$${todayPay.toFixed(0)}` : "—"}
          </div>
          <div className="text-xs text-gray-500">Today&apos;s Pay Est.</div>
        </div>
      </div>

      {/* ── Clock In Form ──────────────────────────────────────────────── */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">Clock In</h2>
          <div className="flex gap-2">
            {isLocal && (
              <button
                onClick={() => setShowAddCrew(!showAddCrew)}
                className="text-xs text-green-700 hover:text-green-800 font-medium"
              >
                {showAddCrew ? "Cancel" : "+ Add Crew Member"}
              </button>
            )}
          </div>
        </div>

        {/* Add crew member form (local mode) */}
        {showAddCrew && isLocal && (
          <form onSubmit={handleAddCrew} className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-green-800 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newCrewName}
                  onChange={(e) => setNewCrewName(e.target.value)}
                  placeholder="e.g. John Smith"
                  className="w-full border border-green-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-green-800 mb-1">Role</label>
                <select
                  value={newCrewRole}
                  onChange={(e) => setNewCrewRole(e.target.value)}
                  className="w-full border border-green-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="Lead Installer">Lead Installer</option>
                  <option value="Installer">Installer</option>
                  <option value="Laborer">Laborer</option>
                  <option value="Foreman">Foreman</option>
                  <option value="Owner">Owner</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full bg-green-700 hover:bg-green-800 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  Add to Crew
                </button>
              </div>
            </div>
          </form>
        )}

        <form onSubmit={handleClockIn} className="space-y-4">
          {/* Primary fields row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                Work Type
              </label>
              <select
                value={workType}
                onChange={(e) => setWorkType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">— Select type —</option>
                {WORK_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
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
          </div>

          {/* Advanced toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            {showAdvanced ? "▼ Hide Details" : "▶ More Details (pay rate, weather, equipment...)"}
          </button>

          {/* Advanced fields */}
          {showAdvanced && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div>
                <label className="block text-xs font-medium text-blue-800 mb-1">
                  Pay Rate ($/hr)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 25.00"
                  value={payRate}
                  onChange={(e) => setPayRate(e.target.value)}
                  className="w-full border border-blue-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-blue-800 mb-1">
                  Travel Time (min)
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 30"
                  value={travelTime}
                  onChange={(e) => setTravelTime(e.target.value)}
                  className="w-full border border-blue-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-blue-800 mb-1">
                  Weather
                </label>
                <select
                  value={weather}
                  onChange={(e) => setWeather(e.target.value)}
                  className="w-full border border-blue-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— Select —</option>
                  {WEATHER_OPTIONS.map((w) => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-blue-800 mb-1">
                  Equipment Used
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bobcat, Roller"
                  value={equipmentUsed}
                  onChange={(e) => setEquipmentUsed(e.target.value)}
                  className="w-full border border-blue-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-4">
                <label className="block text-xs font-medium text-blue-800 mb-1">
                  Location / Address Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. 123 Main St, rear yard access"
                  value={locationNote}
                  onChange={(e) => setLocationNote(e.target.value)}
                  className="w-full border border-blue-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Submit button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={clockingIn || !selectedUserId}
              className="bg-green-700 hover:bg-green-800 text-white font-semibold px-8 py-2.5 rounded-lg text-sm disabled:opacity-50 transition-colors"
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
              Nobody clocked in right now. Use the form above to clock someone in.
            </p>
          ) : (
            <div className="space-y-3">
              {clockedIn.map((entry) => (
                <div key={entry.id} className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-900">
                        {entry.profiles?.full_name ?? "—"}
                      </span>
                      <span className="text-xs text-gray-400">
                        {(entry.profiles as { role?: string })?.role ?? ""}
                      </span>
                      {entry.work_type && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          {entry.work_type}
                        </span>
                      )}
                    </div>
                    <span className="bg-amber-50 text-amber-700 text-xs font-mono px-2 py-0.5 rounded animate-pulse">
                      {formatDuration(entry.clock_in)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-2">
                    <span>In: {formatTime(entry.clock_in)}</span>
                    {entry.job_name && <span>Job: {entry.job_name}</span>}
                    {entry.pay_rate && <span>Rate: ${entry.pay_rate}/hr</span>}
                    {entry.weather && <span>Weather: {entry.weather}</span>}
                    {entry.travel_time && <span>Travel: {entry.travel_time}min</span>}
                    {entry.equipment_used && <span>Equip: {entry.equipment_used}</span>}
                    {entry.location_note && <span>Loc: {entry.location_note}</span>}
                    {entry.notes && <span>Notes: {entry.notes}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {showClockOutExtras === entry.id ? (
                      <div className="flex items-center gap-2 flex-wrap flex-1">
                        <input
                          type="number"
                          step="0.1"
                          placeholder="Sqft done"
                          value={clockOutSqft}
                          onChange={(e) => setClockOutSqft(e.target.value)}
                          className="border border-gray-300 rounded-lg px-2 py-1 text-xs w-24 focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                        <input
                          type="text"
                          placeholder="Materials used"
                          value={clockOutMaterials}
                          onChange={(e) => setClockOutMaterials(e.target.value)}
                          className="border border-gray-300 rounded-lg px-2 py-1 text-xs w-40 focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                        <button
                          onClick={() => handleClockOut(entry.id)}
                          className="bg-red-600 hover:bg-red-700 text-white text-xs font-medium px-3 py-1 rounded-md transition-colors"
                        >
                          Confirm Clock Out
                        </button>
                        <button
                          onClick={() => setShowClockOutExtras(null)}
                          className="text-xs text-gray-400 hover:text-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowClockOutExtras(entry.id)}
                        className="bg-red-600 hover:bg-red-700 text-white text-xs font-medium px-3 py-1 rounded-md transition-colors"
                      >
                        Clock Out
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Weekly Summary ────────────────────────────────────────────── */}
      {(viewMode === "active" || viewMode === "weekly") && (
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-semibold text-lg">This Week</h2>
            <div className="flex gap-3">
              <span className="text-sm font-bold text-green-700">
                {totalWeekHours.toFixed(1)} hrs
              </span>
              {totalWeekPay > 0 && (
                <span className="text-sm font-bold text-blue-700">
                  ${totalWeekPay.toFixed(0)} est. pay
                </span>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            {weekStart.toLocaleDateString()} – {weekEnd.toLocaleDateString()}
          </p>
          {Object.keys(weeklySummary).length === 0 ? (
            <p className="text-sm text-gray-400">No completed shifts this week yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.values(weeklySummary)
                .sort((a, b) => b.hours - a.hours)
                .map((row) => (
                  <div
                    key={row.name}
                    className="bg-gray-50 rounded-lg p-3 border border-gray-100"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-gray-800">{row.name}</div>
                      <span className="text-xs text-gray-400">{row.role}</span>
                    </div>
                    <div className="text-2xl font-bold text-green-700 mt-1">
                      {row.hours.toFixed(1)}
                      <span className="text-sm font-normal text-gray-400 ml-1">hrs</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">{row.shifts} shifts</span>
                      {row.overtimeHrs > 0 && (
                        <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">
                          {row.overtimeHrs.toFixed(1)}h OT
                        </span>
                      )}
                      {row.totalPay > 0 && (
                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
                          ${row.totalPay.toFixed(0)}
                        </span>
                      )}
                      {row.totalSqft > 0 && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                          {row.totalSqft.toFixed(0)} sqft
                        </span>
                      )}
                    </div>
                    {row.workTypes.size > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {Array.from(row.workTypes).map((wt) => (
                          <span key={wt} className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                            {wt}
                          </span>
                        ))}
                      </div>
                    )}
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
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-32"
              />
              <input
                type="text"
                placeholder="Filter by job..."
                value={filterJob}
                onChange={(e) => setFilterJob(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-32"
              />
              <select
                value={filterWorkType}
                onChange={(e) => setFilterWorkType(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500 w-32"
              >
                <option value="">All Types</option>
                {WORK_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
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
              {(filterName || filterJob || filterDateFrom || filterDateTo || filterWorkType) && (
                <button
                  onClick={() => {
                    setFilterName("");
                    setFilterJob("");
                    setFilterDateFrom("");
                    setFilterDateTo("");
                    setFilterWorkType("");
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
                    <th className="pb-2 font-medium">Type</th>
                    <th className="pb-2 font-medium">In</th>
                    <th className="pb-2 font-medium">Out</th>
                    <th className="pb-2 font-medium">Break</th>
                    <th className="pb-2 font-medium">Net Hrs</th>
                    <th className="pb-2 font-medium">Rate</th>
                    <th className="pb-2 font-medium">Pay</th>
                    <th className="pb-2 font-medium">Sqft</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredCompleted.slice(0, 200).map((entry) => {
                    const gross = calcGrossPay(entry);
                    return (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="py-2 font-medium">{entry.profiles?.full_name ?? "—"}</td>
                        <td className="py-2 text-gray-500 whitespace-nowrap text-xs">{formatDate(entry.clock_in)}</td>
                        <td className="py-2 text-gray-600 text-xs">
                          {entry.job_name ?? <span className="text-gray-300">—</span>}
                        </td>
                        <td className="py-2">
                          {entry.work_type ? (
                            <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                              {entry.work_type}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
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
                        <td className="py-2 font-semibold text-green-700">{totalHours(entry).toFixed(2)}</td>
                        <td className="py-2 text-xs">
                          <button
                            onClick={() => handleEditPayRate(entry.id, entry.pay_rate)}
                            className="text-gray-500 hover:text-gray-800 underline"
                          >
                            {entry.pay_rate ? `$${entry.pay_rate}` : "Set"}
                          </button>
                        </td>
                        <td className="py-2 text-xs font-medium text-blue-700">
                          {gross ? `$${gross.toFixed(2)}` : "—"}
                        </td>
                        <td className="py-2 text-xs text-gray-500">
                          {entry.sqft_completed ? `${entry.sqft_completed} sqft` : "—"}
                        </td>
                        <td className="py-2">
                          <button
                            onClick={() => handleToggleApproval(entry.id)}
                            className={`text-xs px-2 py-0.5 rounded font-medium ${
                              entry.supervisor_approved
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                            }`}
                            title={entry.supervisor_approved ? "Approved" : "Click to approve"}
                          >
                            {entry.supervisor_approved ? "✓ OK" : "Pending"}
                          </button>
                        </td>
                        <td className="py-2">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleEditNotes(entry.id, entry.notes)}
                              className="text-xs text-blue-500 hover:text-blue-700"
                              title={entry.notes || "Add note"}
                            >
                              📝
                            </button>
                            <button
                              onClick={() => handleDeleteEntry(entry.id)}
                              className="text-xs text-red-500 hover:text-red-700"
                              title="Delete entry"
                            >
                              ×
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredCompleted.length > 200 && (
                <p className="text-xs text-gray-400 mt-2 text-center">
                  Showing 200 of {filteredCompleted.length} entries
                </p>
              )}
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs text-gray-400">{filteredCompleted.length} entries</span>
                <div className="flex gap-4">
                  <span className="text-sm font-semibold text-green-700">
                    Total: {filteredCompleted.reduce((sum, e) => sum + totalHours(e), 0).toFixed(1)} hrs
                  </span>
                  {filteredCompleted.some((e) => e.pay_rate) && (
                    <span className="text-sm font-semibold text-blue-700">
                      Pay: ${filteredCompleted.reduce((sum, e) => sum + (calcGrossPay(e) || 0), 0).toFixed(2)}
                    </span>
                  )}
                  {filteredCompleted.some((e) => e.sqft_completed) && (
                    <span className="text-sm font-semibold text-purple-700">
                      Sqft: {filteredCompleted.reduce((sum, e) => sum + (e.sqft_completed || 0), 0).toFixed(0)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── Local Mode Indicator ──────────────────────────────────────── */}
      {isLocal && (
        <div className="text-center py-2">
          <p className="text-xs text-gray-400">
            Pay Clock is running locally — all data is saved to this device. Connect Supabase for cloud sync.
          </p>
        </div>
      )}
    </div>
  );
}
