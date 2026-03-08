/**
 * AUTOMATION ENGINE
 * Workflow automation hooks - reminders, auto-reports, status updates.
 * Architecture designed for future cron-job and event-driven triggers.
 */

import { supabase } from "@/lib/supabase";
import { notifyMissingClockOut, notifyTimeReminder } from "./notification";

export type TriggerEvent =
  | "end_of_day"
  | "start_of_day"
  | "job_status_change"
  | "employee_clocked_in"
  | "employee_clocked_out"
  | "missing_clock_out"
  | "weekly_summary_ready";

export interface AutomationRule {
  id: string;
  company_id: string | null;
  name: string;
  trigger: TriggerEvent;
  action: string;
  config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}

// ── Built-in automation checks (call these from scheduled tasks / API routes) ─

/**
 * Check for employees who are still clocked in past end-of-day.
 * Send them a missing clock-out notification.
 */
export async function runMissingClockOutCheck(): Promise<void> {
  if (!supabase) return;

  const { data } = await supabase
    .from("time_entries")
    .select("id, user_id, clock_in")
    .is("clock_out", null);

  if (!data) return;

  const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000);

  for (const entry of data) {
    const clockInTime = new Date(entry.clock_in);
    if (clockInTime < eightHoursAgo) {
      await notifyMissingClockOut(entry.user_id);
    }
  }
}

/**
 * Send daily time entry reminders to active employees.
 */
export async function runDailyTimeReminder(companyId?: string): Promise<void> {
  if (!supabase) return;

  let query = supabase.from("profiles").select("id").eq("is_active", true);
  if (companyId) query = query.eq("company_id", companyId);
  const { data } = await query;
  if (!data) return;

  const today = new Date().toISOString().slice(0, 10);

  for (const profile of data) {
    // Check if they've already logged time today
    const { count } = await supabase
      .from("time_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .gte("clock_in", `${today}T00:00:00`);

    if ((count ?? 0) === 0) {
      await notifyTimeReminder(profile.id);
    }
  }
}

// ── Rule registry (future: store rules in DB, execute dynamically) ────────────

/**
 * Dispatch an event to all active automation rules.
 * Currently a stub - future implementation will load rules from DB.
 */
export async function dispatchEvent(
  event: TriggerEvent,
  payload: Record<string, unknown> = {}
): Promise<void> {
  // TODO: Load automation rules from `automation_rules` table and execute them
  // For now, log the event for debugging
  if (process.env.NODE_ENV === "development") {
    console.log(`[AutomationEngine] Event: ${event}`, payload);
  }
}

// ── Utility: schedule-safe wrapper ──────────────────────────────────────────

/**
 * Run an automation function safely, catching errors so they never
 * block the calling code.
 */
export async function safeRun(fn: () => Promise<void>, label: string): Promise<void> {
  try {
    await fn();
  } catch (err) {
    console.error(`[AutomationEngine] Error in ${label}:`, err);
  }
}
