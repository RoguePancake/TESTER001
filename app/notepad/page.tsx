"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  supabase,
  type DailyLog,
  type Delivery,
  type JobSite,
} from "@/lib/supabase";

// ── localStorage keys ─────────────────────────────────────────────────
const LS_NOTES = "notepad_logs";
const LS_DELIVERIES = "notepad_deliveries";
const LS_SITES = "jobsite_sites";
const LS_COUNTER = "notepad_counter";

function nextLocalId(): string {
  if (typeof window === "undefined") return `local-${Date.now()}`;
  const c = parseInt(localStorage.getItem(LS_COUNTER) || "0", 10) + 1;
  localStorage.setItem(LS_COUNTER, String(c));
  return `local-${c}`;
}

function getLocalNotes(): DailyLog[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_NOTES);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveLocalNotes(logs: DailyLog[]) {
  localStorage.setItem(LS_NOTES, JSON.stringify(logs));
}

function getLocalDeliveries(): Delivery[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_DELIVERIES);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveLocalDeliveries(deliveries: Delivery[]) {
  localStorage.setItem(LS_DELIVERIES, JSON.stringify(deliveries));
}

function getLocalSites(): JobSite[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_SITES);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// ── Constants ─────────────────────────────────────────────────────────

const WEATHER_OPTIONS = ["Sunny", "Cloudy", "Rainy", "Windy", "Hot", "Overcast"];
const WEATHER_ICON: Record<string, string> = {
  Sunny: "☀️",
  Cloudy: "⛅",
  Rainy: "🌧️",
  Windy: "💨",
  Hot: "🌡️",
  Overcast: "🌥️",
};

const STATUS_STYLE: Record<string, string> = {
  delivered: "bg-green-100 text-green-700",
  partial: "bg-amber-100 text-amber-700",
  damaged: "bg-red-100 text-red-700",
  scheduled: "bg-blue-100 text-blue-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const CHECKLISTS = {
  site_prep: [
    "Site access confirmed (gate code/contact available)",
    "Utilities marked (811 call done or confirmed not needed)",
    "Irrigation shut off or capped",
    "Existing material removed or demo scheduled",
    "Base material delivery confirmed (ETA and quantity)",
    "Compaction equipment on site or reserved",
    "Drainage pattern assessed and documented",
    "Edge/border material staged",
    "Adjacent surfaces protected (concrete, planters)",
    "Client walkthrough done — starting point agreed",
  ],
  safety: [
    "Crew headcount matches assignment",
    "First aid kit on truck and accessible",
    "Water available for crew",
    "No overhead hazards in work zone",
    "Tool guards in place on power equipment",
    "Trip hazards marked with cones",
    "PPE distributed (gloves, eye protection)",
    "Emergency contact for site posted",
  ],
  final_walkthrough: [
    "Turf seams are tight and flat",
    "All edges secured (nailed, glued, or bordered)",
    "Infill evenly distributed — no bare patches",
    "Turf pile direction consistent throughout",
    "Drainage areas clear and functional",
    "Client walkthrough complete",
    "Before/after photos taken",
    "Cleanup complete — no debris on site",
    "Client signature obtained or verbal sign-off logged",
  ],
};

type ChecklistType = keyof typeof CHECKLISTS;
type DeliveryStatus = "scheduled" | "delivered" | "partial" | "damaged" | "cancelled";

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

const isLocal = !supabase;

// ══════════════════════════════════════════════════════════════════════════
// TAB: NOTES
// ══════════════════════════════════════════════════════════════════════════

