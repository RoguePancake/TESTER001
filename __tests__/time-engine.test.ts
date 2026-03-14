import { describe, it, expect } from "vitest";
import {
  calcDurationMinutes,
  formatDuration,
  getWeekStart,
} from "@/lib/engines/time";

describe("Time Engine", () => {
  describe("calcDurationMinutes", () => {
    it("calculates duration between clock in and clock out", () => {
      const clockIn = "2026-03-14T08:00:00Z";
      const clockOut = "2026-03-14T16:30:00Z";
      expect(calcDurationMinutes(clockIn, clockOut)).toBe(510); // 8h 30m
    });

    it("subtracts break minutes", () => {
      const clockIn = "2026-03-14T08:00:00Z";
      const clockOut = "2026-03-14T16:30:00Z";
      expect(calcDurationMinutes(clockIn, clockOut, 30)).toBe(480); // 8h
    });

    it("returns 0 for negative durations", () => {
      const clockIn = "2026-03-14T16:00:00Z";
      const clockOut = "2026-03-14T08:00:00Z";
      expect(calcDurationMinutes(clockIn, clockOut)).toBe(0);
    });

    it("handles zero-length shift", () => {
      const time = "2026-03-14T08:00:00Z";
      expect(calcDurationMinutes(time, time)).toBe(0);
    });

    it("handles break longer than shift duration gracefully", () => {
      const clockIn = "2026-03-14T08:00:00Z";
      const clockOut = "2026-03-14T08:30:00Z";
      expect(calcDurationMinutes(clockIn, clockOut, 60)).toBe(0);
    });
  });

  describe("formatDuration", () => {
    it("formats hours and minutes", () => {
      expect(formatDuration(510)).toBe("8h 30m");
    });

    it("formats zero minutes", () => {
      expect(formatDuration(0)).toBe("0h 00m");
    });

    it("formats full hour", () => {
      expect(formatDuration(120)).toBe("2h 00m");
    });

    it("formats partial hour", () => {
      expect(formatDuration(45)).toBe("0h 45m");
    });
  });

  describe("getWeekStart", () => {
    it("gets Monday for a Wednesday", () => {
      const wed = new Date(2026, 2, 11); // Wed March 11
      const start = getWeekStart(wed, 1);
      expect(start.getDay()).toBe(1); // Monday
      expect(start.getDate()).toBe(9);
    });

    it("gets Sunday for a Wednesday when startDay=0", () => {
      const wed = new Date(2026, 2, 11);
      const start = getWeekStart(wed, 0);
      expect(start.getDay()).toBe(0); // Sunday
      expect(start.getDate()).toBe(8);
    });

    it("returns same day if already on start day", () => {
      const mon = new Date(2026, 2, 9); // Monday
      const start = getWeekStart(mon, 1);
      expect(start.getDate()).toBe(9);
    });
  });
});
