"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  type AppNotification,
  type NotificationType,
} from "@/lib/engines/notification";
import { getLocalSession } from "@/lib/local-auth";

// ── Local mode helpers ──────────────────────────────────────────────────────
const LS_NOTIFICATIONS = "io_notifications";

interface LocalNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

function getLocalNotifications(): LocalNotification[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LS_NOTIFICATIONS) || "[]");
  } catch {
    return [];
  }
}

function saveLocalNotifications(notifs: LocalNotification[]) {
  localStorage.setItem(LS_NOTIFICATIONS, JSON.stringify(notifs));
}

// ── Notification type display ────────────────────────────────────────────────

const TYPE_CONFIG: Record<NotificationType, { icon: string; color: string }> = {
  job_assigned: { icon: "📋", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  job_updated: { icon: "🔄", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200" },
  time_reminder: { icon: "⏰", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  missing_clock_out: { icon: "⚠️", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  delivery_update: { icon: "📦", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  crew_update: { icon: "👥", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  system_alert: { icon: "🔔", color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200" },
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ── Page Component ──────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [userId, setUserId] = useState<string | null>(null);

  const isLocal = !supabase;

  // Resolve user ID
  useEffect(() => {
    if (isLocal) {
      const session = getLocalSession();
      setUserId(session?.email ?? "local-user");
      return;
    }
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("auth_id", data.user.id)
        .single();
      if (profile) setUserId(profile.id);
    });
  }, [isLocal]);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    if (isLocal) {
      const local = getLocalNotifications();
      const mapped: AppNotification[] = local.map((n) => ({
        ...n,
        user_id: userId,
        link: n.link,
      }));
      setNotifications(filter === "unread" ? mapped.filter((n) => !n.is_read) : mapped);
      setLoading(false);
      return;
    }

    const data = await getNotifications(userId, filter === "unread");
    setNotifications(data);
    setLoading(false);
  }, [userId, filter, isLocal]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkRead = async (id: string) => {
    if (isLocal) {
      const all = getLocalNotifications();
      const updated = all.map((n) => (n.id === id ? { ...n, is_read: true } : n));
      saveLocalNotifications(updated);
    } else {
      await markAsRead(id);
    }
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const handleMarkAllRead = async () => {
    if (!userId) return;
    if (isLocal) {
      const all = getLocalNotifications();
      saveLocalNotifications(all.map((n) => ({ ...n, is_read: true })));
    } else {
      await markAllAsRead(userId);
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Notifications
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
              : "All caught up"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Filter toggle */}
          <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === "all"
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                  : "bg-white text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === "unread"
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                  : "bg-white text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              Unread
            </button>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Notification list */}
      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm animate-pulse">
          Loading notifications...
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="text-4xl">🔔</div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {filter === "unread"
              ? "No unread notifications"
              : "No notifications yet"}
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-xs">
            You&apos;ll see alerts for job assignments, time reminders, and more here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => {
            const typeConf = TYPE_CONFIG[(notif.type as NotificationType)] ?? TYPE_CONFIG.system_alert;
            return (
              <div
                key={notif.id}
                className={`relative flex items-start gap-3 p-4 rounded-xl border transition-colors ${
                  notif.is_read
                    ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                    : "bg-blue-50 dark:bg-gray-800 border-blue-200 dark:border-blue-800"
                }`}
              >
                {/* Unread dot */}
                {!notif.is_read && (
                  <span className="absolute top-4 left-2 w-2 h-2 rounded-full bg-blue-500" />
                )}

                {/* Icon */}
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg ${typeConf.color}`}
                >
                  {typeConf.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3
                      className={`text-sm font-medium ${
                        notif.is_read
                          ? "text-gray-700 dark:text-gray-300"
                          : "text-gray-900 dark:text-white"
                      }`}
                    >
                      {notif.title}
                    </h3>
                    <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap flex-shrink-0">
                      {timeAgo(notif.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                    {notif.body}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    {notif.link && (
                      <a
                        href={notif.link}
                        className="text-xs text-green-600 hover:text-green-700 font-medium"
                      >
                        View details
                      </a>
                    )}
                    {!notif.is_read && (
                      <button
                        onClick={() => handleMarkRead(notif.id)}
                        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
