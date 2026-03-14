/**
 * PDF EXPORT ENGINE
 * Timesheet and payroll PDF document generation using @react-pdf/renderer.
 * Mirrors the engine pattern of payroll.ts — pure functions, no UI concerns.
 */

import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  pdf,
  type DocumentProps,
} from "@react-pdf/renderer";
import { calcDurationMinutes, formatDuration } from "./time";
import type { TimeEntry } from "@/lib/supabase";
import type { PayrollLineItem } from "./payroll";

// ── Styles ────────────────────────────────────────────────────────────────────

const colors = {
  brand: "#1a1a2e",
  accent: "#16213e",
  highlight: "#0f3460",
  text: "#1a1a1a",
  muted: "#6b7280",
  border: "#d1d5db",
  rowAlt: "#f9fafb",
  white: "#ffffff",
  approved: "#15803d",
  pending: "#b45309",
  rejected: "#b91c1c",
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: colors.text,
    padding: 36,
    backgroundColor: colors.white,
  },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: colors.brand,
  },
  headerLeft: { flexDirection: "column", gap: 2 },
  headerRight: { flexDirection: "column", alignItems: "flex-end", gap: 2 },
  brandName: { fontSize: 18, fontFamily: "Helvetica-Bold", color: colors.brand },
  docTitle: { fontSize: 11, color: colors.muted },
  headerMeta: { fontSize: 8, color: colors.muted },
  // Summary bar
  summaryBar: {
    flexDirection: "row",
    backgroundColor: colors.accent,
    borderRadius: 4,
    padding: 10,
    marginBottom: 14,
    gap: 20,
  },
  summaryItem: { flexDirection: "column", gap: 2 },
  summaryLabel: { fontSize: 7, color: "#9ca3af", fontFamily: "Helvetica-Bold" },
  summaryValue: { fontSize: 12, color: colors.white, fontFamily: "Helvetica-Bold" },
  // Table
  table: { width: "100%" },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.highlight,
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tableHeaderCell: {
    color: colors.white,
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  tableRowAlt: { backgroundColor: colors.rowAlt },
  tableCell: { fontSize: 8, color: colors.text },
  tableCellMuted: { fontSize: 8, color: colors.muted },
  // Status badge
  statusApproved: { color: colors.approved, fontFamily: "Helvetica-Bold" },
  statusPending: { color: colors.pending },
  statusRejected: { color: colors.rejected },
  // Footer
  footer: {
    marginTop: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerBlock: { flexDirection: "column", gap: 20, width: "45%" },
  footerLabel: { fontSize: 8, color: colors.muted },
  footerLine: {
    borderBottomWidth: 0.5,
    borderBottomColor: colors.text,
    marginTop: 2,
    marginBottom: 2,
  },
  signatureLine: { fontSize: 8, color: colors.muted, marginTop: 4 },
  pageNumber: { fontSize: 7, color: colors.muted, textAlign: "right" },
  // Payroll-specific
  totalsRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 4,
    backgroundColor: colors.brand,
    marginTop: 2,
  },
  totalsCell: { color: colors.white, fontFamily: "Helvetica-Bold", fontSize: 8 },
});

// ── Column widths ─────────────────────────────────────────────────────────────

const tsColWidths = {
  name: "12%",
  date: "9%",
  job: "14%",
  clockIn: "9%",
  clockOut: "9%",
  break: "6%",
  hours: "8%",
  workType: "11%",
  travel: "7%",
  sqft: "7%",
  status: "8%",
};

