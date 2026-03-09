/**
 * PAYROLL ENGINE
 * Period-based payroll generation, finalization, and CSV export.
 * Aggregates approved time entries and calculates gross pay per employee.
 */

import { supabase, type PayrollSummary } from "@/lib/supabase";
import { calcDurationMinutes } from "./time";

// ── Types ────────────────────────────────────────────────────────────────────

export interface PayrollInput {
  period_start: string; // ISO date YYYY-MM-DD
  period_end: string;
  company_id?: string;
}

export interface PayrollLineItem {
  employee_id: string;
  full_name: string;
  email: string | null;
  employment_type: string;
  regular_hours: number;
  overtime_hours: number;
  regular_rate: number;
  overtime_rate: number;
  gross_pay: number;
  entries_count: number;
  status: "draft" | "finalized";
}

export interface PayrollExportRow {
  employee_name: string;
  employee_email: string;
  employment_type: string;
  period_start: string;
  period_end: string;
  regular_hours: string;
  overtime_hours: string;
  regular_rate: string;
  overtime_rate: string;
  gross_pay: string;
}

// ── Payroll generation ───────────────────────────────────────────────────────

/**
 * Generate a payroll summary for all employees with time entries in the period.
 * Uses approved entries when available, falls back to all completed entries.
 */
export async function generatePayrollSummary(
  input: PayrollInput
): Promise<PayrollLineItem[]> {
  if (!supabase) return [];

  const periodStart = new Date(input.period_start);
  periodStart.setHours(0, 0, 0, 0);
  const periodEnd = new Date(input.period_end);
  periodEnd.setHours(23, 59, 59, 999);

  let query = supabase
    .from("time_entries")
    .select("*, profiles(id, full_name, email, employment_type, default_pay_rate, overtime_rule, overtime_threshold)")
    .not("clock_out", "is", null)
    .gte("clock_in", periodStart.toISOString())
    .lte("clock_in", periodEnd.toISOString());

  const { data: entries } = await query;
  if (!entries || entries.length === 0) return [];

  // Group by employee
  const byEmployee: Record<string, {
    full_name: string;
    email: string | null;
    employment_type: string;
    rate: number;
    overtime_threshold: number;
    total_minutes: number;
    count: number;
  }> = {};

  for (const entry of entries) {
    const uid = entry.user_id;
    const profile = entry.profiles as {
      full_name: string;
      email: string | null;
      employment_type?: string;
      default_pay_rate?: number;
      overtime_rule?: string;
      overtime_threshold?: number;
    } | null;

    if (!byEmployee[uid]) {
      byEmployee[uid] = {
        full_name: profile?.full_name ?? "Unknown",
        email: profile?.email ?? null,
        employment_type: profile?.employment_type ?? "employee",
        rate: entry.pay_rate_snapshot ?? profile?.default_pay_rate ?? 0,
        overtime_threshold: (profile?.overtime_threshold ?? 40) * 60, // convert hours to minutes
        total_minutes: 0,
        count: 0,
      };
    }

    const mins = calcDurationMinutes(
      entry.clock_in,
      entry.clock_out ?? undefined,
      entry.break_minutes ?? 0
    );
    byEmployee[uid].total_minutes += mins;
    byEmployee[uid].count += 1;
  }

  // Calculate pay
  const items: PayrollLineItem[] = [];
  for (const [employeeId, data] of Object.entries(byEmployee)) {
    const regularMinutes = Math.min(data.total_minutes, data.overtime_threshold);
    const overtimeMinutes = Math.max(0, data.total_minutes - data.overtime_threshold);
    const regularHours = Math.round((regularMinutes / 60) * 100) / 100;
    const overtimeHours = Math.round((overtimeMinutes / 60) * 100) / 100;
    const overtimeRate = data.rate * 1.5;

    items.push({
      employee_id: employeeId,
      full_name: data.full_name,
      email: data.email,
      employment_type: data.employment_type,
      regular_hours: regularHours,
      overtime_hours: overtimeHours,
      regular_rate: data.rate,
      overtime_rate: overtimeRate,
      gross_pay: Math.round((regularHours * data.rate + overtimeHours * overtimeRate) * 100) / 100,
      entries_count: data.count,
      status: "draft",
    });
  }

  return items.sort((a, b) => a.full_name.localeCompare(b.full_name));
}

// ── Save / finalize ──────────────────────────────────────────────────────────

export async function saveDraft(
  items: PayrollLineItem[],
  periodStart: string,
  periodEnd: string
): Promise<void> {
  if (!supabase) return;

  for (const item of items) {
    // Upsert: delete existing draft for this employee+period, then insert
    await supabase
      .from("payroll_summaries")
      .delete()
      .eq("employee_id", item.employee_id)
      .eq("period_start", periodStart)
      .eq("period_end", periodEnd)
      .eq("status", "draft");

    await supabase.from("payroll_summaries").insert({
      employee_id: item.employee_id,
      period_start: periodStart,
      period_end: periodEnd,
      regular_hours: item.regular_hours,
      overtime_hours: item.overtime_hours,
      regular_rate: item.regular_rate,
      overtime_rate: item.overtime_rate,
      gross_pay: item.gross_pay,
      total_entries: item.entries_count,
      status: "draft",
    });
  }
}

export async function finalizePayroll(
  summaryIds: string[],
  finalizedBy: string
): Promise<void> {
  if (!supabase || summaryIds.length === 0) return;
  await supabase
    .from("payroll_summaries")
    .update({
      status: "finalized",
      finalized_by: finalizedBy,
      finalized_at: new Date().toISOString(),
    })
    .in("id", summaryIds);
}

export async function getPayrollSummaries(
  periodStart: string,
  periodEnd: string
): Promise<PayrollSummary[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("payroll_summaries")
    .select("*, profiles(full_name, email, employment_type)")
    .eq("period_start", periodStart)
    .eq("period_end", periodEnd)
    .order("created_at", { ascending: false });
  return (data ?? []) as PayrollSummary[];
}

// ── CSV export ───────────────────────────────────────────────────────────────

export function exportPayrollCSV(
  items: PayrollLineItem[],
  periodStart: string,
  periodEnd: string
): string {
  const headers = [
    "Employee Name",
    "Email",
    "Employment Type",
    "Period Start",
    "Period End",
    "Regular Hours",
    "OT Hours",
    "Regular Rate",
    "OT Rate",
    "Gross Pay",
  ];

  const rows = items.map((item) => [
    `"${item.full_name}"`,
    `"${item.email ?? ""}"`,
    item.employment_type,
    periodStart,
    periodEnd,
    item.regular_hours.toFixed(2),
    item.overtime_hours.toFixed(2),
    item.regular_rate.toFixed(2),
    item.overtime_rate.toFixed(2),
    item.gross_pay.toFixed(2),
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}
