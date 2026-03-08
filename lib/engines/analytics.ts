/**
 * ANALYTICS ENGINE
 * Operational data analysis - labor hours, job metrics, productivity patterns.
 * Architecture is ready to support advanced queries and future dashboard widgets.
 */

import { supabase } from "@/lib/supabase";
import { calcDurationMinutes, getWeekStart } from "./time";

export interface LaborMetrics {
  total_hours: number;
  regular_hours: number;
  overtime_hours: number;
  total_entries: number;
  active_workers: number;
}

export interface JobMetrics {
  job_name: string;
  total_hours: number;
  worker_count: number;
  entry_count: number;
  last_activity: string | null;
}

export interface EmployeeProductivity {
  user_id: string;
  full_name: string;
  hours_this_week: number;
  hours_last_week: number;
  jobs_worked: number;
  avg_hours_per_day: number;
}

// ── Labor analytics ──────────────────────────────────────────────────────────

export async function getLaborMetrics(
  from: Date,
  to: Date
): Promise<LaborMetrics> {
  if (!supabase) return { total_hours: 0, regular_hours: 0, overtime_hours: 0, total_entries: 0, active_workers: 0 };

  const { data } = await supabase
    .from("time_entries")
    .select("user_id, clock_in, clock_out, break_minutes")
    .gte("clock_in", from.toISOString())
    .lte("clock_in", to.toISOString());

  if (!data) return { total_hours: 0, regular_hours: 0, overtime_hours: 0, total_entries: 0, active_workers: 0 };

  const workers = new Set(data.map((e) => e.user_id));
  let totalMins = 0;

  for (const entry of data) {
    totalMins += calcDurationMinutes(entry.clock_in, entry.clock_out ?? undefined, entry.break_minutes ?? 0);
  }

  const totalHours = totalMins / 60;
  const OT_THRESHOLD_HOURS = 40;

  return {
    total_hours: Math.round(totalHours * 10) / 10,
    regular_hours: Math.min(totalHours, OT_THRESHOLD_HOURS * workers.size),
    overtime_hours: Math.max(0, totalHours - OT_THRESHOLD_HOURS * workers.size),
    total_entries: data.length,
    active_workers: workers.size,
  };
}

// ── Job analytics ────────────────────────────────────────────────────────────

export async function getJobMetrics(from?: Date, to?: Date): Promise<JobMetrics[]> {
  if (!supabase) return [];

  let query = supabase
    .from("time_entries")
    .select("job_name, user_id, clock_in, clock_out, break_minutes")
    .not("job_name", "is", null);

  if (from) query = query.gte("clock_in", from.toISOString());
  if (to) query = query.lte("clock_in", to.toISOString());

  const { data } = await query;
  if (!data) return [];

  const byJob: Record<string, JobMetrics> = {};

  for (const entry of data) {
    const name = entry.job_name as string;
    if (!byJob[name]) {
      byJob[name] = { job_name: name, total_hours: 0, worker_count: 0, entry_count: 0, last_activity: null };
    }
    const mins = calcDurationMinutes(entry.clock_in, entry.clock_out ?? undefined, entry.break_minutes ?? 0);
    byJob[name].total_hours += mins / 60;
    byJob[name].entry_count += 1;
    if (!byJob[name].last_activity || entry.clock_in > byJob[name].last_activity!) {
      byJob[name].last_activity = entry.clock_in;
    }
  }

  // Round hours
  return Object.values(byJob)
    .map((j) => ({ ...j, total_hours: Math.round(j.total_hours * 10) / 10 }))
    .sort((a, b) => b.total_hours - a.total_hours);
}

// ── Quick summary for dashboard widget ───────────────────────────────────────

export async function getWeekSummary(): Promise<{ label: string; value: string | number }[]> {
  const weekStart = getWeekStart();
  const now = new Date();
  const metrics = await getLaborMetrics(weekStart, now);

  return [
    { label: "Total Hours This Week", value: metrics.total_hours.toFixed(1) },
    { label: "Overtime Hours", value: metrics.overtime_hours.toFixed(1) },
    { label: "Active Workers", value: metrics.active_workers },
    { label: "Time Entries", value: metrics.total_entries },
  ];
}