function NotesTab() {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [jobSites, setJobSites] = useState<JobSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const [logDate, setLogDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [jobName, setJobName] = useState("");
  const [weather, setWeather] = useState("");
  const [workSummary, setWorkSummary] = useState("");
  const [issues, setIssues] = useState("");
  const [materials, setMaterials] = useState("");
  const [sqft, setSqft] = useState("");

  // Filter
  const [filterText, setFilterText] = useState("");

  const fetchLogs = useCallback(async () => {
    if (isLocal) {
      setLogs(getLocalNotes());
      setJobSites(getLocalSites());
      setLoading(false);
      return;
    }
    const [logsRes, sitesRes] = await Promise.all([
      supabase
        .from("daily_logs")
        .select("*")
        .order("log_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("job_sites")
        .select("*")
        .eq("status", "active")
        .order("name"),
    ]);
    if (logsRes.data) setLogs(logsRes.data);
    if (sitesRes.data) setJobSites(sitesRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!workSummary.trim()) return;
    setSubmitting(true);

    if (isLocal) {
      const newLog: DailyLog = {
        id: nextLocalId(),
        log_date: logDate,
        job_name: jobName || null,
        weather_condition: weather || null,
        work_summary: workSummary.trim(),
        issues: issues.trim() || null,
        materials_used: materials.trim() || null,
        sqft_completed: sqft ? parseInt(sqft, 10) : null,
        created_at: new Date().toISOString(),
      };
      const existing = getLocalNotes();
      existing.unshift(newLog);
      saveLocalNotes(existing);
    } else {
      await supabase.from("daily_logs").insert({
        log_date: logDate,
        job_name: jobName || null,
        weather_condition: weather || null,
        work_summary: workSummary.trim(),
        issues: issues.trim() || null,
        materials_used: materials.trim() || null,
        sqft_completed: sqft ? parseInt(sqft, 10) : null,
      });

      // Cross-post to NAF
      await supabase.from("naf_entries").insert({
        entry_type: "note",
        body: workSummary.trim() + (issues.trim() ? `\n\n⚠️ Issues: ${issues.trim()}` : ""),
        job_name: jobName || null,
        metadata: {
          weather: weather || null,
          sqft: sqft ? parseInt(sqft, 10) : null,
          materials: materials.trim() || null,
          log_date: logDate,
        },
      });
    }

    setWorkSummary("");
    setIssues("");
    setMaterials("");
    setSqft("");
    setSuccessMsg("Note saved!");
    setTimeout(() => setSuccessMsg(""), 3000);
    fetchLogs();
    setSubmitting(false);
  }

  const filteredLogs = filterText
    ? logs.filter(
        (l) =>
          l.work_summary.toLowerCase().includes(filterText.toLowerCase()) ||
          (l.job_name && l.job_name.toLowerCase().includes(filterText.toLowerCase())) ||
          (l.issues && l.issues.toLowerCase().includes(filterText.toLowerCase()))
      )
    : logs;

  if (loading)
    return (
      <div className="py-12 text-center text-gray-400 text-sm">
        Loading notes...
      </div>
    );

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="font-semibold text-base mb-4">New Field Note</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date
              </label>
              <input
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Job / Site
              </label>
              <input
                type="text"
                placeholder="e.g. Johnson Backyard"
                value={jobName}
                onChange={(e) => setJobName(e.target.value)}
                list="notepad-job-sites"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
              />
              <datalist id="notepad-job-sites">
                {jobSites.map((s) => (
                  <option key={s.id} value={s.name} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Weather
              </label>
              <select
                value={weather}
                onChange={(e) => setWeather(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">— Select —</option>
                {WEATHER_OPTIONS.map((w) => (
                  <option key={w} value={w}>
                    {WEATHER_ICON[w]} {w}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Work Summary <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="What did the crew accomplish today?"
              value={workSummary}
              onChange={(e) => setWorkSummary(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Issues
              </label>
              <textarea
                rows={2}
                placeholder="Problems, delays, access issues..."
                value={issues}
                onChange={(e) => setIssues(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Materials Used
              </label>
              <textarea
                rows={2}
                placeholder="Turf rolls, infill bags, adhesive..."
                value={materials}
                onChange={(e) => setMaterials(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
          <div className="flex items-end gap-4">
            <div className="w-40">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sqft Completed
              </label>
              <input
                type="number"
                placeholder="850"
                min={0}
                value={sqft}
                onChange={(e) => setSqft(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <button
              type="submit"
              disabled={submitting || !workSummary.trim()}
              className="bg-green-700 hover:bg-green-800 text-white font-semibold px-6 py-2.5 rounded-lg text-sm disabled:opacity-50 transition-colors"
            >
              {submitting ? "Saving..." : "Save Note"}
            </button>
            {successMsg && (
              <span className="text-green-600 text-sm font-medium">
                {successMsg}
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Search/filter */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">
          {filteredLogs.length} notes
        </span>
        <input
          type="text"
          placeholder="Search notes..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
        />
      </div>

      {/* List */}
      {filteredLogs.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-400 text-sm">
          {filterText
            ? "No matching notes found."
            : "No field notes yet. Submit your first note above."}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4"
            >
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formatDate(log.log_date)}
                </span>
                {log.job_name && (
                  <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                    {log.job_name}
                  </span>
                )}
                {log.weather_condition && (
                  <span className="text-sm">
                    {WEATHER_ICON[log.weather_condition]}
                  </span>
                )}
                {log.sqft_completed && (
                  <span className="bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded-full">
                    {log.sqft_completed.toLocaleString()} sqft
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">{log.work_summary}</p>
              {(log.issues || log.materials_used) && (
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {log.issues && (
                    <div className="bg-red-50 rounded p-2 text-xs text-red-700">
                      <span className="font-semibold">Issues: </span>
                      {log.issues}
                    </div>
                  )}
                  {log.materials_used && (
                    <div className="bg-amber-50 rounded p-2 text-xs text-amber-700">
                      <span className="font-semibold">Materials: </span>
                      {log.materials_used}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// TAB: DELIVERIES
// ══════════════════════════════════════════════════════════════════════════

function DeliveriesTab() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [jobSites, setJobSites] = useState<JobSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const [delivDate, setDelivDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [jobName, setJobName] = useState("");
  const [vendor, setVendor] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [items, setItems] = useState("");
  const [status, setStatus] = useState<DeliveryStatus>("delivered");
  const [notes, setNotes] = useState("");
  const [receivedBy, setReceivedBy] = useState("");

  // Filter
  const [filterText, setFilterText] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const fetchDeliveries = useCallback(async () => {
    if (isLocal) {
      setDeliveries(getLocalDeliveries());
      setJobSites(getLocalSites());
      setLoading(false);
      return;
    }
    const [delivRes, sitesRes] = await Promise.all([
      supabase
        .from("deliveries")
        .select("*")
        .order("delivery_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("job_sites")
        .select("*")
        .eq("status", "active")
        .order("name"),
    ]);
    if (delivRes.data) setDeliveries(delivRes.data);
    if (sitesRes.data) setJobSites(sitesRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!vendor.trim() || !items.trim()) return;
    setSubmitting(true);

    if (isLocal) {
      const newDelivery: Delivery = {
        id: nextLocalId(),
        delivery_date: delivDate,
        job_name: jobName || null,
        vendor: vendor.trim(),
        po_number: poNumber.trim() || null,
        items_received: items.trim(),
        status,
        condition_notes: notes.trim() || null,
        received_by: receivedBy.trim() || null,
        created_at: new Date().toISOString(),
      };
      const existing = getLocalDeliveries();
      existing.unshift(newDelivery);
      saveLocalDeliveries(existing);
    } else {
      await supabase.from("deliveries").insert({
        delivery_date: delivDate,
        job_name: jobName || null,
        vendor: vendor.trim(),
        po_number: poNumber.trim() || null,
        items_received: items.trim(),
        status,
        condition_notes: notes.trim() || null,
        received_by: receivedBy.trim() || null,
      });

      // Cross-post to NAF
      const statusLabels: Record<string, string> = {
        delivered: "Delivered",
        partial: "Partial",
        damaged: "Damaged",
        scheduled: "Scheduled",
        cancelled: "Cancelled",
      };
      await supabase.from("naf_entries").insert({
        entry_type: "delivery",
        body: `${statusLabels[status]} from ${vendor.trim()}: ${items.trim()}${notes.trim() ? `\nNotes: ${notes.trim()}` : ""}`,
        job_name: jobName || null,
        metadata: {
          vendor: vendor.trim(),
          po_number: poNumber.trim() || null,
          status,
          received_by: receivedBy.trim() || null,
        },
      });
    }

    setVendor("");
    setPoNumber("");
    setItems("");
    setNotes("");
    setReceivedBy("");
    setStatus("delivered");
    setSuccessMsg("Delivery logged!");
    setTimeout(() => setSuccessMsg(""), 3000);
    fetchDeliveries();
    setSubmitting(false);
  }

  const filteredDeliveries = deliveries.filter((d) => {
    if (filterStatus !== "all" && d.status !== filterStatus) return false;
    if (filterText) {
      const q = filterText.toLowerCase();
      return (
        d.vendor.toLowerCase().includes(q) ||
        d.items_received.toLowerCase().includes(q) ||
        (d.job_name && d.job_name.toLowerCase().includes(q)) ||
        (d.po_number && d.po_number.toLowerCase().includes(q))
      );
    }
    return true;
  });

  if (loading)
    return (
      <div className="py-12 text-center text-gray-400 text-sm">
        Loading deliveries...
      </div>
    );

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="font-semibold text-base mb-4">Log a Delivery</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date
              </label>
              <input
                type="date"
                value={delivDate}
                onChange={(e) => setDelivDate(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Job / Site
              </label>
              <input
                type="text"
                placeholder="Smith Residence"
                value={jobName}
                onChange={(e) => setJobName(e.target.value)}
                list="delivery-job-sites"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
              />
              <datalist id="delivery-job-sites">
                {jobSites.map((s) => (
                  <option key={s.id} value={s.name} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Vendor <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="SYNLawn, FieldTurf..."
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                PO #
              </label>
              <input
                type="text"
                placeholder="PO-2026-042"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Items Received <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={2}
              placeholder="8 rolls Pet Turf 80oz, 24 bags Zeofill infill, 6 tubes adhesive..."
              value={items}
              onChange={(e) => setItems(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as DeliveryStatus)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="delivered">Delivered — Full</option>
                <option value="partial">Partial — Short on items</option>
                <option value="damaged">Damaged</option>
                <option value="scheduled">Scheduled (not yet arrived)</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Received By
              </label>
              <input
                type="text"
                placeholder="Crew member name"
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Condition Notes
              </label>
              <input
                type="text"
                placeholder="Torn packaging, wrong spec..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting || !vendor.trim() || !items.trim()}
              className="bg-green-700 hover:bg-green-800 text-white font-semibold px-6 py-2.5 rounded-lg text-sm disabled:opacity-50 transition-colors"
            >
              {submitting ? "Logging..." : "Log Delivery"}
            </button>
            {successMsg && (
              <span className="text-green-600 text-sm font-medium">
                {successMsg}
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1">
          {[
            { key: "all", label: "All" },
            { key: "delivered", label: "Delivered" },
            { key: "partial", label: "Partial" },
            { key: "damaged", label: "Damaged" },
            { key: "scheduled", label: "Scheduled" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilterStatus(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filterStatus === f.key
                  ? "bg-green-700 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search deliveries..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-green-500 ml-auto dark:bg-gray-700 dark:text-white"
        />
      </div>

      {/* List */}
      {filteredDeliveries.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-400 text-sm">
          {filterText || filterStatus !== "all"
            ? "No matching deliveries found."
            : "No deliveries logged yet."}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDeliveries.map((d) => (
            <div
              key={d.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">
                    {formatDate(d.delivery_date)}
                  </span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {d.vendor}
                  </span>
                  {d.job_name && (
                    <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                      {d.job_name}
                    </span>
                  )}
                  {d.po_number && (
                    <span className="text-xs text-gray-400">
                      PO: {d.po_number}
                    </span>
                  )}
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                    STATUS_STYLE[d.status]
                  }`}
                >
                  {d.status.charAt(0).toUpperCase() + d.status.slice(1)}
                </span>
              </div>
              <p className="mt-1.5 text-sm text-gray-700 dark:text-gray-300">
                {d.items_received}
              </p>
              {(d.condition_notes || d.received_by) && (
                <div className="mt-1.5 flex gap-3 text-xs text-gray-400">
                  {d.received_by && (
                    <span>Received by: {d.received_by}</span>
                  )}
                  {d.condition_notes && (
                    <span className="text-red-500">
                      {d.condition_notes}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// TAB: CHECKLISTS
// ══════════════════════════════════════════════════════════════════════════

const CHECKLIST_LABELS: Record<ChecklistType, string> = {
  site_prep: "Site Prep",
  safety: "Safety",
  final_walkthrough: "Final Walkthrough",
};

function ChecklistsTab() {
  const [activeType, setActiveType] = useState<ChecklistType>("site_prep");
  const [jobSites, setJobSites] = useState<JobSite[]>([]);
  const [jobName, setJobName] = useState("");
  const [checkedBy, setCheckedBy] = useState("");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [completionMsg, setCompletionMsg] = useState("");

  useEffect(() => {
    if (isLocal) {
      setJobSites(getLocalSites());
    } else {
      async function loadSites() {
        const { data } = await supabase
          .from("job_sites")
          .select("*")
          .eq("status", "active")
          .order("name");
        if (data) setJobSites(data);
      }
      loadSites();
    }
  }, []);

  const items = CHECKLISTS[activeType];
  const completedCount = items.filter((item) => checked[item]).length;

  async function handleCheck(item: string) {
    const isNowChecked = !checked[item];
    setChecked((prev) => ({ ...prev, [item]: isNowChecked }));

    if (isNowChecked && jobName.trim()) {
      setSaving(item);
      if (!isLocal) {
        await supabase.from("checklist_items").insert({
          job_name: jobName.trim(),
          checklist_type: activeType,
          item_label: item,
          checked_by: checkedBy.trim() || null,
          checked_at: new Date().toISOString(),
        });
      }
      setSaved((prev) => new Set(prev).add(item));
      setSaving(null);
    }
  }

  async function handleCompleteChecklist() {
    if (!jobName.trim()) return;
    const msg = `${CHECKLIST_LABELS[activeType]} checklist completed for ${jobName.trim()} — ${completedCount}/${items.length} items checked${checkedBy ? ` by ${checkedBy}` : ""}`;

    if (!isLocal) {
      await supabase.from("naf_entries").insert({
        entry_type: "checklist",
        body: msg,
        job_name: jobName.trim(),
        metadata: {
          checklist_type: activeType,
          completed_count: completedCount,
          total_count: items.length,
          checked_by: checkedBy || null,
        },
      });
    }
    setCompletionMsg("Checklist completion posted!");
    setTimeout(() => setCompletionMsg(""), 3000);
  }

  function switchType(t: ChecklistType) {
    setActiveType(t);
    setChecked({});
    setSaved(new Set());
    setCompletionMsg("");
  }

  const LABELS: Record<ChecklistType, string> = {
    site_prep: `${CHECKLIST_LABELS.site_prep}`,
    safety: `${CHECKLIST_LABELS.safety}`,
    final_walkthrough: `${CHECKLIST_LABELS.final_walkthrough}`,
  };

  return (
    <div className="space-y-4">
      {/* Job + person */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Job / Site
            </label>
            <input
              type="text"
              placeholder="Smith Residence (required to save)"
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
              list="checklist-job-sites"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
            />
            <datalist id="checklist-job-sites">
              {jobSites.map((s) => (
                <option key={s.id} value={s.name} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Checked By
            </label>
            <input
              type="text"
              placeholder="Your name"
              value={checkedBy}
              onChange={(e) => setCheckedBy(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
        {!jobName.trim() && (
          <p className="text-xs text-amber-600 mt-2">
            Enter a job name to save checked items.
          </p>
        )}
      </div>

      {/* Checklist type tabs */}
      <div className="flex gap-2">
        {(Object.keys(CHECKLISTS) as ChecklistType[]).map((t) => (
          <button
            key={t}
            onClick={() => switchType(t)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeType === t
                ? "bg-green-700 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {LABELS[t]}
          </button>
        ))}
      </div>

      {/* Progress + items */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold">{LABELS[activeType]}</span>
          <span className="text-sm text-gray-500">
            {completedCount}/{items.length} complete
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-gray-100 rounded-full mb-4">
          <div
            className="h-2 bg-green-600 rounded-full transition-all duration-300"
            style={{
              width: `${(completedCount / items.length) * 100}%`,
            }}
          />
        </div>

        <div className="space-y-2">
          {items.map((item) => {
            const isChecked = !!checked[item];
            const isSaving = saving === item;
            const isSaved = saved.has(item);
            return (
              <button
                key={item}
                onClick={() => handleCheck(item)}
                className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                  isChecked
                    ? "bg-green-50 border-green-200 text-green-800"
                    : "bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50"
                }`}
              >
                <div
                  className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center shrink-0 border-2 transition-colors ${
                    isChecked
                      ? "bg-green-600 border-green-600"
                      : "border-gray-300"
                  }`}
                >
                  {isChecked && (
                    <span className="text-white text-xs">✓</span>
                  )}
                </div>
                <span
                  className={`text-sm flex-1 ${
                    isChecked ? "line-through text-green-600" : ""
                  }`}
                >
                  {item}
                </span>
                {isSaving && (
                  <span className="text-xs text-gray-400 shrink-0">
                    saving...
                  </span>
                )}
                {isSaved && !isSaving && (
                  <span className="text-xs text-green-500 shrink-0">
                    saved
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {completedCount === items.length && (
          <div className="mt-4 space-y-2">
            <div className="bg-green-100 rounded-lg p-3 text-center text-green-800 font-semibold text-sm">
              {LABELS[activeType]} checklist complete!
            </div>
            {jobName.trim() && (
              <button
                onClick={handleCompleteChecklist}
                className="w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-2 rounded-lg text-sm transition-colors"
              >
                Post Completion to Feed
              </button>
            )}
            {completionMsg && (
              <p className="text-center text-green-600 text-sm font-medium">{completionMsg}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// QUICK CAPTURE MODAL
// ══════════════════════════════════════════════════════════════════════════

type CaptureType = "photo" | "video" | "voice" | "upload" | "text";

interface QuickCapture {
  type: CaptureType;
  file: File | null;
  text: string;
  job: string;
}

function QuickCaptureBar() {
  const [open, setOpen] = useState(false);
  const [capture, setCapture] = useState<QuickCapture>({ type: "text", file: null, text: "", job: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const voiceRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  function openCapture(type: CaptureType) {
    setCapture({ type, file: null, text: "", job: "" });
    setOpen(true);
    // Immediately trigger file picker for media types
    setTimeout(() => {
      if (type === "photo" && photoRef.current) photoRef.current.click();
      if (type === "video" && videoRef.current) videoRef.current.click();
      if (type === "voice" && voiceRef.current) voiceRef.current.click();
      if (type === "upload" && uploadRef.current) uploadRef.current.click();
    }, 100);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setCapture((prev) => ({ ...prev, file: f }));
    e.target.value = "";
  }

  async function handleSave() {
    if (!capture.text.trim() && !capture.file) return;
    setSaving(true);
    try {
      const body = capture.text.trim() || (capture.file ? capture.file.name : "");
      const entryType = capture.type === "photo" ? "photo"
        : capture.type === "video" ? "photo"
        : capture.type === "voice" ? "voice_memo"
        : "general";

      if (!isLocal && supabase) {
        const { data: entry } = await supabase.from("naf_entries").insert({
          entry_type: entryType,
          body,
          job_name: capture.job || null,
          metadata: { source: "quick_capture", capture_type: capture.type },
        }).select().single();

        if (entry && capture.file) {
          const reader = new FileReader();
          const dataUrl = await new Promise<string>((res) => {
            reader.onload = () => res(reader.result as string);
            reader.readAsDataURL(capture.file!);
          });
          await supabase.from("naf_attachments").insert({
            entry_id: entry.id,
            file_type: entryType,
            file_name: capture.file.name,
            file_url: dataUrl,
            file_size: capture.file.size,
            mime_type: capture.file.type,
          });
        }
      } else {
        // Local mode
        const LS_NAF = "naf_local_entries";
        const existing = (() => { try { return JSON.parse(localStorage.getItem(LS_NAF) || "[]"); } catch { return []; } })();
        existing.unshift({
          id: `local-qc-${Date.now()}`,
          entry_type: entryType,
          body,
          job_name: capture.job || null,
          metadata: { source: "quick_capture" },
          pinned: false,
          created_at: new Date().toISOString(),
          naf_attachments: [],
        });
        localStorage.setItem(LS_NAF, JSON.stringify(existing));
      }

      setSaved(true);
      setTimeout(() => { setSaved(false); setOpen(false); }, 1500);
    } finally {
      setSaving(false);
    }
  }

  const CAPTURE_BTNS: { type: CaptureType; icon: string; label: string; color: string; bg: string; accept?: string }[] = [
    { type: "photo", icon: "📷", label: "Photo", color: "text-pink-700", bg: "bg-pink-50 border-pink-200 hover:bg-pink-100", accept: "image/*" },
    { type: "video", icon: "🎥", label: "Video", color: "text-purple-700", bg: "bg-purple-50 border-purple-200 hover:bg-purple-100", accept: "video/*" },
    { type: "voice", icon: "🎙️", label: "Voice", color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200 hover:bg-indigo-100", accept: "audio/*" },
    { type: "upload", icon: "📁", label: "Upload", color: "text-teal-700", bg: "bg-teal-50 border-teal-200 hover:bg-teal-100" },
    { type: "text", icon: "✏️", label: "Quick Note", color: "text-gray-700", bg: "bg-gray-100 border-gray-300 hover:bg-gray-200" },
  ];

  return (
    <>
      {/* Hidden file inputs */}
      <input ref={photoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
      <input ref={videoRef} type="file" accept="video/*" capture="environment" className="hidden" onChange={handleFile} />
      <input ref={voiceRef} type="file" accept="audio/*" className="hidden" onChange={handleFile} />
      <input ref={uploadRef} type="file" className="hidden" onChange={handleFile} />

      {/* Quick capture bar */}
      <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Quick Capture</p>
        <div className="grid grid-cols-5 gap-2">
          {CAPTURE_BTNS.map((btn) => (
            <button
              key={btn.type}
              onClick={() => openCapture(btn.type)}
              className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border transition-all ${btn.bg}`}
            >
              <span className="text-2xl">{btn.icon}</span>
              <span className={`text-xs font-semibold ${btn.color}`}>{btn.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-4 pb-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{CAPTURE_BTNS.find(b => b.type === capture.type)?.icon}</span>
                <div>
                  <h3 className="font-bold text-gray-900">{CAPTURE_BTNS.find(b => b.type === capture.type)?.label}</h3>
                  <p className="text-xs text-gray-400">Quick capture to field log</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
            </div>

            <div className="p-5 space-y-4">
              {/* File preview */}
              {capture.file && (
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 flex items-center gap-3">
                  <div className="text-2xl">
                    {capture.file.type.startsWith("image/") ? "📸"
                      : capture.file.type.startsWith("video/") ? "🎬"
                      : capture.file.type.startsWith("audio/") ? "🎙️"
                      : "📎"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{capture.file.name}</p>
                    <p className="text-xs text-gray-400">{(capture.file.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button
                    onClick={() => setCapture(prev => ({ ...prev, file: null }))}
                    className="text-gray-400 hover:text-red-500 text-sm"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Add/change file for media types */}
              {capture.type !== "text" && (
                <button
                  onClick={() => {
                    if (capture.type === "photo" && photoRef.current) photoRef.current.click();
                    if (capture.type === "video" && videoRef.current) videoRef.current.click();
                    if (capture.type === "voice" && voiceRef.current) voiceRef.current.click();
                    if (capture.type === "upload" && uploadRef.current) uploadRef.current.click();
                  }}
                  className="w-full py-2 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-green-400 hover:text-green-600 transition-colors"
                >
                  {capture.file ? "Replace file" : "Tap to attach from phone"}
                </button>
              )}

              {/* Note text */}
              <textarea
                value={capture.text}
                onChange={(e) => setCapture(prev => ({ ...prev, text: e.target.value }))}
                placeholder="Add a note... (optional)"
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
              />

              {/* Job site */}
              <input
                value={capture.job}
                onChange={(e) => setCapture(prev => ({ ...prev, job: e.target.value }))}
                placeholder="Job site (optional)"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />

              {/* Save button */}
              {saved ? (
                <div className="w-full py-3 bg-green-100 text-green-700 rounded-xl text-sm font-bold text-center">
                  ✅ Saved to feed!
                </div>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={saving || (!capture.text.trim() && !capture.file)}
                  className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-bold disabled:opacity-40 transition-colors"
                >
                  {saving ? "Saving…" : "Save to Field Log"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// PAGE
// ══════════════════════════════════════════════════════════════════════════

const TABS = [
  { id: "notes", label: "📝 Notes" },
  { id: "deliveries", label: "📦 Deliveries" },
  { id: "checklists", label: "✅ Checklists" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function NotepadPage() {
  const [active, setActive] = useState<TabId>("notes");

  // Support ?tab=deliveries URL param
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab === "deliveries") setActive("deliveries");
      else if (tab === "checklists") setActive("checklists");
    }
  }, []);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Field Notepad</h1>
          <p className="text-sm text-gray-500">Capture notes, deliveries, media, and checklists</p>
        </div>
      </div>

      {/* Quick Capture Bar */}
      <QuickCaptureBar />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`px-4 py-2.5 rounded-t-xl text-sm font-medium transition-colors border-b-2 ${
              active === tab.id
                ? "border-green-600 text-green-700 bg-green-50"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {active === "notes" && <NotesTab />}
      {active === "deliveries" && <DeliveriesTab />}
      {active === "checklists" && <ChecklistsTab />}
    </div>
  );
}
