/**
 * TIME ENGINE
 * Labor tracking utilities - clock-in/out, break management,
 * hour calculations, weekly summaries.
 */

import { supabase } from "@/lib/supabase";

export interface TimeEntryInput {
  user_id: string;
  job_name?: string;
  notes?: string;
}

export interface BreakPeriod {
  start: string;
  end?: string;
}

export interface HourSummary {
  user_id: string;
  full_name: string;
  total_minutes: number;
  regular_minutes: number;
  overtime_minutes: number;
  entries: number;
}

// ── Clock operations ─────────────────────────────────────────────────────────

export async function clockIn(input: TimeEntryInput) {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase
    .from("time_entries")
    .insert({
      user_id: input.user_id,
      job_name: input.job_name ?? null,
      notes: input.notes ?? null,
      clock_in: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function clockOut(entryId: string, breakMinutes = 0) {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase
    .from("time_entries")
    .update({
      clock_out: new Date().toISOString(),
      break_minutes: breakMinutes,
    })
    .eq("id", entryId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getActiveEntries(companyId?: string) {
  if (!supabase) return [];
  let query = supabase
    .from("time_entries")
    .select("*, profiles(full_name, role)")
    .is("clock_out", null)
    .order("clock_in", { ascending: false });

  const { data } = await query;
  return data ?? [];
}

// ── Duration helpers ─────────────────────────────────────────────────────────

export function calcDurationMinutes(clockIn: string, clockOut?: string, breakMins = 0): number {
  const start = new Date(clockIn).getTime();
  const end = clockOut ? new Date(clockOut).getTime() : Date.now();
  const rawMins = Math.floor((end - start) / 60000);
  return Math.max(0, rawMins - breakMins);
}

export function formatDuration(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

// ── Weekly summary ────────────────────────────────────────────────────────────

export async function getWeeklySummary(
  weekStart: Date,
  overtimeThreshold = 2400 // 40 hours in minutes
): Promise<HourSummary[]> {
  if (!supabase) return [];

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const { data } = await supabase
    .from("time_entries")
    .select("*, profiles(id, full_name)")
    .gte("clock_in", weekStart.toISOString())
    .lt("clock_in", weekEnd.toISOString());

  if (!data) return [];

  const byUser: Record<string, HourSummary> = {};

  for (const entry of data) {
    const uid = entry.user_id;
    const name = (entry.profiles as { full_name: string } | null)?.full_name ?? "Unknown";
    if (!byUser[uid]) {
      byUser[uid] = { user_id: uid, full_name: name, total_minutes: 0, regular_minutes: 0, overtime_minutes: 0, entries: 0 };
    }
    const mins = calcDurationMinutes(entry.clock_in, entry.clock_out ?? undefined, entry.break_minutes ?? 0);
    byUser[uid].total_minutes += mins;
    byUser[uid].entries += 1;
  }

  for (const summary of Object.values(byUser)) {
    summary.regular_minutes = Math.min(summary.total_minutes, overtimeThreshold);
    summary.overtime_minutes = Math.max(0, summary.total_minutes - overtimeThreshold);
  }

  return Object.values(byUser).sort((a, b) => b.total_minutes - a.total_minutes);
}

/** Get the start of the current week (Monday by default) */
export function getWeekStart(date = new Date(), startDay: 0 | 1 = 1): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day < startDay ? 7 : 0) + day - startDay;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
