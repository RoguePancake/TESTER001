"use client";

import { useEffect, useState, useCallback } from "react";
import {
  supabase,
  type DailyLog,
  type Delivery,
  type JobSite,
} from "@/lib/supabase";

// ── Constants ─────────────────────────────────────────────────────────────

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
    if (!supabase) {
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      const nowIso = new Date().toISOString();
      setJobSites([
        { id: "site-1", name: "Rivera Backyard", address: null, client_name: "Rivera", status: "active", notes: null, created_at: nowIso },
        { id: "site-2", name: "Lakeside HOA Dog Run", address: null, client_name: "Lakeside HOA", status: "active", notes: null, created_at: nowIso },
      ]);
      setLogs([
        { id: "log-1", log_date: today, job_name: "Rivera Backyard", weather_condition: "Sunny", work_summary: "Final turf roll-out and seam brush-in completed.", issues: null, materials_used: "Infill silica, seam tape", sqft_completed: 620, created_at: nowIso },
        { id: "log-2", log_date: yesterday, job_name: "Lakeside HOA Dog Run", weather_condition: "Cloudy", work_summary: "Sub-base grading and compaction done.", issues: "Low spot near drain corrected", materials_used: "Class II base", sqft_completed: 1100, created_at: nowIso },
      ]);
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
    if (!workSummary.trim() || !supabase) return;
    setSubmitting(true);

    // Save to daily_logs
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

    setWorkSummary("");
    setIssues("");
    setMaterials("");
    setSqft("");
    setSuccessMsg("Note saved & posted to NAF!");
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h3 className="font-semibold text-base mb-4">New Field Note</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job / Site
              </label>
              <input
                type="text"
                placeholder="e.g. Johnson Backyard"
                value={jobName}
                onChange={(e) => setJobName(e.target.value)}
                list="notepad-job-sites"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <datalist id="notepad-job-sites">
                {jobSites.map((s) => (
                  <option key={s.id} value={s.name} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Weather
              </label>
              <select
                value={weather}
                onChange={(e) => setWeather(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Work Summary <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="What did the crew accomplish today?"
              value={workSummary}
              onChange={(e) => setWorkSummary(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Issues
              </label>
              <textarea
                rows={2}
                placeholder="Problems, delays, access issues..."
                value={issues}
                onChange={(e) => setIssues(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Materials Used
              </label>
              <textarea
                rows={2}
                placeholder="Turf rolls, infill bags, adhesive..."
                value={materials}
                onChange={(e) => setMaterials(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              />
            </div>
          </div>
          <div className="flex items-end gap-4">
            <div className="w-40">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sqft Completed
              </label>
              <input
                type="number"
                placeholder="850"
                min={0}
                value={sqft}
                onChange={(e) => setSqft(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <button
              type="submit"
              disabled={submitting || !workSummary.trim()}
              className="bg-green-700 hover:bg-green-800 text-white font-semibold px-6 py-2.5 rounded-lg text-sm disabled:opacity-50 transition-colors"
            >
              {submitting ? "Saving..." : "💾 Save Note"}
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
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {/* List */}
      {filteredLogs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
          {filterText
            ? "No matching notes found."
            : "No field notes yet. Submit your first note above."}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
            >
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-semibold text-gray-900">
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
              <p className="text-sm text-gray-700">{log.work_summary}</p>
              {(log.issues || log.materials_used) && (
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {log.issues && (
                    <div className="bg-red-50 rounded p-2 text-xs text-red-700">
                      <span className="font-semibold">⚠️ Issues: </span>
                      {log.issues}
                    </div>
                  )}
                  {log.materials_used && (
                    <div className="bg-amber-50 rounded p-2 text-xs text-amber-700">
                      <span className="font-semibold">📦 Materials: </span>
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
    if (!supabase) {
      const today = new Date().toISOString().split("T")[0];
      const nowIso = new Date().toISOString();
      setJobSites([
        { id: "site-1", name: "Rivera Backyard", address: null, client_name: "Rivera", status: "active", notes: null, created_at: nowIso },
        { id: "site-2", name: "Lakeside HOA Dog Run", address: null, client_name: "Lakeside HOA", status: "active", notes: null, created_at: nowIso },
      ]);
      setDeliveries([
        { id: "del-1", delivery_date: today, job_name: "Rivera Backyard", vendor: "SYNLawn", po_number: "PO-2026-042", items_received: "2 turf rolls + seam tape", status: "delivered", condition_notes: null, received_by: "Alex Rivera", created_at: nowIso },
        { id: "del-2", delivery_date: today, job_name: "Lakeside HOA Dog Run", vendor: "BaseCo", po_number: null, items_received: "5 tons Class II base", status: "scheduled", condition_notes: "ETA 2:30 PM", received_by: null, created_at: nowIso },
      ]);
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
    if (!vendor.trim() || !items.trim() || !supabase) return;
    setSubmitting(true);

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
      delivered: "✅ Delivered",
      partial: "⚠️ Partial",
      damaged: "🚨 Damaged",
      scheduled: "📅 Scheduled",
      cancelled: "❌ Cancelled",
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

    setVendor("");
    setPoNumber("");
    setItems("");
    setNotes("");
    setReceivedBy("");
    setStatus("delivered");
    setSuccessMsg("Delivery logged & posted to NAF!");
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h3 className="font-semibold text-base mb-4">Log a Delivery</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={delivDate}
                onChange={(e) => setDelivDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job / Site
              </label>
              <input
                type="text"
                placeholder="Smith Residence"
                value={jobName}
                onChange={(e) => setJobName(e.target.value)}
                list="delivery-job-sites"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <datalist id="delivery-job-sites">
                {jobSites.map((s) => (
                  <option key={s.id} value={s.name} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vendor <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="SYNLawn, FieldTurf..."
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PO #
              </label>
              <input
                type="text"
                placeholder="PO-2026-042"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Items Received <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={2}
              placeholder="8 rolls Pet Turf 80oz, 24 bags Zeofill infill, 6 tubes adhesive..."
              value={items}
              onChange={(e) => setItems(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as DeliveryStatus)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="delivered">✅ Delivered — Full</option>
                <option value="partial">⚠️ Partial — Short on items</option>
                <option value="damaged">🚨 Damaged</option>
                <option value="scheduled">
                  📅 Scheduled (not yet arrived)
                </option>
                <option value="cancelled">❌ Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Received By
              </label>
              <input
                type="text"
                placeholder="Crew member name"
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Condition Notes
              </label>
              <input
                type="text"
                placeholder="Torn packaging, wrong spec..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting || !vendor.trim() || !items.trim()}
              className="bg-green-700 hover:bg-green-800 text-white font-semibold px-6 py-2.5 rounded-lg text-sm disabled:opacity-50 transition-colors"
            >
              {submitting ? "Logging..." : "📦 Log Delivery"}
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
            { key: "delivered", label: "✅ Delivered" },
            { key: "partial", label: "⚠️ Partial" },
            { key: "damaged", label: "🚨 Damaged" },
            { key: "scheduled", label: "📅 Scheduled" },
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
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-green-500 ml-auto"
        />
      </div>

      {/* List */}
      {filteredDeliveries.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
          {filterText || filterStatus !== "all"
            ? "No matching deliveries found."
            : "No deliveries logged yet."}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDeliveries.map((d) => (
            <div
              key={d.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">
                    {formatDate(d.delivery_date)}
                  </span>
                  <span className="font-medium text-gray-700">
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
              <p className="mt-1.5 text-sm text-gray-700">
                {d.items_received}
              </p>
              {(d.condition_notes || d.received_by) && (
                <div className="mt-1.5 flex gap-3 text-xs text-gray-400">
                  {d.received_by && (
                    <span>Received by: {d.received_by}</span>
                  )}
                  {d.condition_notes && (
                    <span className="text-red-500">
                      ⚠️ {d.condition_notes}
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

function ChecklistsTab() {
  const [activeType, setActiveType] = useState<ChecklistType>("site_prep");
  const [jobSites, setJobSites] = useState<JobSite[]>([]);
  const [jobName, setJobName] = useState("");
  const [checkedBy, setCheckedBy] = useState("");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function loadSites() {
      if (!supabase) return;
      const { data } = await supabase
        .from("job_sites")
        .select("*")
        .eq("status", "active")
        .order("name");
      if (data) setJobSites(data);
    }
    loadSites();
  }, []);

  const items = CHECKLISTS[activeType];
  const completedCount = items.filter((item) => checked[item]).length;

  async function handleCheck(item: string) {
    if (!supabase) return;
    const isNowChecked = !checked[item];
    setChecked((prev) => ({ ...prev, [item]: isNowChecked }));

    if (isNowChecked && jobName.trim()) {
      setSaving(item);
      await supabase.from("checklist_items").insert({
        job_name: jobName.trim(),
        checklist_type: activeType,
        item_label: item,
        checked_by: checkedBy.trim() || null,
        checked_at: new Date().toISOString(),
      });
      setSaved((prev) => new Set(prev).add(item));
      setSaving(null);
    }
  }

  async function handleCompleteChecklist() {
    if (!supabase || !jobName.trim()) return;
    // Post checklist completion to NAF
    await supabase.from("naf_entries").insert({
      entry_type: "checklist",
      body: `${LABELS[activeType]} checklist completed for ${jobName.trim()} — ${completedCount}/${items.length} items checked${checkedBy ? ` by ${checkedBy}` : ""}`,
      job_name: jobName.trim(),
      metadata: {
        checklist_type: activeType,
        completed_count: completedCount,
        total_count: items.length,
        checked_by: checkedBy || null,
      },
    });
  }

  function switchType(t: ChecklistType) {
    setActiveType(t);
    setChecked({});
    setSaved(new Set());
  }

  const LABELS: Record<ChecklistType, string> = {
    site_prep: "🏗️ Site Prep",
    safety: "🦺 Safety",
    final_walkthrough: "✅ Final Walkthrough",
  };

  return (
    <div className="space-y-4">
      {/* Job + person */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Job / Site
            </label>
            <input
              type="text"
              placeholder="Smith Residence (required to save)"
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
              list="checklist-job-sites"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <datalist id="checklist-job-sites">
              {jobSites.map((s) => (
                <option key={s.id} value={s.name} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Checked By
            </label>
            <input
              type="text"
              placeholder="Your name"
              value={checkedBy}
              onChange={(e) => setCheckedBy(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>
        {!jobName.trim() && (
          <p className="text-xs text-amber-600 mt-2">
            Enter a job name to save checked items to the database.
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
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
                    : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
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
              🎉 {LABELS[activeType]} checklist complete!
            </div>
            {jobName.trim() && (
              <button
                onClick={handleCompleteChecklist}
                className="w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-2 rounded-lg text-sm transition-colors"
              >
                📋 Post Completion to NAF Feed
              </button>
            )}
          </div>
        )}
      </div>
    </div>
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
      {!supabase && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Demo mode: Supabase is not connected. You can review full Notepad/Delivery layout with sample records.
        </div>
      )}
      <h1 className="text-2xl font-bold text-gray-900">📋 Notepad</h1>

      <div className="flex gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              active === tab.id
                ? "bg-green-700 text-white shadow-sm"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
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
