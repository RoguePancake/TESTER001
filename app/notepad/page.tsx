"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase, type DailyLog } from "@/lib/supabase";

const WEATHER_OPTIONS = ["Sunny", "Cloudy", "Rainy", "Windy", "Hot", "Overcast"];

function formatLogDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

const WEATHER_ICON: Record<string, string> = {
  Sunny: "☀️",
  Cloudy: "⛅",
  Rainy: "🌧️",
  Windy: "💨",
  Hot: "🌡️",
  Overcast: "🌥️",
};

export default function NotepadPage() {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Form state
  const [logDate, setLogDate] = useState(new Date().toISOString().split("T")[0]);
  const [jobName, setJobName] = useState("");
  const [weather, setWeather] = useState("");
  const [workSummary, setWorkSummary] = useState("");
  const [issues, setIssues] = useState("");
  const [materials, setMaterials] = useState("");
  const [sqft, setSqft] = useState("");

  const fetchLogs = useCallback(async () => {
    const { data } = await supabase
      .from("daily_logs")
      .select("*")
      .order("log_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setLogs(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!workSummary.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("daily_logs").insert({
      log_date: logDate,
      job_name: jobName || null,
      weather_condition: weather || null,
      work_summary: workSummary.trim(),
      issues: issues.trim() || null,
      materials_used: materials.trim() || null,
      sqft_completed: sqft ? parseInt(sqft, 10) : null,
    });
    if (!error) {
      // Reset form
      setWorkSummary("");
      setIssues("");
      setMaterials("");
      setSqft("");
      setSuccessMsg("Note saved!");
      setTimeout(() => setSuccessMsg(""), 3000);
      fetchLogs();
    }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Loading field notes…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">📋 Field Notepad</h1>

      {/* ── New Note Form ─────────────────────────────────────────────── */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h2 className="font-semibold text-lg mb-4">New Field Note</h2>
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
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
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
              placeholder="What did the crew accomplish today? Stages completed, footage installed, key milestones…"
              value={workSummary}
              onChange={(e) => setWorkSummary(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Issues Encountered
              </label>
              <textarea
                rows={2}
                placeholder="Problems, delays, equipment issues, access problems…"
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
                placeholder="Turf rolls, infill bags, adhesive, nails, edging…"
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
                placeholder="e.g. 850"
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
              {submitting ? "Saving…" : "💾 Save Note"}
            </button>
            {successMsg && (
              <span className="text-green-600 text-sm font-medium">{successMsg}</span>
            )}
          </div>
        </form>
      </section>

      {/* ── Recent Notes ──────────────────────────────────────────────── */}
      <section>
        <h2 className="font-semibold text-lg mb-3">Recent Notes</h2>
        {logs.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
            No field notes yet. Submit your first note above.
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">
                      {formatLogDate(log.log_date)}
                    </span>
                    {log.job_name && (
                      <span className="bg-blue-50 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
                        {log.job_name}
                      </span>
                    )}
                    {log.weather_condition && (
                      <span className="text-sm text-gray-500">
                        {WEATHER_ICON[log.weather_condition]} {log.weather_condition}
                      </span>
                    )}
                    {log.sqft_completed && (
                      <span className="bg-green-50 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
                        {log.sqft_completed.toLocaleString()} sqft
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">
                    {new Date(log.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <p className="mt-2 text-sm text-gray-700 leading-relaxed">
                  {log.work_summary}
                </p>

                {(log.issues || log.materials_used) && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {log.issues && (
                      <div className="bg-red-50 rounded-lg p-3">
                        <p className="text-xs font-semibold text-red-600 mb-1">⚠️ Issues</p>
                        <p className="text-xs text-red-700">{log.issues}</p>
                      </div>
                    )}
                    {log.materials_used && (
                      <div className="bg-amber-50 rounded-lg p-3">
                        <p className="text-xs font-semibold text-amber-600 mb-1">
                          📦 Materials Used
                        </p>
                        <p className="text-xs text-amber-700">{log.materials_used}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
