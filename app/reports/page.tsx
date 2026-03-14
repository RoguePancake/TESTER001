"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase, type Profile, type TimeEntry } from "@/lib/supabase";
import { getLocalSession } from "@/lib/local-auth";
import { isManagerOrAbove, normalizeRole } from "@/lib/engines/permissions";
import { generatePayrollSummary, exportPayrollCSV } from "@/lib/engines/payroll";
import type { PayrollLineItem } from "@/lib/engines/payroll";
import { calcDurationMinutes, formatDuration, getPendingApprovals } from "@/lib/engines/time";
import { DateRangePicker, defaultWeekRange } from "@/components/DateRangePicker";
import type { DateRange } from "@/components/DateRangePicker";

// ── localStorage helpers ──────────────────────────────────────────────────────
const LS_ENTRIES = "payclock_entries";
const LS_EMPLOYEES = "jobsite_employees";

function loadLocalEntries(): TimeEntry[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(LS_ENTRIES) ?? "[]"); } catch { return []; }
}

function loadLocalEmployees(): Profile[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(LS_EMPLOYEES) ?? "[]"); } catch { return []; }
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface JobSummaryRow {
  jobName: string;
  totalMinutes: number;
  entryCount: number;
  employees: Set<string>;
  sqft: number;
}

// ── Page component ────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [isManager, setIsManager] = useState(false);
  const [loading, setLoading] = useState(true);

  // Payroll section
  const [payrollRange, setPayrollRange] = useState<DateRange>(defaultWeekRange());
  const [payrollItems, setPayrollItems] = useState<PayrollLineItem[]>([]);
  const [payrollLoading, setPayrollLoading] = useState(false);
  const [payrollGenerated, setPayrollGenerated] = useState(false);

  // Employee timesheet section
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [tsRange, setTsRange] = useState<DateRange>(defaultWeekRange());
  const [tsEntries, setTsEntries] = useState<TimeEntry[]>([]);
  const [tsLoading, setTsLoading] = useState(false);
  const [tsGenerated, setTsGenerated] = useState(false);

  // Job summary section
  const [jobRange, setJobRange] = useState<DateRange>(defaultWeekRange());
  const [jobSummary, setJobSummary] = useState<JobSummaryRow[]>([]);
  const [jobLoading, setJobLoading] = useState(false);
  const [jobGenerated, setJobGenerated] = useState(false);

  // Pending approvals section
  const [pendingEntries, setPendingEntries] = useState<TimeEntry[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // PDF export state
  const [pdfExporting, setPdfExporting] = useState<string | null>(null);

  const isLocal = !supabase;

  // ── Auth check ───────────────────────────────────────────────────────────
  useEffect(() => {
    async function checkAuth() {
      if (isLocal) {
        const session = getLocalSession();
        if (session) setIsManager(isManagerOrAbove(normalizeRole(session.role)));
        setLoading(false);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      const { data: profile } = await supabase
        .from("profiles").select("role").eq("auth_id", session.user.id).single();
      if (profile) setIsManager(isManagerOrAbove(normalizeRole(profile.role)));
      setLoading(false);
    }
    checkAuth();
  }, [isLocal]);

  // ── Load employees for dropdown ──────────────────────────────────────────
  useEffect(() => {
    async function load() {
      if (isLocal) {
        setEmployees(loadLocalEmployees());
        return;
      }
      const { data } = await supabase
        .from("profiles").select("id, full_name, default_pay_rate, overtime_threshold")
        .eq("is_active", true).order("full_name");
      if (data) setEmployees(data as Profile[]);
    }
    load();
  }, [isLocal]);

  // ── Load pending approvals ───────────────────────────────────────────────
  const loadPendingApprovals = useCallback(async () => {
    setPendingLoading(true);
    try {
      if (isLocal) {
        const all = loadLocalEntries();
        setPendingEntries(all.filter((e) => e.status === "pending" && e.clock_out));
      } else {
        const entries = await getPendingApprovals();
        setPendingEntries(entries as TimeEntry[]);
      }
    } finally {
      setPendingLoading(false);
    }
  }, [isLocal]);

  useEffect(() => { loadPendingApprovals(); }, [loadPendingApprovals]);

  // ── Payroll generation ───────────────────────────────────────────────────
  async function handleGeneratePayroll() {
    setPayrollLoading(true);
    setPayrollGenerated(false);
    try {
      if (isLocal) {
        // Local mode: compute from localStorage
        const all = loadLocalEntries().filter((e) => !!e.clock_out);
        const inRange = all.filter((e) => {
          const d = e.clock_in.split("T")[0];
          return d >= payrollRange.start && d <= payrollRange.end;
        });
        const byEmployee: Record<string, { name: string; mins: number; count: number }> = {};
        for (const e of inRange) {
          const uid = e.user_id;
          if (!byEmployee[uid]) {
            byEmployee[uid] = { name: (e.profiles as { full_name?: string } | undefined)?.full_name ?? uid, mins: 0, count: 0 };
          }
          byEmployee[uid].mins += calcDurationMinutes(e.clock_in, e.clock_out ?? undefined, e.break_minutes ?? 0);
          byEmployee[uid].count += 1;
        }
        const items: PayrollLineItem[] = Object.entries(byEmployee).map(([id, d]) => {
          const regMins = Math.min(d.mins, 2400);
          const otMins = Math.max(0, d.mins - 2400);
          const rate = 0;
          return {
            employee_id: id, full_name: d.name, email: null, employment_type: "employee",
            regular_hours: Math.round(regMins / 60 * 100) / 100,
            overtime_hours: Math.round(otMins / 60 * 100) / 100,
            regular_rate: rate, overtime_rate: rate * 1.5, gross_pay: 0,
            entries_count: d.count, status: "draft",
          };
        });
        setPayrollItems(items);
      } else {
        const items = await generatePayrollSummary({ period_start: payrollRange.start, period_end: payrollRange.end });
        setPayrollItems(items);
      }
      setPayrollGenerated(true);
    } finally {
      setPayrollLoading(false);
    }
  }

  function handleExportPayrollCSV() {
    if (payrollItems.length === 0) return;
    const csv = exportPayrollCSV(payrollItems, payrollRange.start, payrollRange.end);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll_${payrollRange.start}_${payrollRange.end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleExportPayrollPDF() {
    if (payrollItems.length === 0) return;
    setPdfExporting("payroll");
    try {
      const { downloadPayrollSummaryPDF } = await import("@/lib/engines/pdf");
      await downloadPayrollSummaryPDF({ items: payrollItems, periodStart: payrollRange.start, periodEnd: payrollRange.end });
    } finally {
      setPdfExporting(null);
    }
  }

  // ── Employee timesheet ───────────────────────────────────────────────────
  async function handleGenerateEmployeeTS() {
    if (!selectedEmployeeId) return;
    setTsLoading(true);
    setTsGenerated(false);
    try {
      if (isLocal) {
        const all = loadLocalEntries().filter(
          (e) => !!e.clock_out && e.user_id === selectedEmployeeId &&
          e.clock_in.split("T")[0] >= tsRange.start && e.clock_in.split("T")[0] <= tsRange.end
        );
        setTsEntries(all);
      } else {
        const { data } = await supabase
          .from("time_entries").select("*, profiles(full_name)")
          .eq("user_id", selectedEmployeeId)
          .not("clock_out", "is", null)
          .gte("clock_in", `${tsRange.start}T00:00:00`)
          .lte("clock_in", `${tsRange.end}T23:59:59`)
          .order("clock_in");
        setTsEntries((data ?? []) as TimeEntry[]);
      }
      setTsGenerated(true);
    } finally {
      setTsLoading(false);
    }
  }

  async function handleExportEmployeePDF() {
    if (tsEntries.length === 0) return;
    const emp = employees.find((e) => e.id === selectedEmployeeId);
    if (!emp) return;
    setPdfExporting("employee");
    try {
      const { downloadTimesheetPDF } = await import("@/lib/engines/pdf");
      const totalMins = tsEntries.reduce(
        (sum, e) => sum + calcDurationMinutes(e.clock_in, e.clock_out ?? undefined, e.break_minutes ?? 0), 0
      );
      const otThresholdMins = (emp.overtime_threshold ?? 40) * 60;
      const regularMins = Math.min(totalMins, otThresholdMins);
      const overtimeMins = Math.max(0, totalMins - otThresholdMins);
      await downloadTimesheetPDF({
        employeeName: emp.full_name,
        periodStart: tsRange.start,
        periodEnd: tsRange.end,
        entries: tsEntries,
        regularHours: Math.round(regularMins / 60 * 100) / 100,
        overtimeHours: Math.round(overtimeMins / 60 * 100) / 100,
        payRate: emp.default_pay_rate ?? undefined,
      });
    } finally {
      setPdfExporting(null);
    }
  }

  // ── Job summary ──────────────────────────────────────────────────────────
  async function handleGenerateJobSummary() {
    setJobLoading(true);
    setJobGenerated(false);
    try {
      let rawEntries: TimeEntry[] = [];
      if (isLocal) {
        rawEntries = loadLocalEntries().filter(
          (e) => !!e.clock_out &&
          e.clock_in.split("T")[0] >= jobRange.start &&
          e.clock_in.split("T")[0] <= jobRange.end
        );
      } else {
        const { data } = await supabase
          .from("time_entries").select("*, profiles(full_name)")
          .not("clock_out", "is", null)
          .gte("clock_in", `${jobRange.start}T00:00:00`)
          .lte("clock_in", `${jobRange.end}T23:59:59`);
        rawEntries = (data ?? []) as TimeEntry[];
      }
      const byJob: Record<string, JobSummaryRow> = {};
      for (const e of rawEntries) {
        const key = e.job_name ?? "No Job";
        if (!byJob[key]) byJob[key] = { jobName: key, totalMinutes: 0, entryCount: 0, employees: new Set(), sqft: 0 };
        byJob[key].totalMinutes += calcDurationMinutes(e.clock_in, e.clock_out ?? undefined, e.break_minutes ?? 0);
        byJob[key].entryCount += 1;
        byJob[key].employees.add(e.user_id);
        byJob[key].sqft += e.sqft_completed ?? 0;
      }
      setJobSummary(Object.values(byJob).sort((a, b) => b.totalMinutes - a.totalMinutes));
      setJobGenerated(true);
    } finally {
      setJobLoading(false);
    }
  }

  // ── Approve entry ────────────────────────────────────────────────────────
  async function handleApprove(entryId: string) {
    setApprovingId(entryId);
    try {
      if (!supabase) {
        const all = loadLocalEntries().map((e) =>
          e.id === entryId ? { ...e, status: "approved" as const } : e
        );
        localStorage.setItem(LS_ENTRIES, JSON.stringify(all));
      } else {
        await supabase.from("time_entries").update({ status: "approved", approved_at: new Date().toISOString() }).eq("id", entryId);
      }
      setPendingEntries((prev) => prev.filter((e) => e.id !== entryId));
    } finally {
      setApprovingId(null);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>;
  }

  if (!isManager) {
    return (
      <div className="max-w-md mx-auto mt-16 text-center">
        <p className="text-gray-500 text-sm">Reports are available to managers and above.</p>
      </div>
    );
  }

  const totalPayroll = payrollItems.reduce((s, i) => s + i.gross_pay, 0);
  const totalJobHours = jobSummary.reduce((s, r) => s + r.totalMinutes, 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">📊 Reports & Export</h1>
        {isLocal && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">Local mode</span>}
      </div>

      {/* ── Section: Payroll Summary ── */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-lg text-gray-900">Payroll Summary</h2>
        <DateRangePicker value={payrollRange} onChange={(r) => { setPayrollRange(r); setPayrollGenerated(false); }} />
        <button
          onClick={handleGeneratePayroll}
          disabled={payrollLoading}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {payrollLoading ? "Generating…" : "Generate Payroll Summary"}
        </button>

        {payrollGenerated && payrollItems.length === 0 && (
          <p className="text-sm text-gray-400">No time entries found for this period.</p>
        )}

        {payrollGenerated && payrollItems.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-gray-500 border-b border-gray-100">
                  <tr>
                    <th className="pb-2 font-medium">Employee</th>
                    <th className="pb-2 font-medium">Type</th>
                    <th className="pb-2 font-medium">Reg Hrs</th>
                    <th className="pb-2 font-medium">OT Hrs</th>
                    <th className="pb-2 font-medium">Rate</th>
                    <th className="pb-2 font-medium">Gross Pay</th>
                    <th className="pb-2 font-medium">Entries</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payrollItems.map((item) => (
                    <tr key={item.employee_id} className="hover:bg-gray-50">
                      <td className="py-2 font-medium text-gray-900">{item.full_name}</td>
                      <td className="py-2 text-gray-500 capitalize">{item.employment_type}</td>
                      <td className="py-2 text-gray-700">{item.regular_hours.toFixed(2)}</td>
                      <td className="py-2 text-orange-600">{item.overtime_hours > 0 ? item.overtime_hours.toFixed(2) : "—"}</td>
                      <td className="py-2 text-gray-500">${item.regular_rate.toFixed(2)}</td>
                      <td className="py-2 font-semibold text-green-700">${item.gross_pay.toFixed(2)}</td>
                      <td className="py-2 text-gray-400">{item.entries_count}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200">
                    <td colSpan={5} className="pt-2 text-sm font-semibold text-gray-700">Total Payroll</td>
                    <td className="pt-2 font-bold text-green-700 text-base">${totalPayroll.toFixed(2)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleExportPayrollCSV}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors"
              >
                Export CSV
              </button>
              <button
                onClick={handleExportPayrollPDF}
                disabled={pdfExporting === "payroll"}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
              >
                {pdfExporting === "payroll" ? "Generating…" : "Export PDF"}
              </button>
            </div>
          </>
        )}
      </section>

      {/* ── Section: Employee Timesheet ── */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-lg text-gray-900">Employee Timesheet</h2>
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Employee</label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => { setSelectedEmployeeId(e.target.value); setTsGenerated(false); }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500 w-full max-w-xs"
            >
              <option value="">Select employee…</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.full_name}</option>
              ))}
            </select>
          </div>
          <DateRangePicker value={tsRange} onChange={(r) => { setTsRange(r); setTsGenerated(false); }} />
          <button
            onClick={handleGenerateEmployeeTS}
            disabled={!selectedEmployeeId || tsLoading}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors w-fit"
          >
            {tsLoading ? "Loading…" : "Generate Timesheet"}
          </button>
        </div>

        {tsGenerated && tsEntries.length === 0 && (
          <p className="text-sm text-gray-400">No time entries found for this employee in this period.</p>
        )}

        {tsGenerated && tsEntries.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-gray-500 border-b border-gray-100">
                  <tr>
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Job</th>
                    <th className="pb-2 font-medium">In</th>
                    <th className="pb-2 font-medium">Out</th>
                    <th className="pb-2 font-medium">Hours</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tsEntries.map((entry) => {
                    const mins = calcDurationMinutes(entry.clock_in, entry.clock_out ?? undefined, entry.break_minutes ?? 0);
                    return (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="py-2 text-gray-900">{new Date(entry.clock_in).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}</td>
                        <td className="py-2 text-gray-500">{entry.job_name ?? "—"}</td>
                        <td className="py-2 text-gray-600">{new Date(entry.clock_in).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                        <td className="py-2 text-gray-600">{entry.clock_out ? new Date(entry.clock_out).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                        <td className="py-2 font-semibold text-gray-900">{formatDuration(mins)}</td>
                        <td className="py-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            entry.status === "approved" ? "bg-green-100 text-green-800" :
                            entry.status === "rejected" ? "bg-red-100 text-red-800" :
                            "bg-yellow-100 text-yellow-800"
                          }`}>{entry.status ?? "pending"}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200">
                    <td colSpan={4} className="pt-2 text-sm font-semibold text-gray-700">Total</td>
                    <td className="pt-2 font-bold text-gray-900">
                      {formatDuration(tsEntries.reduce((s, e) => s + calcDurationMinutes(e.clock_in, e.clock_out ?? undefined, e.break_minutes ?? 0), 0))}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <button
              onClick={handleExportEmployeePDF}
              disabled={pdfExporting === "employee"}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
            >
              {pdfExporting === "employee" ? "Generating…" : "Export PDF"}
            </button>
          </>
        )}
      </section>

      {/* ── Section: Job Summary ── */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-lg text-gray-900">Job Hours Summary</h2>
        <DateRangePicker value={jobRange} onChange={(r) => { setJobRange(r); setJobGenerated(false); }} />
        <button
          onClick={handleGenerateJobSummary}
          disabled={jobLoading}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {jobLoading ? "Generating…" : "Generate Job Summary"}
        </button>

        {jobGenerated && jobSummary.length === 0 && (
          <p className="text-sm text-gray-400">No entries found for this period.</p>
        )}

        {jobGenerated && jobSummary.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="pb-2 font-medium">Job</th>
                  <th className="pb-2 font-medium">Total Hours</th>
                  <th className="pb-2 font-medium">Employees</th>
                  <th className="pb-2 font-medium">Shifts</th>
                  <th className="pb-2 font-medium">Sq Ft</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {jobSummary.map((row) => (
                  <tr key={row.jobName} className="hover:bg-gray-50">
                    <td className="py-2 font-medium text-gray-900">{row.jobName}</td>
                    <td className="py-2 font-semibold text-green-700">{formatDuration(row.totalMinutes)}</td>
                    <td className="py-2 text-gray-600">{row.employees.size}</td>
                    <td className="py-2 text-gray-500">{row.entryCount}</td>
                    <td className="py-2 text-gray-500">{row.sqft > 0 ? row.sqft.toLocaleString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200">
                  <td className="pt-2 text-sm font-semibold text-gray-700">Total</td>
                  <td className="pt-2 font-bold text-green-700">{formatDuration(totalJobHours)}</td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {/* ── Section: Pending Approvals ── */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg text-gray-900">Pending Approvals</h2>
          <div className="flex items-center gap-2">
            {pendingEntries.length > 0 && (
              <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full font-semibold">
                {pendingEntries.length} pending
              </span>
            )}
            <button onClick={loadPendingApprovals} disabled={pendingLoading} className="text-xs text-gray-400 hover:text-gray-600">
              {pendingLoading ? "Loading…" : "Refresh"}
            </button>
          </div>
        </div>

        {pendingEntries.length === 0 && !pendingLoading && (
          <p className="text-sm text-gray-400">No pending time entries. All caught up!</p>
        )}

        {pendingEntries.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="pb-2 font-medium">Employee</th>
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Job</th>
                  <th className="pb-2 font-medium">Hours</th>
                  <th className="pb-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pendingEntries.map((entry) => {
                  const mins = calcDurationMinutes(entry.clock_in, entry.clock_out ?? undefined, entry.break_minutes ?? 0);
                  const name = (entry.profiles as { full_name?: string } | undefined)?.full_name ?? entry.user_id;
                  return (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="py-2 font-medium text-gray-900">{name}</td>
                      <td className="py-2 text-gray-500">{new Date(entry.clock_in).toLocaleDateString([], { month: "short", day: "numeric" })}</td>
                      <td className="py-2 text-gray-500">{entry.job_name ?? "—"}</td>
                      <td className="py-2 text-gray-700">{formatDuration(mins)}</td>
                      <td className="py-2">
                        <button
                          onClick={() => handleApprove(entry.id)}
                          disabled={approvingId === entry.id}
                          className="px-2 py-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-medium rounded transition-colors"
                        >
                          {approvingId === entry.id ? "…" : "Approve"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
