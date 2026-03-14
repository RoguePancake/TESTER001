import { describe, it, expect } from "vitest";
import { exportPayrollCSV, type PayrollLineItem } from "@/lib/engines/payroll";

describe("Payroll Engine", () => {
  describe("exportPayrollCSV", () => {
    it("generates valid CSV with headers", () => {
      const items: PayrollLineItem[] = [
        {
          employee_id: "emp-1",
          full_name: "John Doe",
          email: "john@test.com",
          employment_type: "employee",
          regular_hours: 40,
          overtime_hours: 5,
          regular_rate: 25,
          overtime_rate: 37.5,
          gross_pay: 1187.5,
          entries_count: 5,
          status: "draft",
        },
      ];

      const csv = exportPayrollCSV(items, "2026-03-01", "2026-03-07");
      const lines = csv.split("\n");

      // Header row
      expect(lines[0]).toContain("Employee Name");
      expect(lines[0]).toContain("Gross Pay");

      // Data row
      expect(lines[1]).toContain("John Doe");
      expect(lines[1]).toContain("1187.50");
      expect(lines[1]).toContain("40.00");
      expect(lines[1]).toContain("5.00");
    });

    it("handles empty items", () => {
      const csv = exportPayrollCSV([], "2026-03-01", "2026-03-07");
      const lines = csv.split("\n");
      expect(lines.length).toBe(1); // header only
    });

    it("handles null email", () => {
      const items: PayrollLineItem[] = [
        {
          employee_id: "emp-2",
          full_name: "Jane Smith",
          email: null,
          employment_type: "contractor",
          regular_hours: 20,
          overtime_hours: 0,
          regular_rate: 30,
          overtime_rate: 45,
          gross_pay: 600,
          entries_count: 3,
          status: "draft",
        },
      ];

      const csv = exportPayrollCSV(items, "2026-03-01", "2026-03-07");
      expect(csv).toContain('""'); // empty email in quotes
    });

    it("correctly calculates multiple employees", () => {
      const items: PayrollLineItem[] = [
        {
          employee_id: "emp-1",
          full_name: "Alice",
          email: "alice@test.com",
          employment_type: "employee",
          regular_hours: 40,
          overtime_hours: 0,
          regular_rate: 20,
          overtime_rate: 30,
          gross_pay: 800,
          entries_count: 5,
          status: "draft",
        },
        {
          employee_id: "emp-2",
          full_name: "Bob",
          email: "bob@test.com",
          employment_type: "employee",
          regular_hours: 40,
          overtime_hours: 10,
          regular_rate: 25,
          overtime_rate: 37.5,
          gross_pay: 1375,
          entries_count: 6,
          status: "draft",
        },
      ];

      const csv = exportPayrollCSV(items, "2026-03-01", "2026-03-07");
      const lines = csv.split("\n");
      expect(lines.length).toBe(3); // header + 2 data rows
    });
  });
});
