"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase, type TimeEntry, type DailyLog } from "@/lib/supabase";

// ── Types ──────────────────────────────────────────────────────────────────

interface Delivery {
  id: string;
  delivery_date: string;
  job_name: string | null;
  vendor: string;
  items_received: string;
  status: string;
  created_at: string;
}

interface FeedItem {
  id: string;
  type: "clock_in" | "clock_out" | "note" | "delivery";
  time: string;   // ISO timestamp for sorting
  label: string;
  sublabel?: string;
  badge?: string;
  badgeColor?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDuration(clockIn: string): string {
  const totalMinutes = Math.floor((Date.now() - new Date(clockIn).getTime()) / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
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

const FEED_ICON: Record<FeedItem["type"], string> = {
  clock_in: "🟢",
  clock_out: "🔴",
  note: "📝",
  delivery: "📦",
};

// ── Page ──────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [clockedIn, setClockedIn] = useState<TimeEntry[]>([]);
  const [recentLogs, setRecentLogs] = useState<DailyLog[]>([]);
  const [recentDeliveries, setRecentDeliveries] = useState<Delivery[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [totalThisWeek, setTotalThisWeek] = useState(0);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const dayLabel = now.toLocaleDateString([], {
    weekday: "long", month: "long", day: "numeric",
  });

  const fetchData = useCallback(async () => {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const since48h = new Date(Date.now() - 48 * 3600 * 1000).toISOString();

    const [activeRes, logsRes, weekRes, recentEntriesRes, deliveriesRes] = await Promise.all([
      supabase.from("time_entries").select("*, profiles(full_name, role)").is("clock_out", null).order("clock_in"),
      supabase.from("daily_logs").select("*").order("log_date", { ascending: false }).order("created_at", { ascending: false }).limit(5),
      supabase.from("time_entries").select("clock_in, clock_out, break_minutes").not("clock_out", "is", null).gte("clock_in", weekStart.toISOString()),
      supabase.from("time_entries").select("*, profiles(full_name)").gte("created_at", since48h).order("clock_in", { ascending: false }).limit(30),
      supabase.from("deliveries").select("*").order("created_at", { ascending: false }).limit(5),
    ]);

    if (activeRes.data) setClockedIn(activeRes.data as TimeEntry[]);
    if (logsRes.data) setRecentLogs(logsRes.data);
    if (deliveriesRes.data) setRecentDeliveries(deliveriesRes.data as Delivery[]);

    if (weekRes.data) {
      const hrs = weekRes.data.reduce((sum, e) => {
        if (!e.clock_out) return sum;
        const ms = new Date(e.clock_out).getTime() - new Date(e.clock_in).getTime();
        return sum + Math.max(0, ms / 3600000 - (e.break_minutes ?? 0) / 60);
      }, 0);
      setTotalThisWeek(Math.round(hrs * 10) / 10);
    }

    // Build activity feed
    const feedItems: FeedItem[] = [];

    if (recentEntriesRes.data) {
      for (const e of recentEntriesRes.data as TimeEntry[]) {
        const name = e.profiles?.full_name ?? "Someone";
        feedItems.push({
          id: `ci-${e.id}`,
          type: "clock_in",
          time: e.clock_in,
          label: `${name} clocked in`,
          sublabel: e.job_name ?? undefined,
        });
        if (e.clock_out) {
          const ms = new Date(e.clock_out).getTime() - new Date(e.clock_in).getTime();
          const net = Math.max(0, ms / 3600000 - (e.break_minutes ?? 0) / 60);
          feedItems.push({
            id: `co-${e.id}`,
            type: "clock_out",
            time: e.clock_out,
            label: `${name} clocked out`,
            sublabel: `${net.toFixed(1)} hrs${e.job_name ? ` · ${e.job_name}` : ""}`,
          });
        }
      }
    }

    if (logsRes.data) {
      for (const log of logsRes.data) {
        feedItems.push({
          id: `note-${log.id}`,
          type: "note",
          time: log.created_at,
          label: `Field note${log.job_name ? ` — ${log.job_name}` : ""}`,
          sublabel: log.work_summary.slice(0, 80) + (log.work_summary.length > 80 ? "…" : ""),
        });
      }
    }

    if (deliveriesRes.data) {
      for (const d of deliveriesRes.data as Delivery[]) {
        feedItems.push({
          id: `del-${d.id}`,
          type: "delivery",
          time: d.created_at,
          label: `Delivery — ${d.vendor}`,
          sublabel: d.items_received.slice(0, 80),
          badge: d.status,
          badgeColor:
            d.status === "delivered" ? "bg-green-100 text-green-700"
            : d.status === "partial" ? "bg-amber-100 text-amber-700"
            : d.status === "damaged" ? "bg-red-100 text-red-700"
            : "bg-gray-100 text-gray-500",
        });
      }
    }

    feedItems.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    setFeed(feedItems.slice(0, 25));
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
          <div className="text-3xl font-bold text-gray-900">{recentDeliveries.length}</div>
          <div className="text-gray-400 text-sm mt-1">Recent deliveries</div>
        </div>
      </div>

      {/* ── Quick Actions ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-2">
        <Link href="/hours"
          className="flex flex-col items-center justify-center gap-1 bg-green-700 hover:bg-green-800 text-white rounded-xl py-3 font-semibold text-xs transition-colors shadow-sm">
          <span className="text-xl">⏱</span> Clock In
        </Link>
        <Link href="/notepad"
          className="flex flex-col items-center justify-center gap-1 bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 rounded-xl py-3 font-semibold text-xs transition-colors shadow-sm">
          <span className="text-xl">📝</span> Note
        </Link>
        <Link href="/notepad?tab=deliveries"
          className="flex flex-col items-center justify-center gap-1 bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 rounded-xl py-3 font-semibold text-xs transition-colors shadow-sm">
          <span className="text-xl">📦</span> Delivery
        </Link>
        <Link href="/tools"
          className="flex flex-col items-center justify-center gap-1 bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 rounded-xl py-3 font-semibold text-xs transition-colors shadow-sm">
          <span className="text-xl">🔧</span> Tools
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ── Currently Clocked In ──────────────────────────────────────── */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">On The Clock</h2>
            <Link href="/hours" className="text-xs text-green-700 hover:underline">Manage →</Link>
          </div>
          {clockedIn.length === 0 ? (
            <p className="text-sm text-gray-400">Nobody clocked in right now.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {clockedIn.map((entry) => (
                <li key={entry.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{entry.profiles?.full_name ?? "Unknown"}</div>
                    <div className="text-xs text-gray-400">
                      {entry.job_name ? `📍 ${entry.job_name}` : "No job assigned"} · since {formatTime(entry.clock_in)}
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
            <h2 className="font-semibold">Recent Notes</h2>
            <Link href="/notepad" className="text-xs text-green-700 hover:underline">All notes →</Link>
          </div>
          {recentLogs.length === 0 ? (
            <p className="text-sm text-gray-400">No field notes yet.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {recentLogs.map((log) => (
                <li key={log.id} className="py-2.5">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-xs font-semibold text-gray-500">{formatLogDate(log.log_date)}</span>
                    {log.job_name && <span className="bg-blue-50 text-blue-600 text-xs px-1.5 py-0.5 rounded">{log.job_name}</span>}
                    {log.weather_condition && <span className="text-xs">{WEATHER_ICON[log.weather_condition]}</span>}
                    {log.sqft_completed && <span className="bg-green-50 text-green-600 text-xs px-1.5 py-0.5 rounded">{log.sqft_completed.toLocaleString()} sqft</span>}
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2">{log.work_summary}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* ── Activity Feed ──────────────────────────────────────────────── */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h2 className="font-semibold mb-4">Activity Feed</h2>
        {feed.length === 0 ? (
          <p className="text-sm text-gray-400">No activity yet — clock in a crew member or submit a note to see it here.</p>
        ) : (
          <ol className="relative border-l border-gray-200 ml-3 space-y-0">
            {feed.map((item) => (
              <li key={item.id} className="mb-4 ml-5">
                <span className="absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full bg-white border border-gray-200 text-sm">
                  {FEED_ICON[item.type]}
                </span>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{item.label}</p>
                    {item.sublabel && <p className="text-xs text-gray-400 mt-0.5">{item.sublabel}</p>}
                    {item.badge && (
                      <span className={`mt-1 inline-block text-xs font-medium px-2 py-0.5 rounded-full ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{timeAgo(item.time)}</span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
