"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  supabase,
  type NafEntry,
  type Profile,
  type TimeEntry,
  type DailyLog,
  type Delivery,
  type JobSite,
} from "@/lib/supabase";

const isLocal = !supabase;

// ── localStorage helpers for local mode ────────────────────────────────────
const LS_NAF = "naf_local_entries";
const LS_TIME = "payclock_entries";
const LS_NOTES = "notepad_logs";
const LS_DELIVERIES = "notepad_deliveries";
const LS_CREW = "jobsite_crew";
const LS_SITES = "jobsite_sites";

function getLS<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : []; }
  catch { return []; }
}
function setLS(key: string, data: unknown[]) {
  localStorage.setItem(key, JSON.stringify(data));
}
function nextLocalId(): string {
  const c = parseInt(localStorage.getItem("naf_counter") || "0", 10) + 1;
  localStorage.setItem("naf_counter", String(c));
  return `local-${c}`;
}

// ── helpers ────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatDuration(ms: number) {
  const hrs = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

const ENTRY_TYPE_CONFIG: Record<
  string,
  { icon: string; label: string; color: string; bg: string; border: string; accent: string; badge: string }
> = {
  general: {
    icon: "💬",
    label: "Note",
    color: "text-gray-800",
    bg: "bg-white",
    border: "border-gray-200",
    accent: "border-l-gray-400",
    badge: "bg-gray-100 text-gray-700",
  },
  note: {
    icon: "📝",
    label: "Field Note",
    color: "text-blue-800",
    bg: "bg-white",
    border: "border-blue-100",
    accent: "border-l-blue-500",
    badge: "bg-blue-100 text-blue-800",
  },
  delivery: {
    icon: "📦",
    label: "Delivery",
    color: "text-amber-800",
    bg: "bg-white",
    border: "border-amber-100",
    accent: "border-l-amber-500",
    badge: "bg-amber-100 text-amber-800",
  },
  clock_in: {
    icon: "🟢",
    label: "Clock In",
    color: "text-green-800",
    bg: "bg-white",
    border: "border-green-100",
    accent: "border-l-green-500",
    badge: "bg-green-100 text-green-800",
  },
  clock_out: {
    icon: "🔴",
    label: "Clock Out",
    color: "text-red-800",
    bg: "bg-white",
    border: "border-red-100",
    accent: "border-l-red-500",
    badge: "bg-red-100 text-red-800",
  },
  checklist: {
    icon: "✅",
    label: "Checklist",
    color: "text-purple-800",
    bg: "bg-white",
    border: "border-purple-100",
    accent: "border-l-purple-500",
    badge: "bg-purple-100 text-purple-800",
  },
  photo: {
    icon: "📸",
    label: "Photo",
    color: "text-pink-800",
    bg: "bg-white",
    border: "border-pink-100",
    accent: "border-l-pink-500",
    badge: "bg-pink-100 text-pink-800",
  },
  voice_memo: {
    icon: "🎙️",
    label: "Voice Memo",
    color: "text-indigo-800",
    bg: "bg-white",
    border: "border-indigo-100",
    accent: "border-l-indigo-500",
    badge: "bg-indigo-100 text-indigo-800",
  },
  file_upload: {
    icon: "📎",
    label: "File",
    color: "text-teal-800",
    bg: "bg-white",
    border: "border-teal-100",
    accent: "border-l-teal-500",
    badge: "bg-teal-100 text-teal-800",
  },
};

// ── types ──────────────────────────────────────────────────────────────────

type FeedItem = {
  id: string;
  type: string;
  icon: string;
  title: string;
  body: string;
  job?: string;
  time: string;
  timestamp: number;
  color: string;
  bg: string;
  border: string;
  accent: string;
  badge: string;
  attachments?: { file_type: string; file_name: string; file_url: string }[];
  pinned?: boolean;
  user?: string;
};

// ── main component ─────────────────────────────────────────────────────────

