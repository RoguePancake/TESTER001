/**
 * AUTOMATION ENGINE
 * Workflow automation hooks - reminders, auto-reports, status updates.
 * Architecture designed for future cron-job and event-driven triggers.
 */

import { supabase } from "@/lib/supabase";
import { sendNotification, notifyMissingClockOut, notifyTimeReminder } from "./notification";
import { logActivity } from "./activity";

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
 * Loads matching rules from the automation_rules table and executes their actions.
 */
export async function dispatchEvent(
  event: TriggerEvent,
  payload: Record<string, unknown> = {}
): Promise<void> {
  if (process.env.NODE_ENV === "development") {
    console.log(`[AutomationEngine] Event: ${event}`, payload);
  }

  if (!supabase) return;

  try {
    // Load active rules matching this trigger
    const { data: rules } = await supabase
      .from("automation_rules")
      .select("*")
      .eq("trigger", event)
      .eq("is_active", true);

    if (!rules || rules.length === 0) return;

    for (const rule of rules as AutomationRule[]) {
      await safeRun(() => executeRule(rule, payload), `rule:${rule.name}`);
    }
  } catch (err) {
    console.error(`[AutomationEngine] Failed to dispatch event ${event}:`, err);
  }
}

/**
 * Execute a single automation rule based on its action type.
 */
async function executeRule(
  rule: AutomationRule,
  payload: Record<string, unknown>
): Promise<void> {
  const config = rule.config ?? {};

  switch (rule.action) {
    case "send_notification": {
      const userId = (payload.user_id ?? config.user_id) as string | undefined;
      const title = (config.title as string) ?? rule.name;
      const body = (config.body as string) ?? `Automation triggered: ${rule.name}`;
      const notifType = (config.notification_type as string) ?? "system_alert";
      const link = config.link as string | undefined;
      if (userId) {
        await sendNotification(userId, notifType as import("./notification").NotificationType, title, body, link);
      }
      break;
    }
    case "check_missing_clock_out": {
      await runMissingClockOutCheck();
      break;
    }
    case "send_time_reminder": {
      const companyId = (payload.company_id ?? config.company_id) as string | undefined;
      await runDailyTimeReminder(companyId);
      break;
    }
    case "log_activity": {
      await logActivity({
        action: (config.activity_action as import("./activity").ActivityAction) ?? "settings_updated",
        resource_type: (config.resource_type as string) ?? "automation",
        resource_id: rule.id,
        metadata: { rule_name: rule.name, trigger: rule.trigger, payload },
      });
      break;
    }
    default: {
      console.warn(`[AutomationEngine] Unknown action "${rule.action}" for rule "${rule.name}"`);
    }
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
