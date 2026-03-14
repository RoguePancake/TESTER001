"use client";

import { useRef, useState } from "react";
import type { FieldConfig, GridPointResult } from "@/lib/engines/grading";
import { getCellZone, heatmapColor } from "@/lib/engines/grading";

interface ElevationGridProps {
  rows: number;
  cols: number;
  values: string[][];
  results?: GridPointResult[][];
  maxCutFt?: number;
  onChange: (row: number, col: number, value: string) => void;
  readOnly?: boolean;
  config: FieldConfig;
}

export default function ElevationGrid({
  rows, cols, values, results, maxCutFt = 1,
  onChange, readOnly = false, config,
}: ElevationGridProps) {
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const gridRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation: Tab→right, Enter→down
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>, row: number, col: number) {
    if (readOnly) return;
    if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      const nextCol = col + 1 < cols ? col + 1 : 0;
      const nextRow = col + 1 < cols ? row : row + 1;
      if (nextRow < rows) focusCell(nextRow, nextCol);
    } else if (e.key === "Tab" && e.shiftKey) {
      e.preventDefault();
      const prevCol = col - 1 >= 0 ? col - 1 : cols - 1;
      const prevRow = col - 1 >= 0 ? row : row - 1;
      if (prevRow >= 0) focusCell(prevRow, prevCol);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const nextRow = row + 1;
      if (nextRow < rows) focusCell(nextRow, col);
    }
  }

  function focusCell(row: number, col: number) {
    const el = gridRef.current?.querySelector<HTMLInputElement>(
      `[data-r="${row}"][data-c="${col}"]`
    );
    el?.focus();
    el?.select();
  }

  function handlePasteApply() {
    // Parse comma/tab/space-separated, newline-delimited block
    const rowStrings = pasteText.trim().split(/\r?\n/);
    rowStrings.forEach((rowStr, r) => {
      if (r >= rows) return;
      const cells = rowStr.trim().split(/[,\t ]+/);
      cells.forEach((val, c) => {
        if (c >= cols) return;
        onChange(r, c, val.trim());
      });
    });
    setShowPaste(false);
    setPasteText("");
  }

  function getCellBg(row: number, col: number): string {
    if (results) {
      const r = results[row]?.[col];
      if (r) return heatmapColor(r, maxCutFt);
    }
    // Zone tint
    const zone = getCellZone(col, row, config);
    return zone === "belly" ? "bg-white" : "bg-slate-50";
  }

  function getCellBorder(row: number, col: number): string {
    const zone = getCellZone(col, row, config);
    return zone === "belly" ? "border-gray-300" : "border-slate-200";
  }

  const spacing = config.gridSpacingFt;

  return (
    <div>
      {/* Paste CSV button */}
      {!readOnly && (
        <div className="mb-3">
          <button
            onClick={() => setShowPaste(!showPaste)}
            className="px-3 py-1.5 text-xs font-medium bg-blue-50 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
          >
            {showPaste ? "Hide Paste" : "Paste CSV / Data Collector Export"}
          </button>
        </div>
      )}

      {showPaste && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-xs text-blue-700 mb-2 font-medium">
            Paste comma, tab, or space-separated values. One row per line, left-to-right across the field.
          </p>
          <textarea
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
            className="w-full h-28 text-xs font-mono border border-blue-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder={"5.4, 5.3, 5.5, ...\n5.2, 5.1, 5.3, ..."}
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handlePasteApply}
              className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Apply to Grid
            </button>
            <button
              onClick={() => { setShowPaste(false); setPasteText(""); }}
              className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Legend */}
      {results && (
        <div className="flex flex-wrap gap-2 mb-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 rounded bg-blue-300 inline-block" /> Fill needed
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 rounded bg-green-200 inline-block" /> On grade
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 rounded bg-lime-200 inline-block" /> Shallow cut
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 rounded bg-yellow-300 inline-block" /> Moderate cut
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 rounded bg-orange-400 inline-block" /> Deep cut
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 rounded bg-red-500 inline-block" /> Max cut
          </span>
        </div>
      )}

      {/* Scrollable grid wrapper */}
      <div className="overflow-auto max-h-[60vh] border border-gray-200 rounded-xl">
        <div ref={gridRef} className="inline-block p-2">
          {/* Column headers */}
          <div className="flex mb-0.5">
            <div className="w-10 shrink-0" /> {/* row label spacer */}
            {Array.from({ length: cols }, (_, c) => (
              <div key={c} className="w-12 text-center text-xs text-gray-400 font-mono leading-tight shrink-0">
                {c * spacing}
              </div>
            ))}
          </div>

          {/* Rows */}
          {Array.from({ length: rows }, (_, r) => (
            <div key={r} className="flex items-center mb-0.5">
              {/* Row label */}
              <div className="w-10 text-right pr-1 text-xs text-gray-400 font-mono shrink-0">
                {r * spacing}
              </div>
              {/* Cells */}
              {Array.from({ length: cols }, (_, c) => {
                const bg = getCellBg(r, c);
                const border = getCellBorder(r, c);
                const result = results?.[r]?.[c];
                const title = result
                  ? `Elev: ${result.existingElevFt.toFixed(3)}ft | Target: ${result.targetSubgradeFt.toFixed(3)}ft | ${result.status === "fill" ? `Fill ${(Math.abs(result.netCutFt) * 12).toFixed(1)}"` : `Cut ${(result.totalCutFt * 12).toFixed(1)}"`}`
                  : undefined;

                return (
                  <input
                    key={c}
                    type="number"
                    step="any"
                    data-r={r}
                    data-c={c}
                    value={values[r]?.[c] ?? ""}
                    onChange={e => !readOnly && onChange(r, c, e.target.value)}
                    onKeyDown={e => handleKeyDown(e, r, c)}
                    readOnly={readOnly}
                    title={title}
                    className={`w-12 h-8 text-xs text-center border ${border} ${bg} rounded focus:outline-none focus:ring-1 focus:ring-green-500 shrink-0 transition-colors ${readOnly ? "cursor-default" : ""}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Zone legend */}
      {!results && (
        <div className="mt-2 flex gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 rounded bg-white border border-gray-300 inline-block" /> Belly (crowned)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 rounded bg-slate-50 border border-slate-200 inline-block" /> Extended (flat)
          </span>
        </div>
      )}
    </div>
  );
}