export default function FieldOffice() {
  // data
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [nafEntries, setNafEntries] = useState<NafEntry[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [jobSites, setJobSites] = useState<JobSite[]>([]);
  const [loading, setLoading] = useState(true);

  // composer
  const [composerText, setComposerText] = useState("");
  const [composerType, setComposerType] = useState("general");
  const [composerJob, setComposerJob] = useState("");
  const [composerUser, setComposerUser] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [posting, setPosting] = useState(false);
  const [postSuccess, setPostSuccess] = useState(false);

  // feed controls
  const [feedFilter, setFeedFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // clock-in panel
  const [showClockIn, setShowClockIn] = useState(false);
  const [clockJob, setClockJob] = useState("");
  const [clockUser, setClockUser] = useState("");
  const [clockNotes, setClockNotes] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── data fetching ──────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    if (isLocal) {
      const nowIso = new Date().toISOString();
      // Load crew from settings or use defaults
      const localCrew = getLS<Profile>(LS_CREW);
      const crewProfiles = localCrew.length > 0 ? localCrew : [
        { id: "demo-1", full_name: "Alex Rivera", role: "Lead Installer", is_active: true, created_at: nowIso },
        { id: "demo-2", full_name: "Sam Brooks", role: "Crew", is_active: true, created_at: nowIso },
      ];
      setProfiles(crewProfiles);

      const localSites = getLS<JobSite>(LS_SITES);
      setJobSites(localSites.length > 0 ? localSites : [
        { id: "site-1", name: "Rivera Backyard", address: "", client_name: "Rivera", status: "active", notes: "", created_at: nowIso },
      ]);

      setNafEntries(getLS<NafEntry>(LS_NAF));
      setTimeEntries(getLS<TimeEntry>(LS_TIME));
      setDailyLogs(getLS<DailyLog>(LS_NOTES));
      setDeliveries(getLS<Delivery>(LS_DELIVERIES));
      setLoading(false);
      return;
    }

    const [profilesRes, nafRes, timeRes, logsRes, delivRes, sitesRes] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, role, is_active, created_at")
          .eq("is_active", true)
          .order("full_name"),
        supabase
          .from("naf_entries")
          .select("id, entry_type, body, job_name, user_id, ref_id, ref_table, metadata, pinned, created_at, naf_attachments(*), profiles(*)")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("time_entries")
          .select("id, user_id, job_name, clock_in, clock_out, break_minutes, notes, created_at, profiles(full_name, role)")
          .order("clock_in", { ascending: false })
          .limit(120),
        supabase
          .from("daily_logs")
          .select("id, log_date, job_name, weather_condition, work_summary, issues, materials_used, sqft_completed, created_at")
          .order("created_at", { ascending: false })
          .limit(30),
        supabase
          .from("deliveries")
          .select("id, delivery_date, job_name, vendor, po_number, items_received, status, condition_notes, received_by, created_at")
          .order("created_at", { ascending: false })
          .limit(30),
        supabase
          .from("job_sites")
          .select("id, name, address, client_name, status, notes, created_at")
          .eq("status", "active")
          .order("name"),
      ]);
    if (profilesRes.data) setProfiles(profilesRes.data);
    if (nafRes.data) setNafEntries(nafRes.data as unknown as NafEntry[]);
    if (timeRes.data) setTimeEntries(timeRes.data as unknown as TimeEntry[]);
    if (logsRes.data) setDailyLogs(logsRes.data);
    if (delivRes.data) setDeliveries(delivRes.data);
    if (sitesRes.data) setJobSites(sitesRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const iv = setInterval(fetchAll, 30000);
    return () => clearInterval(iv);
  }, [fetchAll]);

  // ── computed values ────────────────────────────────────────────────────

  const activeClocks = timeEntries.filter((t) => !t.clock_out);

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const weekHours = timeEntries
    .filter((t) => t.clock_out && new Date(t.clock_in) >= weekStart)
    .reduce((sum, t) => {
      const ms =
        new Date(t.clock_out!).getTime() - new Date(t.clock_in).getTime();
      return sum + (ms / 3600000 - (t.break_minutes || 0) / 60);
    }, 0);

  const todayStr = now.toISOString().split("T")[0];
  const todayDeliveries = deliveries.filter(
    (d) => d.delivery_date === todayStr
  );
  const todayLogs = dailyLogs.filter((l) => l.log_date === todayStr);

  // ── build unified feed ─────────────────────────────────────────────────

  const buildFeed = useCallback((): FeedItem[] => {
    const items: FeedItem[] = [];

    // NAF entries (the primary source)
    nafEntries.forEach((e) => {
      const cfg =
        ENTRY_TYPE_CONFIG[e.entry_type] || ENTRY_TYPE_CONFIG.general;
      items.push({
        id: `naf-${e.id}`,
        type: e.entry_type,
        icon: cfg.icon,
        title: cfg.label,
        body: e.body || "",
        job: e.job_name || undefined,
        time: timeAgo(e.created_at),
        timestamp: new Date(e.created_at).getTime(),
        color: cfg.color,
        bg: cfg.bg,
        border: cfg.border,
        accent: cfg.accent,
        badge: cfg.badge,
        attachments: e.naf_attachments?.map((a) => ({
          file_type: a.file_type,
          file_name: a.file_name,
          file_url: a.file_url,
        })),
        pinned: e.pinned,
        user: e.profiles?.full_name,
      });
    });

    // Time entries (clock in/out events)
    timeEntries.forEach((t) => {
      const name = t.profiles?.full_name || "Unknown";
      const ciCfg = ENTRY_TYPE_CONFIG.clock_in;
      items.push({
        id: `ci-${t.id}`,
        type: "clock_in",
        icon: "🟢",
        title: "Clock In",
        body: `${name} clocked in${t.job_name ? ` at ${t.job_name}` : ""}`,
        job: t.job_name || undefined,
        time: timeAgo(t.clock_in),
        timestamp: new Date(t.clock_in).getTime(),
        color: ciCfg.color,
        bg: ciCfg.bg,
        border: ciCfg.border,
        accent: ciCfg.accent,
        badge: ciCfg.badge,
        user: name,
      });
      if (t.clock_out) {
        const ms =
          new Date(t.clock_out).getTime() - new Date(t.clock_in).getTime();
        const net = Math.max(
          0,
          ms / 3600000 - (t.break_minutes || 0) / 60
        );
        const coCfg = ENTRY_TYPE_CONFIG.clock_out;
        items.push({
          id: `co-${t.id}`,
          type: "clock_out",
          icon: "🔴",
          title: "Clock Out",
          body: `${name} clocked out — ${net.toFixed(1)} hrs${t.job_name ? ` at ${t.job_name}` : ""}`,
          job: t.job_name || undefined,
          time: timeAgo(t.clock_out),
          timestamp: new Date(t.clock_out).getTime(),
          color: coCfg.color,
          bg: coCfg.bg,
          border: coCfg.border,
          accent: coCfg.accent,
          badge: coCfg.badge,
          user: name,
        });
      }
    });

    // Daily logs
    const noteCfg = ENTRY_TYPE_CONFIG.note;
    dailyLogs.forEach((l) => {
      items.push({
        id: `log-${l.id}`,
        type: "note",
        icon: "📝",
        title: `Field Note${l.job_name ? ` — ${l.job_name}` : ""}`,
        body: l.work_summary,
        job: l.job_name || undefined,
        time: timeAgo(l.created_at),
        timestamp: new Date(l.created_at).getTime(),
        color: noteCfg.color,
        bg: noteCfg.bg,
        border: noteCfg.border,
        accent: noteCfg.accent,
        badge: noteCfg.badge,
      });
    });

    // Deliveries
    const statusIcons: Record<string, string> = {
      delivered: "✅",
      partial: "⚠️",
      damaged: "🚨",
      scheduled: "📅",
      cancelled: "❌",
    };
    const delivCfg = ENTRY_TYPE_CONFIG.delivery;
    deliveries.forEach((d) => {
      items.push({
        id: `del-${d.id}`,
        type: "delivery",
        icon: statusIcons[d.status] || "📦",
        title: `Delivery — ${d.vendor}`,
        body: d.items_received,
        job: d.job_name || undefined,
        time: timeAgo(d.created_at),
        timestamp: new Date(d.created_at).getTime(),
        color: delivCfg.color,
        bg: delivCfg.bg,
        border: delivCfg.border,
        accent: delivCfg.accent,
        badge: delivCfg.badge,
      });
    });

    // Sort: pinned first, then by time desc
    items.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.timestamp - a.timestamp;
    });

    return items;
  }, [nafEntries, timeEntries, dailyLogs, deliveries]);

  const allFeed = buildFeed();

  const filteredFeed = allFeed.filter((item) => {
    if (feedFilter !== "all" && item.type !== feedFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.body.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        (item.job && item.job.toLowerCase().includes(q)) ||
        (item.user && item.user.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // ── post entry ─────────────────────────────────────────────────────────

  async function handlePost() {
    if (!composerText.trim() && attachments.length === 0) return;
    setPosting(true);
    try {
      if (isLocal) {
        // Local mode: save to localStorage
        const newEntry: NafEntry = {
          id: nextLocalId(),
          entry_type: composerType,
          body: composerText.trim() || null,
          job_name: composerJob || null,
          user_id: composerUser || null,
          ref_id: null,
          ref_table: null,
          metadata: {},
          pinned: false,
          created_at: new Date().toISOString(),
          profiles: composerUser ? profiles.find(p => p.id === composerUser) : undefined,
          naf_attachments: [],
        };
        const existing = getLS<NafEntry>(LS_NAF);
        existing.unshift(newEntry);
        setLS(LS_NAF, existing);

        // Cross-post to local notes/deliveries
        if (composerType === "note" && composerText.trim()) {
          const notes = getLS<DailyLog>(LS_NOTES);
          notes.unshift({
            id: nextLocalId(),
            log_date: new Date().toISOString().split("T")[0],
            job_name: composerJob || null,
            weather_condition: null,
            work_summary: composerText.trim(),
            issues: null,
            materials_used: null,
            sqft_completed: null,
            created_at: new Date().toISOString(),
          });
          setLS(LS_NOTES, notes);
        } else if (composerType === "delivery" && composerText.trim()) {
          const delivs = getLS<Delivery>(LS_DELIVERIES);
          delivs.unshift({
            id: nextLocalId(),
            delivery_date: new Date().toISOString().split("T")[0],
            job_name: composerJob || null,
            vendor: "Via Feed",
            po_number: null,
            items_received: composerText.trim(),
            status: "delivered",
            condition_notes: null,
            received_by: null,
            created_at: new Date().toISOString(),
          });
          setLS(LS_DELIVERIES, delivs);
        }
      } else {
        // Supabase mode
        const { data: entry, error } = await supabase
          .from("naf_entries")
          .insert({
            entry_type: composerType,
            body: composerText.trim() || null,
            job_name: composerJob || null,
            user_id: composerUser || null,
            metadata: {},
          })
          .select()
          .single();

        if (error) throw error;

        if (composerType === "note" && composerText.trim()) {
          await supabase.from("daily_logs").insert({
            work_summary: composerText.trim(),
            job_name: composerJob || null,
          });
        } else if (composerType === "delivery" && composerText.trim()) {
          await supabase.from("deliveries").insert({
            vendor: "Via NAF",
            items_received: composerText.trim(),
            status: "delivered",
            job_name: composerJob || null,
          });
        }

        if (entry && attachments.length > 0) {
          for (const file of attachments) {
            const reader = new FileReader();
            const dataUrl = await new Promise<string>((resolve) => {
              reader.onload = () => resolve(reader.result as string);
              reader.readAsDataURL(file);
            });
            let fileType = "other";
            if (file.type.startsWith("image/")) fileType = "photo";
            else if (file.type.startsWith("video/")) fileType = "video";
            else if (file.type.startsWith("audio/")) fileType = "voice_memo";
            else fileType = "document";

            await supabase.from("naf_attachments").insert({
              entry_id: entry.id,
              file_type: fileType,
              file_name: file.name,
              file_url: dataUrl,
              file_size: file.size,
              mime_type: file.type,
            });
          }
        }
      }

      // Reset composer
      setComposerText("");
      setComposerType("general");
      setComposerJob("");
      setComposerUser("");
      setAttachments([]);
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      setPostSuccess(true);
      setTimeout(() => setPostSuccess(false), 2000);
      await fetchAll();
    } catch (err) {
      console.error("Post error:", err);
    } finally {
      setPosting(false);
    }
  }

  // ── clock in/out ───────────────────────────────────────────────────────

  async function handleClockIn() {
    if (!clockUser) return;
    const profile = profiles.find((p) => p.id === clockUser);
    const nowIso = new Date().toISOString();

    if (isLocal) {
      const entries = getLS<TimeEntry>(LS_TIME);
      entries.unshift({
        id: nextLocalId(),
        user_id: clockUser,
        job_name: clockJob || null,
        clock_in: nowIso,
        clock_out: null,
        break_minutes: 0,
        notes: clockNotes || null,
        created_at: nowIso,
        profiles: profile,
      });
      setLS(LS_TIME, entries);

      const naf = getLS<NafEntry>(LS_NAF);
      naf.unshift({
        id: nextLocalId(),
        entry_type: "clock_in",
        body: `${profile?.full_name || "Crew member"} clocked in${clockJob ? ` at ${clockJob}` : ""}${clockNotes ? ` — ${clockNotes}` : ""}`,
        job_name: clockJob || null,
        user_id: clockUser,
        ref_id: null, ref_table: null, metadata: {}, pinned: false,
        created_at: nowIso,
        profiles: profile,
        naf_attachments: [],
      } as NafEntry);
      setLS(LS_NAF, naf);
    } else {
      await supabase.from("time_entries").insert({
        user_id: clockUser,
        job_name: clockJob || null,
        notes: clockNotes || null,
        clock_in: nowIso,
      });
      await supabase.from("naf_entries").insert({
        entry_type: "clock_in",
        body: `${profile?.full_name || "Crew member"} clocked in${clockJob ? ` at ${clockJob}` : ""}${clockNotes ? ` — ${clockNotes}` : ""}`,
        job_name: clockJob || null,
        user_id: clockUser,
      });
    }

    setShowClockIn(false);
    setClockJob("");
    setClockUser("");
    setClockNotes("");
    await fetchAll();
  }

  async function handleClockOut(entryId: string) {
    const entry = timeEntries.find((t) => t.id === entryId);
    const nowIso = new Date().toISOString();

    if (isLocal) {
      const entries = getLS<TimeEntry>(LS_TIME).map(t =>
        t.id === entryId ? { ...t, clock_out: nowIso } : t
      );
      setLS(LS_TIME, entries);

      if (entry) {
        const profile = profiles.find((p) => p.id === entry.user_id);
        const ms = Date.now() - new Date(entry.clock_in).getTime();
        const naf = getLS<NafEntry>(LS_NAF);
        naf.unshift({
          id: nextLocalId(),
          entry_type: "clock_out",
          body: `${profile?.full_name || "Crew member"} clocked out — ${formatDuration(ms)}${entry.job_name ? ` from ${entry.job_name}` : ""}`,
          job_name: entry.job_name || null,
          user_id: entry.user_id,
          ref_id: null, ref_table: null, metadata: {}, pinned: false,
          created_at: nowIso,
          profiles: profile,
          naf_attachments: [],
        } as NafEntry);
        setLS(LS_NAF, naf);
      }
    } else {
      await supabase
        .from("time_entries")
        .update({ clock_out: nowIso })
        .eq("id", entryId);

      if (entry) {
        const profile = profiles.find((p) => p.id === entry.user_id);
        const ms = Date.now() - new Date(entry.clock_in).getTime();
        await supabase.from("naf_entries").insert({
          entry_type: "clock_out",
          body: `${profile?.full_name || "Crew member"} clocked out — ${formatDuration(ms)}${entry.job_name ? ` from ${entry.job_name}` : ""}`,
          job_name: entry.job_name || null,
          user_id: entry.user_id,
        });
      }
    }
    await fetchAll();
  }

  // ── textarea auto-resize ──────────────────────────────────────────────

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setComposerText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
  }

  function handleFileSelect(accept?: string) {
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept || "*/*";
      fileInputRef.current.click();
    }
  }

  function handleFilesAdded(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files)
      setAttachments((prev) => [...prev, ...Array.from(e.target.files!)]);
    e.target.value = "";
  }

  // ── render ─────────────────────────────────────────────────────────────

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Loading Field Office...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Install Operations
          </h1>
          <p className="text-sm text-gray-500">{today}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowClockIn(!showClockIn)}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            {activeClocks.length > 0
              ? `⏱ ${activeClocks.length} On Clock`
              : "⏱ Clock In"}
          </button>
          <Link
            href="/settings"
            className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition-colors flex items-center"
          >
            ⚙️
          </Link>
        </div>
      </div>

      {/* ── Stats Strip ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-brand-600 text-white rounded-xl p-3 text-center shadow-sm">
          <div className="text-2xl font-bold">{activeClocks.length}</div>
          <div className="text-xs opacity-80">On Clock</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3 text-center shadow-sm">
          <div className="text-2xl font-bold text-gray-900">
            {weekHours.toFixed(1)}
          </div>
          <div className="text-xs text-gray-500">Week Hours</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3 text-center shadow-sm">
          <div className="text-2xl font-bold text-gray-900">
            {todayDeliveries.length}
          </div>
          <div className="text-xs text-gray-500">Deliveries Today</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3 text-center shadow-sm">
          <div className="text-2xl font-bold text-gray-900">
            {todayLogs.length}
          </div>
          <div className="text-xs text-gray-500">Notes Today</div>
        </div>
      </div>

      {/* ── Clock-In Quick Panel ───────────────────────────────────────── */}
      {showClockIn && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-green-800">
              Quick Clock In / Out
            </h3>
            <button
              onClick={() => setShowClockIn(false)}
              className="text-green-600 hover:text-green-800 text-sm"
            >
              Close ×
            </button>
          </div>

          {/* Active clocks list */}
          {activeClocks.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-green-700">
                Currently Clocked In ({activeClocks.length})
              </p>
              {activeClocks.map((t) => {
                const dur =
                  Date.now() - new Date(t.clock_in).getTime();
                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-green-100"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-green-500">●</span>
                      <span className="font-medium text-sm">
                        {t.profiles?.full_name || "—"}
                      </span>
                      {t.job_name && (
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                          {t.job_name}
                        </span>
                      )}
                      <span className="text-xs text-gray-500 font-mono">
                        {formatDuration(dur)}
                      </span>
                      <span className="text-xs text-gray-400">
                        since {formatTime(t.clock_in)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleClockOut(t.id)}
                      className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-lg hover:bg-red-200 font-medium"
                    >
                      Clock Out
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* New clock-in form */}
          <div className="border-t border-green-200 pt-3">
            <p className="text-xs font-medium text-green-700 mb-2">
              New Clock In
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div>
                <label className="text-xs text-green-700 font-medium">
                  Crew Member *
                </label>
                <select
                  value={clockUser}
                  onChange={(e) => setClockUser(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-0.5"
                >
                  <option value="">Select...</option>
                  {profiles
                    .filter(
                      (p) =>
                        !activeClocks.some(
                          (a) => a.user_id === p.id
                        )
                    )
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name} ({p.role})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-green-700 font-medium">
                  Job Site
                </label>
                <input
                  value={clockJob}
                  onChange={(e) => setClockJob(e.target.value)}
                  placeholder="Job name..."
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-0.5"
                  list="job-sites-list"
                />
              </div>
              <div>
                <label className="text-xs text-green-700 font-medium">
                  Notes
                </label>
                <input
                  value={clockNotes}
                  onChange={(e) => setClockNotes(e.target.value)}
                  placeholder="Optional notes..."
                  className="w-full border rounded-lg px-3 py-2 text-sm mt-0.5"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleClockIn}
                  disabled={!clockUser}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-green-700"
                >
                  ✅ Clock In
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── NAF Composer (Entry-First) ─────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {/* Type selector bar */}
        <div className="flex items-center gap-1 px-3 pt-3 pb-1 border-b border-gray-100 flex-wrap">
          <div className="relative">
            <button
              onClick={() => setShowTypeMenu(!showTypeMenu)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                ENTRY_TYPE_CONFIG[composerType]?.bg || "bg-gray-100"
              } ${
                ENTRY_TYPE_CONFIG[composerType]?.color ||
                "text-gray-700"
              }`}
            >
              {ENTRY_TYPE_CONFIG[composerType]?.icon}{" "}
              {ENTRY_TYPE_CONFIG[composerType]?.label || "Note"} ▾
            </button>
            {showTypeMenu && (
              <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-20 py-1 w-48">
                {Object.entries(ENTRY_TYPE_CONFIG).map(
                  ([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setComposerType(key);
                        setShowTypeMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${
                        composerType === key
                          ? "bg-gray-50 font-medium"
                          : ""
                      }`}
                    >
                      <span>{cfg.icon}</span>
                      <span>{cfg.label}</span>
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          {/* Job tag */}
          <input
            value={composerJob}
            onChange={(e) => setComposerJob(e.target.value)}
            placeholder="Job site..."
            className="px-2 py-1.5 text-xs border rounded-lg bg-gray-50 w-32"
            list="job-sites-list"
          />

          {/* User selector */}
          <select
            value={composerUser}
            onChange={(e) => setComposerUser(e.target.value)}
            className="px-2 py-1.5 text-xs border rounded-lg bg-gray-50"
          >
            <option value="">Posted by...</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </select>

          {postSuccess && (
            <span className="text-xs text-green-600 font-medium ml-auto">
              ✅ Posted!
            </span>
          )}
        </div>

        {/* Text input area */}
        <textarea
          ref={textareaRef}
          value={composerText}
          onChange={handleTextareaChange}
          placeholder="What's happening on the jobsite? Log a note, delivery, update, anything..."
          className="w-full px-4 py-3 text-sm resize-none focus:outline-none min-h-[80px]"
          rows={3}
        />

        {/* Attachment previews */}
        {attachments.length > 0 && (
          <div className="px-4 pb-2 flex gap-2 flex-wrap">
            {attachments.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-1 bg-gray-100 rounded-lg px-2 py-1 text-xs"
              >
                <span>
                  {f.type.startsWith("image/")
                    ? "📸"
                    : f.type.startsWith("video/")
                    ? "🎬"
                    : f.type.startsWith("audio/")
                    ? "🎙️"
                    : "📎"}
                </span>
                <span className="max-w-[100px] truncate">
                  {f.name}
                </span>
                <span className="text-gray-400">
                  ({(f.size / 1024).toFixed(0)}KB)
                </span>
                <button
                  onClick={() =>
                    setAttachments((prev) =>
                      prev.filter((_, j) => j !== i)
                    )
                  }
                  className="text-gray-400 hover:text-red-500 ml-1"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Action bar */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 bg-gray-50">
          <div className="flex gap-1">
            <button
              onClick={() => handleFileSelect("image/*")}
              className="p-2 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors"
              title="Attach Photo"
            >
              📸
              <span className="sr-only">Photo</span>
            </button>
            <button
              onClick={() => handleFileSelect("video/*")}
              className="p-2 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors"
              title="Attach Video"
            >
              🎬
              <span className="sr-only">Video</span>
            </button>
            <button
              onClick={() => handleFileSelect("audio/*")}
              className="p-2 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors"
              title="Voice Memo"
            >
              🎙️
              <span className="sr-only">Voice Memo</span>
            </button>
            <button
              onClick={() => handleFileSelect()}
              className="p-2 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors"
              title="Upload File"
            >
              📎
              <span className="sr-only">Upload</span>
            </button>
          </div>
          <button
            onClick={handlePost}
            disabled={
              posting ||
              (!composerText.trim() && attachments.length === 0)
            }
            className="px-5 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-brand-700 transition-colors"
          >
            {posting ? "Posting..." : "Post to Feed"}
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          onChange={handleFilesAdded}
        />
      </div>

      {/* ── Quick Actions Strip ────────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-2">
        <Link
          href="/hours"
          className="bg-white border border-gray-200 rounded-xl p-3 text-center hover:border-brand-500 hover:shadow-sm transition-all"
        >
          <div className="text-xl">⏱</div>
          <div className="text-xs text-gray-600 mt-1">Pay Clock</div>
        </Link>
        <Link
          href="/notepad"
          className="bg-white border border-gray-200 rounded-xl p-3 text-center hover:border-brand-500 hover:shadow-sm transition-all"
        >
          <div className="text-xl">📋</div>
          <div className="text-xs text-gray-600 mt-1">Notepad</div>
        </Link>
        <Link
          href="/notepad?tab=deliveries"
          className="bg-white border border-gray-200 rounded-xl p-3 text-center hover:border-brand-500 hover:shadow-sm transition-all"
        >
          <div className="text-xl">📦</div>
          <div className="text-xs text-gray-600 mt-1">Deliveries</div>
        </Link>
        <Link
          href="/tools"
          className="bg-white border border-gray-200 rounded-xl p-3 text-center hover:border-brand-500 hover:shadow-sm transition-all"
        >
          <div className="text-xl">🔧</div>
          <div className="text-xs text-gray-600 mt-1">Tools</div>
        </Link>
        <Link
          href="/settings"
          className="bg-white border border-gray-200 rounded-xl p-3 text-center hover:border-brand-500 hover:shadow-sm transition-all"
        >
          <div className="text-xl">⚙️</div>
          <div className="text-xs text-gray-600 mt-1">Settings</div>
        </Link>
      </div>

      {/* ── Feed Filter & Search ───────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1 flex-wrap flex-1">
          {[
            { key: "all", label: "All" },
            { key: "general", label: "💬 Notes" },
            { key: "note", label: "📝 Field" },
            { key: "clock_in", label: "🟢 In" },
            { key: "clock_out", label: "🔴 Out" },
            { key: "delivery", label: "📦 Deliv" },
            { key: "photo", label: "📸 Photo" },
            { key: "voice_memo", label: "🎙️ Voice" },
            { key: "file_upload", label: "📎 Files" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFeedFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                feedFilter === f.key
                  ? "bg-brand-600 text-white"
                  : "bg-white border text-gray-600 hover:bg-gray-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search feed..."
          className="border rounded-lg px-3 py-1.5 text-sm w-44"
        />
      </div>

      {/* ── Activity Feed ──────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">
            Activity Feed
            <span className="text-xs text-gray-400 font-normal ml-2">
              {filteredFeed.length} items
            </span>
          </h2>
          <button
            onClick={fetchAll}
            className="text-xs text-brand-600 hover:text-brand-700"
          >
            ↻ Refresh
          </button>
        </div>

        {filteredFeed.length === 0 && (
          <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-200">
            <div className="text-4xl mb-2">📋</div>
            <p className="text-sm">
              {searchQuery || feedFilter !== "all"
                ? "No matching entries found."
                : "No activity yet. Post something to get started!"}
            </p>
          </div>
        )}

        {filteredFeed.map((item) => (
          <div
            key={item.id}
            className={`bg-white border ${item.border} border-l-4 ${item.accent} rounded-xl p-4 hover:shadow-md transition-shadow`}
          >
            <div className="flex items-start gap-3">
              <div className="text-xl flex-shrink-0 mt-0.5">{item.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${item.badge}`}>
                    {item.title}
                  </span>
                  {item.pinned && (
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-medium">
                      📌 Pinned
                    </span>
                  )}
                  {item.job && (
                    <span className="text-xs bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full text-gray-700 font-medium">
                      {item.job}
                    </span>
                  )}
                  {item.user && (
                    <span className="text-xs text-gray-400">by {item.user}</span>
                  )}
                  <span className="text-xs text-gray-400 ml-auto flex-shrink-0">{item.time}</span>
                </div>
                {item.body && (
                  <p className="text-sm text-gray-800 mt-1 whitespace-pre-wrap leading-relaxed">
                    {item.body}
                  </p>
                )}
                {item.attachments && item.attachments.length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {item.attachments.map((att, i) => (
                      <div
                        key={i}
                        className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs flex items-center gap-1 cursor-pointer hover:bg-gray-100"
                      >
                        <span>
                          {att.file_type === "photo" ? "📸"
                            : att.file_type === "video" ? "🎬"
                            : att.file_type === "voice_memo" ? "🎙️"
                            : "📎"}
                        </span>
                        <span className="truncate max-w-[120px] text-gray-700">{att.file_name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Datalist for job sites autocomplete */}
      <datalist id="job-sites-list">
        {jobSites.map((s) => (
          <option key={s.id} value={s.name} />
        ))}
      </datalist>
    </div>
  );
}