const prColWidths = {
  name: "22%",
  type: "12%",
  regHrs: "11%",
  otHrs: "11%",
  regRate: "11%",
  otRate: "11%",
  gross: "13%",
  entries: "9%",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function fmtMoney(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function statusStyle(status?: string | null) {
  if (status === "approved") return styles.statusApproved;
  if (status === "rejected") return styles.statusRejected;
  return styles.statusPending;
}

// ── TimesheetPDFDoc ───────────────────────────────────────────────────────────

export interface TimesheetPDFProps {
  employeeName: string;
  periodStart: string;
  periodEnd: string;
  entries: TimeEntry[];
  regularHours: number;
  overtimeHours: number;
  grossPay?: number;
  payRate?: number;
}

export function TimesheetPDFDoc(props: TimesheetPDFProps) {
  const { employeeName, periodStart, periodEnd, entries, regularHours, overtimeHours, grossPay, payRate } = props;
  const totalHours = regularHours + overtimeHours;
  const generatedAt = new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

  return React.createElement(
    Document,
    { title: `Timesheet - ${employeeName}` },
    React.createElement(
      Page,
      { size: "A4", orientation: "landscape", style: styles.page },
      // Header
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(
          View,
          { style: styles.headerLeft },
          React.createElement(Text, { style: styles.brandName }, "InstallOperations"),
          React.createElement(Text, { style: styles.docTitle }, "TIMESHEET REPORT"),
          React.createElement(Text, { style: styles.headerMeta }, employeeName)
        ),
        React.createElement(
          View,
          { style: styles.headerRight },
          React.createElement(Text, { style: styles.headerMeta }, `Pay Period: ${fmtDate(periodStart)} – ${fmtDate(periodEnd)}`),
          React.createElement(Text, { style: styles.headerMeta }, `Generated: ${generatedAt}`),
          payRate ? React.createElement(Text, { style: styles.headerMeta }, `Rate: ${fmtMoney(payRate)}/hr`) : null
        )
      ),
      // Summary bar
      React.createElement(
        View,
        { style: styles.summaryBar },
        React.createElement(
          View,
          { style: styles.summaryItem },
          React.createElement(Text, { style: styles.summaryLabel }, "TOTAL HOURS"),
          React.createElement(Text, { style: styles.summaryValue }, totalHours.toFixed(2))
        ),
        React.createElement(
          View,
          { style: styles.summaryItem },
          React.createElement(Text, { style: styles.summaryLabel }, "REGULAR"),
          React.createElement(Text, { style: styles.summaryValue }, regularHours.toFixed(2))
        ),
        React.createElement(
          View,
          { style: styles.summaryItem },
          React.createElement(Text, { style: styles.summaryLabel }, "OVERTIME"),
          React.createElement(Text, { style: styles.summaryValue }, overtimeHours.toFixed(2))
        ),
        React.createElement(
          View,
          { style: styles.summaryItem },
          React.createElement(Text, { style: styles.summaryLabel }, "ENTRIES"),
          React.createElement(Text, { style: styles.summaryValue }, String(entries.length))
        ),
        grossPay !== undefined
          ? React.createElement(
              View,
              { style: styles.summaryItem },
              React.createElement(Text, { style: styles.summaryLabel }, "GROSS PAY"),
              React.createElement(Text, { style: styles.summaryValue }, fmtMoney(grossPay))
            )
          : null
      ),
      // Table header
      React.createElement(
        View,
        { style: styles.tableHeader },
        React.createElement(Text, { style: [styles.tableHeaderCell, { width: tsColWidths.name }] }, "Employee"),
        React.createElement(Text, { style: [styles.tableHeaderCell, { width: tsColWidths.date }] }, "Date"),
        React.createElement(Text, { style: [styles.tableHeaderCell, { width: tsColWidths.job }] }, "Job"),
        React.createElement(Text, { style: [styles.tableHeaderCell, { width: tsColWidths.clockIn }] }, "Clock In"),
        React.createElement(Text, { style: [styles.tableHeaderCell, { width: tsColWidths.clockOut }] }, "Clock Out"),
        React.createElement(Text, { style: [styles.tableHeaderCell, { width: tsColWidths.break }] }, "Break"),
        React.createElement(Text, { style: [styles.tableHeaderCell, { width: tsColWidths.hours }] }, "Hours"),
        React.createElement(Text, { style: [styles.tableHeaderCell, { width: tsColWidths.workType }] }, "Work Type"),
        React.createElement(Text, { style: [styles.tableHeaderCell, { width: tsColWidths.travel }] }, "Travel"),
        React.createElement(Text, { style: [styles.tableHeaderCell, { width: tsColWidths.sqft }] }, "Sq Ft"),
        React.createElement(Text, { style: [styles.tableHeaderCell, { width: tsColWidths.status }] }, "Status")
      ),
      // Table rows
      ...entries.map((entry, i) => {
        const mins = calcDurationMinutes(entry.clock_in, entry.clock_out ?? undefined, entry.break_minutes ?? 0);
        const rowStyle = i % 2 === 1 ? [styles.tableRow, styles.tableRowAlt] : [styles.tableRow];
        const entryName = (entry.profiles as { full_name?: string } | undefined)?.full_name ?? employeeName;
        return React.createElement(
          View,
          { key: entry.id, style: rowStyle },
          React.createElement(Text, { style: [styles.tableCell, { width: tsColWidths.name }] }, entryName),
          React.createElement(Text, { style: [styles.tableCell, { width: tsColWidths.date }] }, fmtDate(entry.clock_in)),
          React.createElement(Text, { style: [styles.tableCell, { width: tsColWidths.job }] }, entry.job_name ?? "—"),
          React.createElement(Text, { style: [styles.tableCell, { width: tsColWidths.clockIn }] }, fmtTime(entry.clock_in)),
          React.createElement(Text, { style: [styles.tableCell, { width: tsColWidths.clockOut }] }, entry.clock_out ? fmtTime(entry.clock_out) : "—"),
          React.createElement(Text, { style: [styles.tableCellMuted, { width: tsColWidths.break }] }, entry.break_minutes ? `${entry.break_minutes}m` : "—"),
          React.createElement(Text, { style: [styles.tableCell, { width: tsColWidths.hours, fontFamily: "Helvetica-Bold" }] }, formatDuration(mins)),
          React.createElement(Text, { style: [styles.tableCellMuted, { width: tsColWidths.workType }] }, entry.work_type ?? "—"),
          React.createElement(Text, { style: [styles.tableCellMuted, { width: tsColWidths.travel }] }, entry.travel_time ? `${entry.travel_time}m` : "—"),
          React.createElement(Text, { style: [styles.tableCellMuted, { width: tsColWidths.sqft }] }, entry.sqft_completed ? String(entry.sqft_completed) : "—"),
          React.createElement(Text, { style: [statusStyle(entry.status), { width: tsColWidths.status, fontSize: 7 }] }, (entry.status ?? "pending").toUpperCase())
        );
      }),
      // Footer / signature
      React.createElement(
        View,
        { style: styles.footer },
        React.createElement(
          View,
          { style: styles.footerBlock },
          React.createElement(Text, { style: styles.footerLabel }, "Employee Signature"),
          React.createElement(View, { style: styles.footerLine }),
          React.createElement(Text, { style: styles.signatureLine }, "Date: _______________")
        ),
        React.createElement(
          View,
          { style: styles.footerBlock },
          React.createElement(Text, { style: styles.footerLabel }, "Approved By"),
          React.createElement(View, { style: styles.footerLine }),
          React.createElement(Text, { style: styles.signatureLine }, "Date: _______________")
        )
      )
    )
  );
}

// ── PayrollSummaryPDFDoc ──────────────────────────────────────────────────────

export interface PayrollSummaryPDFProps {
  items: PayrollLineItem[];
  periodStart: string;
  periodEnd: string;
  companyName?: string;
}

export function PayrollSummaryPDFDoc(props: PayrollSummaryPDFProps) {
  const { items, periodStart, periodEnd, companyName = "InstallOperations" } = props;
  const totalGross = items.reduce((sum, i) => sum + i.gross_pay, 0);
  const totalRegHrs = items.reduce((sum, i) => sum + i.regular_hours, 0);
  const totalOtHrs = items.reduce((sum, i) => sum + i.overtime_hours, 0);
  const generatedAt = new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

  return React.createElement(
    Document,
    { title: `Payroll Summary ${periodStart}` },
    React.createElement(
      Page,
      { size: "A4", orientation: "landscape", style: styles.page },
      // Header
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(
          View,
          { style: styles.headerLeft },
          React.createElement(Text, { style: styles.brandName }, companyName),
          React.createElement(Text, { style: styles.docTitle }, "PAYROLL SUMMARY"),
          React.createElement(Text, { style: styles.headerMeta }, `Pay Period: ${fmtDate(periodStart)} – ${fmtDate(periodEnd)}`)
        ),
        React.createElement(
          View,
          { style: styles.headerRight },
          React.createElement(Text, { style: styles.headerMeta }, `Generated: ${generatedAt}`),
          React.createElement(Text, { style: styles.headerMeta }, `${items.length} employee${items.length !== 1 ? "s" : ""}`)
        )
      ),
      // Summary bar
      React.createElement(
        View,
        { style: styles.summaryBar },
        React.createElement(
          View,
          { style: styles.summaryItem },
          React.createElement(Text, { style: styles.summaryLabel }, "TOTAL GROSS PAY"),
          React.createElement(Text, { style: styles.summaryValue }, fmtMoney(totalGross))
        ),
        React.createElement(
          View,
          { style: styles.summaryItem },
          React.createElement(Text, { style: styles.summaryLabel }, "TOTAL REG HOURS"),
          React.createElement(Text, { style: styles.summaryValue }, totalRegHrs.toFixed(2))
        ),
        React.createElement(
          View,
          { style: styles.summaryItem },
          React.createElement(Text, { style: styles.summaryLabel }, "TOTAL OT HOURS"),
          React.createElement(Text, { style: styles.summaryValue }, totalOtHrs.toFixed(2))
        ),
        React.createElement(
          View,
          { style: styles.summaryItem },
          React.createElement(Text, { style: styles.summaryLabel }, "EMPLOYEES"),
          React.createElement(Text, { style: styles.summaryValue }, String(items.length))
        )
      ),
      // Table header
      React.createElement(
        View,
        { style: styles.tableHeader },
        React.createElement(Text, { style: [styles.tableHeaderCell, { width: prColWidths.name }] }, "Employee"),
        React.createElement(Text, { style: [styles.tableHeaderCell, { width: prColWidths.type }] }, "Type"),
        React.createElement(Text, { style: [styles.tableHeaderCell, { width: prColWidths.regHrs }] }, "Reg Hours"),
        React.createElement(Text, { style: [styles.tableHeaderCell, { width: prColWidths.otHrs }] }, "OT Hours"),
        React.createElement(Text, { style: [styles.tableHeaderCell, { width: prColWidths.regRate }] }, "Reg Rate"),
        React.createElement(Text, { style: [styles.tableHeaderCell, { width: prColWidths.otRate }] }, "OT Rate"),
        React.createElement(Text, { style: [styles.tableHeaderCell, { width: prColWidths.gross }] }, "Gross Pay"),
        React.createElement(Text, { style: [styles.tableHeaderCell, { width: prColWidths.entries }] }, "Entries")
      ),
      // Table rows
      ...items.map((item, i) => {
        const rowStyle = i % 2 === 1 ? [styles.tableRow, styles.tableRowAlt] : [styles.tableRow];
        return React.createElement(
          View,
          { key: item.employee_id, style: rowStyle },
          React.createElement(Text, { style: [styles.tableCell, { width: prColWidths.name, fontFamily: "Helvetica-Bold" }] }, item.full_name),
          React.createElement(Text, { style: [styles.tableCellMuted, { width: prColWidths.type }] }, item.employment_type),
          React.createElement(Text, { style: [styles.tableCell, { width: prColWidths.regHrs }] }, item.regular_hours.toFixed(2)),
          React.createElement(Text, { style: [styles.tableCell, { width: prColWidths.otHrs }] }, item.overtime_hours > 0 ? item.overtime_hours.toFixed(2) : "—"),
          React.createElement(Text, { style: [styles.tableCell, { width: prColWidths.regRate }] }, fmtMoney(item.regular_rate)),
          React.createElement(Text, { style: [styles.tableCellMuted, { width: prColWidths.otRate }] }, item.overtime_hours > 0 ? fmtMoney(item.overtime_rate) : "—"),
          React.createElement(Text, { style: [styles.tableCell, { width: prColWidths.gross, fontFamily: "Helvetica-Bold" }] }, fmtMoney(item.gross_pay)),
          React.createElement(Text, { style: [styles.tableCellMuted, { width: prColWidths.entries }] }, String(item.entries_count))
        );
      }),
      // Totals row
      React.createElement(
        View,
        { style: styles.totalsRow },
        React.createElement(Text, { style: [styles.totalsCell, { width: prColWidths.name }] }, "TOTAL"),
        React.createElement(Text, { style: [styles.totalsCell, { width: prColWidths.type }] }, ""),
        React.createElement(Text, { style: [styles.totalsCell, { width: prColWidths.regHrs }] }, totalRegHrs.toFixed(2)),
        React.createElement(Text, { style: [styles.totalsCell, { width: prColWidths.otHrs }] }, totalOtHrs.toFixed(2)),
        React.createElement(Text, { style: [styles.totalsCell, { width: prColWidths.regRate }] }, ""),
        React.createElement(Text, { style: [styles.totalsCell, { width: prColWidths.otRate }] }, ""),
        React.createElement(Text, { style: [styles.totalsCell, { width: prColWidths.gross }] }, fmtMoney(totalGross)),
        React.createElement(Text, { style: [styles.totalsCell, { width: prColWidths.entries }] }, String(items.reduce((s, i) => s + i.entries_count, 0)))
      ),
      // Footer
      React.createElement(
        View,
        { style: styles.footer },
        React.createElement(
          View,
          { style: styles.footerBlock },
          React.createElement(Text, { style: styles.footerLabel }, "Prepared By"),
          React.createElement(View, { style: styles.footerLine }),
          React.createElement(Text, { style: styles.signatureLine }, "Title: _______________")
        ),
        React.createElement(
          View,
          { style: styles.footerBlock },
          React.createElement(Text, { style: styles.footerLabel }, "Authorized Signature"),
          React.createElement(View, { style: styles.footerLine }),
          React.createElement(Text, { style: styles.signatureLine }, "Date: _______________")
        )
      )
    )
  );
}

// ── Download helper ───────────────────────────────────────────────────────────

/**
 * Generate a PDF blob from a react-pdf Document element and trigger download.
 * Must be called from a client-side event handler.
 */
export async function downloadPDF(
  docElement: React.ReactElement<DocumentProps>,
  filename: string
): Promise<void> {
  const blob = await pdf(docElement).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Convenience wrappers ──────────────────────────────────────────────────────

export async function downloadTimesheetPDF(props: TimesheetPDFProps): Promise<void> {
  const safe = props.employeeName.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  const filename = `timesheet_${safe}_${props.periodStart}_${props.periodEnd}.pdf`;
  await downloadPDF(React.createElement(TimesheetPDFDoc, props) as React.ReactElement<DocumentProps>, filename);
}

export async function downloadPayrollSummaryPDF(props: PayrollSummaryPDFProps): Promise<void> {
  const filename = `payroll_summary_${props.periodStart}_${props.periodEnd}.pdf`;
  await downloadPDF(React.createElement(PayrollSummaryPDFDoc, props) as React.ReactElement<DocumentProps>, filename);
}
