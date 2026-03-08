/**
 * NOTIFICATION ENGINE
 * In-app alerts and notifications.
 * Examples: job assignments, missing time entries, updates.
 */

import { supabase } from "@/lib/supabase";

export type NotificationType =
  | "job_assigned"
  | "job_updated"
  | "time_reminder"
  | "missing_clock_out"
  | "delivery_update"
  | "crew_update"
  | "system_alert";

// Named AppNotification to avoid shadowing the global DOM Notification type
export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

// ── Create ───────────────────────────────────────────────────────────────────

export async function sendNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  link?: string
): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from("notifications").insert({ user_id: userId, type, title, body, link: link ?? null });
  } catch {
    console.warn("[NotificationEngine] Failed to send notification");
  }
}

// ── Read ─────────────────────────────────────────────────────────────────────

export async function getNotifications(userId: string, unreadOnly = false): Promise<AppNotification[]> {
  if (!supabase) return [];
  let query = supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (unreadOnly) query = query.eq("is_read", false);
  const { data } = await query;
  return (data ?? []) as AppNotification[];
}

export async function getUnreadCount(userId: string): Promise<number> {
  if (!supabase) return 0;
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  return count ?? 0;
}

export async function markAsRead(notificationId: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("notifications").update({ is_read: true }).eq("id", notificationId);
}

export async function markAllAsRead(userId: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
}

// ── Convenience senders ───────────────────────────────────────────────────────

export async function notifyJobAssignment(userId: string, jobName: string): Promise<void> {
  await sendNotification(userId, "job_assigned", "New Job Assignment", `You have been assigned to: ${jobName}`, "/");
}

export async function notifyMissingClockOut(userId: string): Promise<void> {
  await sendNotification(
    userId,
    "missing_clock_out",
    "Missing Clock-Out",
    "You appear to still be clocked in. Please clock out when done.",
    "/hours"
  );
}

export async function notifyTimeReminder(userId: string): Promise<void> {
  await sendNotification(
    userId,
    "time_reminder",
    "Time Entry Reminder",
    "Don't forget to log your hours for today.",
    "/hours"
  );
}
