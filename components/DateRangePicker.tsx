"use client";

import { useState } from "react";

export interface DateRange {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

type Preset = "this_week" | "last_week" | "this_month" | "last_month" | "custom";

function getPresetRange(preset: Preset): DateRange {
  const now = new Date();
  const toISO = (d: Date) => d.toISOString().split("T")[0];

  if (preset === "this_week") {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start: toISO(start), end: toISO(end) };
  }

  if (preset === "last_week") {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay() - 7);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start: toISO(start), end: toISO(end) };
  }

  if (preset === "this_month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start: toISO(start), end: toISO(end) };
  }

  if (preset === "last_month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { start: toISO(start), end: toISO(end) };
  }

  return { start: toISO(now), end: toISO(now) };
}

const PRESETS: { id: Preset; label: string }[] = [
  { id: "this_week", label: "This Week" },
  { id: "last_week", label: "Last Week" },
  { id: "this_month", label: "This Month" },
  { id: "last_month", label: "Last Month" },
  { id: "custom", label: "Custom" },
];

export function DateRangePicker({ value, onChange, className = "" }: DateRangePickerProps) {
  const [activePreset, setActivePreset] = useState<Preset>("this_week");

  function selectPreset(preset: Preset) {
    setActivePreset(preset);
    if (preset !== "custom") {
      onChange(getPresetRange(preset));
    }
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex gap-1 flex-wrap">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => selectPreset(p.id)}
            className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
              activePreset === p.id
                ? "bg-green-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {activePreset === "custom" && (
        <div className="flex gap-2 items-center flex-wrap">
          <input
            type="date"
            value={value.start}
            onChange={(e) => onChange({ ...value, start: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <span className="text-gray-400 text-sm">to</span>
          <input
            type="date"
            value={value.end}
            min={value.start}
            onChange={(e) => onChange({ ...value, end: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      )}
      {activePreset !== "custom" && (
        <p className="text-xs text-gray-400">
          {value.start} — {value.end}
        </p>
      )}
    </div>
  );
}

/** Returns a default range for today's week */
export function defaultWeekRange(): DateRange {
  return getPresetRange("this_week");
}
