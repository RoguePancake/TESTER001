"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase, type TimeEntry, type DailyLog } from "@/lib/supabase";

function formatDuration(clockIn: string): string {
  const totalMinutes = Math.floor((Date.now() - new Date(clockIn).getTime()) / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatLogDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

const WEATHER_ICON: Record<string, string> = {
  Sunny: "☀️", Cloudy: "⛅", Rainy: "🌧️",
  Windy: "💨", Hot: "🌡️", Overcast: "🌥️",
};

export default function DashboardPage() {
  const [clockedIn, setClockedIn] = useState<TimeEntry[]>([]);
  const [recentLogs, setRecentLogs] = useState<DailyLog[]>([]);
  const [totalThisWeek, setTotalThisWeek] = useState(0);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const dayLabel = now.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const fetchData = useCallback(async () => {
    // Week bounds
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const [activeRes, logsRes, weekRes] = await Promise.all([
      // Currently clocked in (no clock_out)
      supabase
        .from("time_entries")
        .select("*, profiles(full_name, role)")
        .is("clock_out", null)
        .order("clock_in"),
      // Last 5 daily notes
      supabase
        .from("daily_logs")
        .select("*")
        .order("log_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5),
      // Completed shifts this week for total-hours calc
      supabase
        .from("time_entries")
        .select("clock_in, clock_out, break_minutes")
        .not("clock_out", "is", null)
        .gte("clock_in", weekStart.toISOString()),
    ]);

    if (activeRes.data) setClockedIn(activeRes.data as TimeEntry[]);
    if (logsRes.data) setRecentLogs(logsRes.data);
    if (weekRes.data) {
      const hrs = weekRes.data.reduce((sum, e) => {
        if (!e.clock_out) return sum;
        const ms = new Date(e.clock_out).getTime() - new Date(e.clock_in).getTime();
        return sum + Math.max(0, ms / 3600000 - (e.break_minutes ?? 0) / 60);
      }, 0);
      setTotalThisWeek(Math.round(hrs * 10) / 10);
    }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Loading dashboard…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{dayLabel}</h1>
        <p className="text-gray-500 mt-1 text-sm">Field Operations Command Center</p>
      </div>

      {/* ── Stat cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-green-700 text-white rounded-xl p-4 shadow-sm">
          <div className="text-3xl font-bold">{clockedIn.length}</div>
          <div className="text-green-100 text-sm mt-1">On the clock now</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="text-3xl font-bold text-gray-900">{totalThisWeek}</div>
          <div className="text-gray-400 text-sm mt-1">Crew-hours this week</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm col-span-2 sm:col-span-1">
          <div className="text-3xl font-bold text-gray-900">{recentLogs.length > 0 ? recentLogs[0].log_date.split("-")[2] : "—"}</div>
          <div className="text-gray-400 text-sm mt-1">
            {recentLogs.length > 0
              ? `Last note: ${formatLogDate(recentLogs[0].log_date)}`
              : "No notes yet"}
          </div>
        </div>
      </div>

      {/* ── Quick Actions ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <Link
          href="/hours"
          className="flex flex-col items-center justify-center gap-1 bg-green-700 hover:bg-green-800 text-white rounded-xl py-4 font-semibold text-sm transition-colors shadow-sm"
        >
          <span className="text-2xl">⏱</span>
          Clock In
        </Link>
        <Link
          href="/notepad"
          className="flex flex-col items-center justify-center gap-1 bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 rounded-xl py-4 font-semibold text-sm transition-colors shadow-sm"
        >
          <span className="text-2xl">📋</span>
          New Note
        </Link>
        <Link
          href="/hours"
          className="flex flex-col items-center justify-center gap-1 bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 rounded-xl py-4 font-semibold text-sm transition-colors shadow-sm"
        >
          <span className="text-2xl">📊</span>
          Timesheet
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ── Currently Clocked In ──────────────────────────────────────── */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">On The Clock</h2>
            <Link href="/hours" className="text-xs text-green-700 hover:underline">
              Manage →
            </Link>
          </div>
          {clockedIn.length === 0 ? (
            <p className="text-sm text-gray-400">Nobody clocked in right now.</p>
          ) : (
            <ul className="divide-y divide-gray-50 space-y-0">
              {clockedIn.map((entry) => (
                <li key={entry.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">
                      {entry.profiles?.full_name ?? "Unknown"}
                    </div>
                    <div className="text-xs text-gray-400">
                      {entry.job_name
                        ? `📍 ${entry.job_name}`
                        : "No job assigned"}{" "}
                      · since {formatTime(entry.clock_in)}
                    </div>
                  </div>
                  <span className="bg-amber-50 text-amber-700 text-xs font-mono px-2 py-0.5 rounded shrink-0">
                    {formatDuration(entry.clock_in)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Recent Field Notes ─────────────────────────────────────────── */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Recent Field Notes</h2>
            <Link href="/notepad" className="text-xs text-green-700 hover:underline">
              All notes →
            </Link>
          </div>
          {recentLogs.length === 0 ? (
            <p className="text-sm text-gray-400">No field notes yet.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {recentLogs.map((log) => (
                <li key={log.id} className="py-2.5">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-xs font-semibold text-gray-500">
                      {formatLogDate(log.log_date)}
                    </span>
                    {log.job_name && (
                      <span className="bg-blue-50 text-blue-600 text-xs px-1.5 py-0.5 rounded">
                        {log.job_name}
                      </span>
                    )}
                    {log.weather_condition && (
                      <span className="text-xs text-gray-400">
                        {WEATHER_ICON[log.weather_condition]}
                      </span>
                    )}
                    {log.sqft_completed && (
                      <span className="bg-green-50 text-green-600 text-xs px-1.5 py-0.5 rounded">
                        {log.sqft_completed.toLocaleString()} sqft
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2">
                    {log.work_summary}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
