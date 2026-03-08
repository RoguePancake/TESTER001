/**
 * ACTIVITY ENGINE
 * Complete audit log for every important action in the system.
 * Admins can review the full activity history.
 */

import { supabase } from "@/lib/supabase";

export type ActivityAction =
  | "user_created"
  | "user_updated"
  | "user_deactivated"
  | "job_created"
  | "job_updated"
  | "job_status_changed"
  | "job_deleted"
  | "time_clocked_in"
  | "time_clocked_out"
  | "time_entry_edited"
  | "time_entry_deleted"
  | "journal_created"
  | "journal_deleted"
  | "note_deleted"
  | "delivery_created"
  | "delivery_updated"
  | "crew_created"
  | "crew_member_added"
  | "crew_member_removed"
  | "file_uploaded"
  | "settings_updated"
  | "company_created";

export interface ActivityLog {
  id: string;
  company_id: string | null;
  actor_id: string | null;
  actor_name?: string;
  action: ActivityAction;
  resource_type: string;
  resource_id: string | null;
  previous_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface LogActivityInput {
  company_id?: string;
  actor_id?: string;
  action: ActivityAction;
  resource_type: string;
  resource_id?: string;
  previous_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

// ── Write ────────────────────────────────────────────────────────────────────

/**
 * Log an activity event. Silently fails if Supabase is unavailable
 * so it never blocks normal operations.
 */
export async function logActivity(input: LogActivityInput): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from("activity_logs").insert({
      company_id: input.company_id ?? null,
      actor_id: input.actor_id ?? null,
      action: input.action,
      resource_type: input.resource_type,
      resource_id: input.resource_id ?? null,
      previous_data: input.previous_data ?? null,
      new_data: input.new_data ?? null,
      metadata: input.metadata ?? null,
    });
  } catch {
    // Activity logging must never crash the app
    console.warn("[ActivityEngine] Failed to log activity:", input.action);
  }
}

// ── Read ─────────────────────────────────────────────────────────────────────

export async function getActivityLogs(
  companyId?: string,
  limit = 100
): Promise<ActivityLog[]> {
  if (!supabase) return [];
  let query = supabase
    .from("activity_logs")
    .select("*, profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (companyId) query = query.eq("company_id", companyId);
  const { data } = await query;
  return (data ?? []) as ActivityLog[];
}

export async function getActivityForResource(
  resourceType: string,
  resourceId: string
): Promise<ActivityLog[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("activity_logs")
    .select("*")
    .eq("resource_type", resourceType)
    .eq("resource_id", resourceId)
    .order("created_at", { ascending: false });
  return (data ?? []) as ActivityLog[];
}

// ── Action label helper ───────────────────────────────────────────────────────

export function activityLabel(action: ActivityAction): string {
  const labels: Record<ActivityAction, string> = {
    user_created: "User created",
    user_updated: "User updated",
    user_deactivated: "User deactivated",
    job_created: "Job created",
    job_updated: "Job updated",
    job_status_changed: "Job status changed",
    job_deleted: "Job deleted",
    time_clocked_in: "Clocked in",
    time_clocked_out: "Clocked out",
    time_entry_edited: "Time entry edited",
    time_entry_deleted: "Time entry deleted",
    journal_created: "Journal entry created",
    journal_deleted: "Journal entry deleted",
    note_deleted: "Note deleted",
    delivery_created: "Delivery logged",
    delivery_updated: "Delivery updated",
    crew_created: "Crew created",
    crew_member_added: "Member added to crew",
    crew_member_removed: "Member removed from crew",
    file_uploaded: "File uploaded",
    settings_updated: "Settings updated",
    company_created: "Company created",
  };
  return labels[action] ?? action;
}
