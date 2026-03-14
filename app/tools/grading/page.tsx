"use client";

import { useState, useMemo } from "react";
import ElevationGrid from "./ElevationGrid";
import {
  analyzeGrid, calcMaterialOrders, gridDimensions, totalProductThicknessFt,
  toCsvString, computeRodReading,
  type FieldConfig, type MaterialStack, type GradingSummary,
  type GridPointResult, type ZoneSummary, type MaterialOrders, FIELD_PRESETS,
} from "@/lib/engines/grading";

// ── Shared UI helpers ────────────────────────────────────────────────────────

function Card({ title, emoji, children }: { title: string; emoji: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <h2 className="font-bold text-lg mb-4">
        <span className="mr-2">{emoji}</span>{title}
      </h2>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

function NumInput({ value, onChange, placeholder = "0", min, max, step = "any" }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  min?: number; max?: number; step?: string;
}) {
  return (
    <input
      type="number" step={step} placeholder={placeholder}
      value={value}
      min={min} max={max}
      onChange={e => onChange(e.target.value)}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
    />
  );
}

function Result({ label, value, unit, highlight, blue }: {
  label: string; value: string | number; unit?: string; highlight?: boolean; blue?: boolean;
}) {
  const bg = blue ? "bg-blue-50 border border-blue-200" : highlight ? "bg-green-50 border border-green-200" : "bg-gray-50";
  const textColor = blue ? "text-blue-700" : highlight ? "text-green-700" : "text-gray-900";
  return (
    <div className={`rounded-lg p-3 ${bg}`}>
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-xl font-bold ${textColor}`}>
        {value}
        {unit && <span className="text-sm font-normal text-gray-400 ml-1">{unit}</span>}
      </div>
    </div>
  );
}

function ToggleBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        active ? "bg-green-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}
    >
      {children}
    </button>
  );
}

// ── Material Orders Table ────────────────────────────────────────────────────

function MaterialOrdersTable({ belly, extended, combined }: {
  belly: MaterialOrders; extended: MaterialOrders; combined: MaterialOrders;
}) {
  const rows = [
    { label: "Drainage Gravel", bellyVal: `${belly.drainageGravelCY} CY / ${belly.drainageGravelTons} t`, extVal: `${extended.drainageGravelCY} CY / ${extended.drainageGravelTons} t`, combinedVal: `${combined.drainageGravelCY} CY / ${combined.drainageGravelTons} t`, highlight: true },
    ...(combined.screeningsCY > 0 ? [{ label: "Screenings", bellyVal: `${belly.screeningsCY} CY`, extVal: `${extended.screeningsCY} CY`, combinedVal: `${combined.screeningsCY} CY / ${combined.screeningsTons} t`, highlight: false }] : []),
    ...(combined.padSqFt > 0 ? [{ label: "Pad", bellyVal: `${belly.padSqFt} sqft`, extVal: `${extended.padSqFt} sqft`, combinedVal: `${combined.padSqFt} sqft`, highlight: false }] : []),
    { label: "Turf", bellyVal: `${belly.turfSqFt} sqft`, extVal: `${extended.turfSqFt} sqft`, combinedVal: `${combined.turfSqFt} sqft / ${combined.turfLinFt} lin ft`, highlight: false },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
            <th className="text-left p-2 rounded-l">Material</th>
            <th className="text-right p-2">Belly Zone</th>
            <th className="text-right p-2">Extended Zones</th>
            <th className="text-right p-2 rounded-r font-bold text-green-700">Combined Order</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.label} className="border-t border-gray-100">
              <td className="p-2 font-medium text-gray-700">{row.label}</td>
              <td className="p-2 text-right text-gray-500">{row.bellyVal}</td>
              <td className="p-2 text-right text-gray-500">{row.extVal}</td>
              <td className={`p-2 text-right font-bold ${row.highlight ? "text-green-700" : "text-gray-800"}`}>{row.combinedVal}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Zone Summary Panel ───────────────────────────────────────────────────────

function ZoneSummaryPanel({ summary, label }: { summary: ZoneSummary; label: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <h3 className="font-bold text-sm text-gray-700 mb-3 uppercase tracking-wide">{label}</h3>
      <div className="grid grid-cols-2 gap-2">
        <Result label="Cut Volume" value={summary.totalCutVolumeCY} unit="CY" highlight />
        <Result label="Fill Volume" value={summary.totalFillVolumeCY} unit="CY" blue />
        <Result label="Max Cut" value={`${summary.maxCutDepthFt} ft`} />
        <Result label="Avg Cut" value={`${summary.avgCutDepthFt} ft`} />
        <Result label="Low Points" value={summary.lowPointCount} />
        <Result label="Area" value={summary.areaSqFt.toLocaleString()} unit="sqft" />
      </div>
    </div>
  );
}

// ── Default State Factories ──────────────────────────────────────────────────

function makeDefaultConfig(fieldType: "football" | "soccer" | "custom" = "football"): FieldConfig {
  const preset = FIELD_PRESETS[fieldType];
  return {
    fieldType,
    gridSpacingFt: preset.gridSpacingFt ?? 10,
    elevUnit: preset.elevUnit ?? "tenths_foot",
    zones: { ...(preset.zones as FieldConfig["zones"]) },
  };
}

function makeDefaultStack(): MaterialStack {
  return {
    drainageGravelIn: 4,
    screeningsIn: 0,
    padIn: 0,
    turfIn: 1.75,
    turfRollWidthFt: 15,
    gravelTonsPerCY: 1.4,
  };
}

function makeEmptyGrid(rows: number, cols: number): string[][] {
  return Array.from({ length: rows }, () => Array(cols).fill(""));
}

function makeDemoGrid(rows: number, cols: number, config: FieldConfig): string[][] {
  // Realistic demo: slight crown + random ±0.3 ft noise (in user's unit)
  const spacing = config.gridSpacingFt;
  const centerRow = (rows - 1) / 2;
  const baseElev = config.elevUnit === "tenths_foot" ? 50 : config.elevUnit === "inches" ? 5.0 : 5.0;
  const crownHeight = config.elevUnit === "tenths_foot" ? 1.5 : config.elevUnit === "inches" ? 1.8 : 0.15;

  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => {
      const distFromCenter = Math.abs(r - centerRow) / (rows / 2);
      const crown = crownHeight * (1 - distFromCenter);
      const noise = (Math.random() - 0.5) * (config.elevUnit === "tenths_foot" ? 0.6 : 0.05);
      const val = baseElev + crown + noise;
      return val.toFixed(config.elevUnit === "tenths_foot" ? 1 : 2);
    })
  );
}

// ── PAGE ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "setup",    label: "1. Field & Stack" },
  { id: "entry",    label: "2. Elevation Entry" },
  { id: "results",  label: "3. Results" },
  { id: "laser",    label: "4. Laser Setup & Tips" },
] as const;
type TabId = typeof TABS[number]["id"];

export default function GradingPage() {
  const [activeTab, setActiveTab] = useState<TabId>("setup");
  const [config, setConfig] = useState<FieldConfig>(makeDefaultConfig("football"));
  const [stack, setStack] = useState<MaterialStack>(makeDefaultStack());
  const [useScreenings, setUseScreenings] = useState(false);
  const [usePad, setUsePad] = useState(false);

  const dims = useMemo(() => gridDimensions(config), [config]);
  const [elevations, setElevations] = useState<string[][]>(() => makeEmptyGrid(dims.rows, dims.cols));
  const [results, setResults] = useState<GridPointResult[][] | null>(null);
  const [summary, setSummary] = useState<GradingSummary | null>(null);

  const productThicknessIn = stack.drainageGravelIn + (useScreenings ? stack.screeningsIn : 0) + (usePad ? stack.padIn : 0) + stack.turfIn;
  const effectiveStack: MaterialStack = {
    ...stack,
    screeningsIn: useScreenings ? stack.screeningsIn : 0,
    padIn: usePad ? stack.padIn : 0,
  };

  // Recompute grid size when config changes
  function applyConfig(newConfig: FieldConfig) {
    const newDims = gridDimensions(newConfig);
    setConfig(newConfig);
    setElevations(makeEmptyGrid(newDims.rows, newDims.cols));
    setResults(null);
    setSummary(null);
  }

  function setFieldPreset(type: "football" | "soccer" | "custom") {
    applyConfig(makeDefaultConfig(type));
  }

  function updateZone(key: keyof FieldConfig["zones"], value: number | string) {
    applyConfig({
      ...config,
      zones: { ...config.zones, [key]: typeof value === "string" ? parseFloat(value) || 0 : value },
    });
  }

  function updateCell(row: number, col: number, value: string) {
    setElevations(prev => {
      const next = prev.map(r => [...r]);
      if (!next[row]) next[row] = [];
      next[row][col] = value;
      return next;
    });
  }

  function handleCalculate() {
    const { results: r, summary: s } = analyzeGrid(elevations, config, effectiveStack);
    setResults(r);
    setSummary(s);
    setActiveTab("results");
  }

  function handleDemoData() {
    setElevations(makeDemoGrid(dims.rows, dims.cols, config));
    setResults(null);
    setSummary(null);
  }

  function handleClear() {
    setElevations(makeEmptyGrid(dims.rows, dims.cols));
    setResults(null);
    setSummary(null);
  }

  function handleExportCSV() {
    if (!results || !summary) return;
    const csv = toCsvString(results, summary, config);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "field-grading-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const maxCutFt = summary
    ? Math.max(summary.bellySummary.maxCutDepthFt, summary.extendedSummary.maxCutDepthFt, 0.01)
    : 1;

  // Preview material orders (no elevation data needed)
  const bellyAreaSqFt  = config.zones.bellyLengthFt  * config.zones.bellyWidthFt;
  const extAreaSqFt    = dims.totalLengthFt * dims.totalWidthFt - bellyAreaSqFt;
  const previewBelly   = calcMaterialOrders(bellyAreaSqFt, effectiveStack);
  const previewExt     = calcMaterialOrders(Math.max(0, extAreaSqFt), effectiveStack);
  const previewCombined = calcMaterialOrders(bellyAreaSqFt + Math.max(0, extAreaSqFt), effectiveStack);

  // Laser setup tab state
  const [instrHeight, setInstrHeight] = useState("5.5");
  const [rodProductIn, setRodProductIn] = useState(String(productThicknessIn));
  const rodReading = computeRodReading(
    parseFloat(instrHeight) || 0,
    parseFloat(instrHeight) || 0 - (parseFloat(rodProductIn) || 0) / 12,
  );
  const rodReadingDisplay = ((parseFloat(instrHeight) || 0) - (parseFloat(rodProductIn) || 0) / 12).toFixed(3);

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <a href="/tools" className="text-gray-400 hover:text-gray-600 text-sm">← Tools</a>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">📐 Field Grading Tool</h1>
        <p className="text-gray-500 text-sm mt-1">
          Laser-level survey analysis for turf installation — belly (crowned) + extended zones (sidelines, dzones)
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-2">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-green-700 text-white shadow-sm"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {tab.label}
            {tab.id === "results" && summary && (
              <span className="ml-2 bg-green-100 text-green-800 text-xs px-1.5 py-0.5 rounded-full">Ready</span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB 1: Field & Stack ──────────────────────────────────────────── */}
      {activeTab === "setup" && (
        <div className="space-y-4">
          {/* Section A: Field Dimensions */}
          <Card title="Field Dimensions" emoji="🏟️">
            {/* Preset buttons */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {(["football", "soccer", "custom"] as const).map(type => (
                <ToggleBtn key={type} active={config.fieldType === type} onClick={() => setFieldPreset(type)}>
                  {type === "football" ? "🏈 Football" : type === "soccer" ? "⚽ Soccer" : "📐 Custom"}
                </ToggleBtn>
              ))}
            </div>

            {/* Belly dimensions */}
            <p className="text-xs font-bold text-green-800 uppercase tracking-wide mb-3">Belly (Field of Play)</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <Field label="Length (ft)">
                <NumInput value={String(config.zones.bellyLengthFt)} onChange={v => updateZone("bellyLengthFt", v)} placeholder="360" />
              </Field>
              <Field label="Width (ft)">
                <NumInput value={String(config.zones.bellyWidthFt)} onChange={v => updateZone("bellyWidthFt", v)} placeholder="160" />
              </Field>
              <Field label="Grid Spacing (ft)">
                <NumInput value={String(config.gridSpacingFt)} onChange={v => applyConfig({ ...config, gridSpacingFt: parseFloat(v) || 10, zones: config.zones })} placeholder="10" min={1} />
              </Field>
              <Field label="Elevation Unit">
                <select
                  value={config.elevUnit}
                  onChange={e => applyConfig({ ...config, elevUnit: e.target.value as FieldConfig["elevUnit"] })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="tenths_foot">Tenths of a foot (0.1)</option>
                  <option value="inches">Inches</option>
                  <option value="decimal_feet">Decimal feet</option>
                </select>
              </Field>
            </div>

            {/* Plane method */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <Field label="Belly Plane Method">
                <select
                  value={config.zones.bellyPlaneMethod}
                  onChange={e => updateZone("bellyPlaneMethod", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="crown">Crown (bilateral slope)</option>
                  <option value="best_fit">Best Fit Plane</option>
                  <option value="simple_slope">Simple Slope (longitudinal only)</option>
                </select>
              </Field>
              {config.zones.bellyPlaneMethod === "crown" && (
                <Field label="Crown Slope (%)">
                  <NumInput value={String(config.zones.crownSlopePct)} onChange={v => updateZone("crownSlopePct", v)} placeholder="1.5" min={0} max={5} step="0.1" />
                </Field>
              )}
            </div>

            {/* Extended areas */}
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3 mt-2">Extended Areas (Flat)</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <Field label="Sideline Width — each side (ft)">
                <NumInput value={String(config.zones.sidelineWidthFt)} onChange={v => updateZone("sidelineWidthFt", v)} placeholder="10" min={0} />
              </Field>
              <Field label="End Zone Extension — each end (ft)">
                <NumInput value={String(config.zones.endZoneExtFt)} onChange={v => updateZone("endZoneExtFt", v)} placeholder="10" min={0} />
              </Field>
            </div>

            {/* Grid info banner */}
            <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm">
              <span className="font-semibold text-green-800">
                Total field: {dims.totalLengthFt} × {dims.totalWidthFt} ft
              </span>
              <span className="text-green-700 ml-3">
                Grid: {dims.cols} cols × {dims.rows} rows = <strong>{dims.cols * dims.rows} points</strong>
              </span>
            </div>
          </Card>

          {/* Section B: Material Stack */}
          <Card title="Material Stack" emoji="🪨">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <Field label="Drainage Gravel (in)">
                <NumInput value={String(stack.drainageGravelIn)} onChange={v => setStack(s => ({ ...s, drainageGravelIn: parseFloat(v) || 0 }))} placeholder="4" min={3} max={16} />
              </Field>
              <Field label="Turf Depth (in)">
                <NumInput value={String(stack.turfIn)} onChange={v => setStack(s => ({ ...s, turfIn: parseFloat(v) || 0 }))} placeholder="1.75" min={1.5} max={2.25} step="0.05" />
              </Field>
              <Field label="Turf Roll Width (ft)">
                <NumInput value={String(stack.turfRollWidthFt)} onChange={v => setStack(s => ({ ...s, turfRollWidthFt: parseFloat(v) || 15 }))} placeholder="15" />
              </Field>
              <Field label="Gravel (tons/CY)">
                <select
                  value={stack.gravelTonsPerCY}
                  onChange={e => setStack(s => ({ ...s, gravelTonsPerCY: parseFloat(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="1.4">Crushed Aggregate (1.4)</option>
                  <option value="1.35">Decomposed Granite (1.35)</option>
                  <option value="1.5">Crushed Limestone (1.5)</option>
                  <option value="1.3">Pea Gravel (1.3)</option>
                </select>
              </Field>
            </div>

            {/* Optional layers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div className="rounded-lg border border-gray-200 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <input type="checkbox" id="screenings" checked={useScreenings} onChange={e => setUseScreenings(e.target.checked)} className="w-4 h-4 accent-green-600" />
                  <label htmlFor="screenings" className="text-sm font-semibold text-gray-700 cursor-pointer">Add Screenings / Chips</label>
                </div>
                {useScreenings && (
                  <Field label="Depth (in)">
                    <NumInput value={String(stack.screeningsIn)} onChange={v => setStack(s => ({ ...s, screeningsIn: parseFloat(v) || 0 }))} placeholder="1" min={0.5} max={2} step="0.25" />
                  </Field>
                )}
              </div>
              <div className="rounded-lg border border-gray-200 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <input type="checkbox" id="pad" checked={usePad} onChange={e => setUsePad(e.target.checked)} className="w-4 h-4 accent-green-600" />
                  <label htmlFor="pad" className="text-sm font-semibold text-gray-700 cursor-pointer">Add Pad</label>
                </div>
                {usePad && (
                  <Field label="Depth (in)">
                    <NumInput value={String(stack.padIn)} onChange={v => setStack(s => ({ ...s, padIn: parseFloat(v) || 0 }))} placeholder="0.5" min={0.25} max={2.5} step="0.25" />
                  </Field>
                )}
              </div>
            </div>

            {/* Product thickness banner */}
            <div className="rounded-xl bg-gray-900 text-white p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Total Product Removal</p>
                  <p className="text-3xl font-black text-green-400 mt-1">{productThicknessIn.toFixed(2)}<span className="text-lg font-normal text-gray-300 ml-1">inches</span></p>
                </div>
                <div className="text-right text-sm text-gray-300">
                  <p>{stack.drainageGravelIn}" gravel</p>
                  {useScreenings && <p>+ {stack.screeningsIn}" screenings</p>}
                  {usePad && <p>+ {stack.padIn}" pad</p>}
                  <p>+ {stack.turfIn}" turf</p>
                  <p className="text-xs text-gray-400 mt-1">Sub-grade must be {productThicknessIn.toFixed(2)}" below finish grade</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Section C: Material Orders Preview */}
          <Card title="Material Orders Preview" emoji="📦">
            <p className="text-xs text-gray-500 mb-3">Calculated from field dimensions only — refines after elevation analysis.</p>
            <MaterialOrdersTable belly={previewBelly} extended={previewExt} combined={previewCombined} />

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setActiveTab("entry")}
                className="bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-800 transition-colors"
              >
                Next: Enter Elevations →
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* ── TAB 2: Elevation Entry ─────────────────────────────────────────── */}
      {activeTab === "entry" && (
        <Card title="Elevation Entry" emoji="📏">
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={handleDemoData}
              className="px-3 py-1.5 text-sm font-medium bg-amber-50 border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-100"
            >
              Fill Demo Data
            </button>
            <button
              onClick={handleClear}
              className="px-3 py-1.5 text-sm font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
            >
              Clear All
            </button>
          </div>

          <div className="mb-3 text-xs text-gray-500">
            <span className="inline-block w-3 h-3 rounded bg-white border border-gray-300 mr-1" />Belly (crowned) &nbsp;
            <span className="inline-block w-3 h-3 rounded bg-slate-100 border border-slate-200 mr-1" />Extended areas (flat) — enter all readings across the full footprint
          </div>

          <ElevationGrid
            rows={dims.rows}
            cols={dims.cols}
            values={elevations}
            onChange={updateCell}
            config={config}
          />

          <div className="mt-4 flex gap-3">
            <button
              onClick={handleCalculate}
              className="bg-green-700 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-green-800 transition-colors shadow-sm"
            >
              Calculate Grading →
            </button>
            <button
              onClick={() => setActiveTab("setup")}
              className="px-4 py-3 text-sm font-medium bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50"
            >
              ← Back to Setup
            </button>
          </div>
        </Card>
      )}

      {/* ── TAB 3: Results ────────────────────────────────────────────────── */}
      {activeTab === "results" && (
        <div className="space-y-4">
          {!summary ? (
            <Card title="No Results Yet" emoji="📐">
              <p className="text-gray-500 text-sm mb-4">Enter elevation data and click "Calculate Grading" to see results.</p>
              <button onClick={() => setActiveTab("entry")} className="bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-800">
                Go to Elevation Entry →
              </button>
            </Card>
          ) : (
            <>
              {/* Low area warnings */}
              {(summary.bellySummary.lowPointCount > 0 || summary.extendedSummary.lowPointCount > 0) && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
                  <h3 className="font-bold text-amber-800 mb-3">⚠ Low Areas — Fill Required Before Grading</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {summary.bellySummary.lowPointCount > 0 && (
                      <div>
                        <p className="text-xs font-bold text-amber-700 uppercase mb-2">Belly Zone ({summary.bellySummary.lowPointCount} points)</p>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {summary.bellySummary.lowPoints.map(lp => (
                            <div key={`b-${lp.col}-${lp.row}`} className="text-xs text-amber-800 bg-amber-100 rounded px-2 py-1">
                              Col {lp.col} / Row {lp.row} — add <strong>{lp.deficitIn}"</strong> of fill
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {summary.extendedSummary.lowPointCount > 0 && (
                      <div>
                        <p className="text-xs font-bold text-amber-700 uppercase mb-2">Extended Zone ({summary.extendedSummary.lowPointCount} points)</p>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {summary.extendedSummary.lowPoints.map(lp => (
                            <div key={`e-${lp.col}-${lp.row}`} className="text-xs text-amber-800 bg-amber-100 rounded px-2 py-1">
                              Col {lp.col} / Row {lp.row} — add <strong>{lp.deficitIn}"</strong> of fill
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Heatmap */}
              <Card title="Grade Heatmap" emoji="🗺️">
                <ElevationGrid
                  rows={dims.rows}
                  cols={dims.cols}
                  values={elevations}
                  results={results ?? undefined}
                  maxCutFt={maxCutFt}
                  onChange={() => {}}
                  readOnly
                  config={config}
                />
              </Card>

              {/* Zone summaries */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ZoneSummaryPanel summary={summary.bellySummary} label="Belly Zone (Crown)" />
                <ZoneSummaryPanel summary={summary.extendedSummary} label="Extended Zones (Flat)" />
              </div>

              {/* Combined cut totals */}
              <Card title="Combined Totals" emoji="📊">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <Result label="Total Cut Volume" value={summary.combined.totalCutVolumeCY} unit="CY" highlight />
                  <Result label="Total Fill Volume" value={summary.combined.totalFillVolumeCY} unit="CY" blue />
                  <Result label="Total Field Area" value={summary.combined.totalFieldAreaSqFt.toLocaleString()} unit="sqft" />
                  <Result label="Product Thickness" value={summary.totalProductThicknessIn} unit="in" />
                </div>

                {/* Layer volumes */}
                <div className="mb-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Layer Volumes</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                          <th className="text-left p-2">Layer</th>
                          <th className="text-right p-2">Thickness</th>
                          <th className="text-right p-2">Volume</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.combined.layerVolumes.map(lv => (
                          <tr key={lv.name} className="border-t border-gray-100">
                            <td className="p-2 font-medium text-gray-700">{lv.name}</td>
                            <td className="p-2 text-right text-gray-500">{lv.thicknessIn}"</td>
                            <td className="p-2 text-right font-bold text-gray-800">{lv.volumeCY} CY</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Material orders */}
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Material Orders by Zone</p>
                <MaterialOrdersTable
                  belly={summary.bellySummary.materialOrders}
                  extended={summary.extendedSummary.materialOrders}
                  combined={summary.combined.materialOrders}
                />

                <div className="mt-4 flex gap-3 flex-wrap">
                  <button
                    onClick={handleExportCSV}
                    className="px-4 py-2 bg-green-700 text-white rounded-xl text-sm font-semibold hover:bg-green-800"
                  >
                    Export CSV
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-gray-100 text-gray-700 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-200"
                  >
                    Print Summary
                  </button>
                  <button
                    onClick={() => setActiveTab("entry")}
                    className="px-4 py-2 bg-white text-gray-600 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50"
                  >
                    ← Edit Elevations
                  </button>
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {/* ── TAB 4: Laser Setup & Tips ─────────────────────────────────────── */}
      {activeTab === "laser" && (
        <div className="space-y-4">
          {/* A: Benchmark & Rod Reading */}
          <Card title="Setting Your Benchmark & Sub-grade Rod Reading" emoji="🎯">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Steps */}
              <div className="space-y-3">
                {[
                  { n: 1, text: "Establish a known benchmark — an existing survey monument, corner stake, or permanent mark with a known elevation." },
                  { n: 2, text: "Set up your rotating laser level on stable ground with a clear line of sight across the field." },
                  { n: 3, text: "Read the rod height at your benchmark point with the receiver — this is your Instrument Height (HI)." },
                  { n: 4, text: "Calculate your sub-grade rod reading: HI minus total product thickness." },
                  { n: 5, text: "Set the receiver to this rod reading. When the laser hits the receiver at this setting, the bottom of the rod is exactly at sub-grade." },
                  { n: 6, text: "Walk the field checking grade. Red light = too high (cut needed). Yellow/green = at grade. Blue = too low (fill needed)." },
                ].map(step => (
                  <div key={step.n} className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-green-700 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{step.n}</div>
                    <p className="text-sm text-gray-700">{step.text}</p>
                  </div>
                ))}
              </div>

              {/* Calculator */}
              <div className="bg-gray-50 rounded-xl p-4 h-fit">
                <h3 className="font-bold text-sm text-gray-700 mb-3">Rod Reading Calculator</h3>
                <div className="space-y-3 mb-4">
                  <Field label="Instrument Height (ft)">
                    <NumInput value={instrHeight} onChange={setInstrHeight} placeholder="5.5" step="0.01" />
                  </Field>
                  <Field label={`Total Product Thickness (in) — auto: ${productThicknessIn.toFixed(2)} in`}>
                    <NumInput value={rodProductIn} onChange={setRodProductIn} placeholder={String(productThicknessIn)} step="0.25" />
                  </Field>
                </div>
                <div className="rounded-xl bg-gray-900 text-white p-4 text-center">
                  <p className="text-xs text-gray-400 mb-1">Set receiver to this rod reading for sub-grade</p>
                  <p className="text-4xl font-black text-green-400">{rodReadingDisplay}</p>
                  <p className="text-xs text-gray-400 mt-1">feet</p>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  Formula: HI ({instrHeight || "?"} ft) − product ({rodProductIn || "?"} in ÷ 12) = {rodReadingDisplay} ft
                </p>
              </div>
            </div>
          </Card>

          {/* B: Belly vs Extended */}
          <Card title="Belly vs. Extended Zone Grade Relationship" emoji="🏟️">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3 text-sm text-gray-700">
                <p>The <strong>belly</strong> (field of play) has a crown — the center ridge is the highest point and the field slopes toward both sidelines at {config.zones.crownSlopePct}%.</p>
                <p>The <strong>extended areas</strong> (sidelines, end zones/dzones) are graded <strong>flat</strong> at the same elevation as the belly edge (the lowest point of the crown at the sideline).</p>
                <p>This means:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>Set your sub-grade rod reading from the sideline elevation first</li>
                  <li>Work from the sidelines inward toward the crown ridge</li>
                  <li>The crown peak will naturally be higher by: width/2 × slope% ÷ 100</li>
                  <li>For {config.zones.bellyWidthFt}ft belly at {config.zones.crownSlopePct}%: crown is {((config.zones.bellyWidthFt / 2) * config.zones.crownSlopePct / 100).toFixed(2)} ft above edges</li>
                </ul>
              </div>

              {/* ASCII cross-section diagram */}
              <pre className="bg-gray-900 text-green-400 text-xs rounded-xl p-4 font-mono leading-relaxed overflow-x-auto">
{`  Finish Grade (top of turf):

      sideline  crown  sideline
  ext ┊  /‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\\  ┊ ext
      ┊ /    belly (crown)  \\ ┊
  ────┼/────────────────────\\┼────
      ┊                      ┊
  Sub-grade (below finish):

      ┊  /‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\\  ┊
  ────┼/    sub-grade crown  \\┼────
      ┊                      ┊
  Extended: flat at edge elev ┊

  Gravel fills uniformly between
  sub-grade and finish in all zones.`}
              </pre>
            </div>
          </Card>

          {/* C: Best Practices */}
          <Card title="Laser Grading Best Practices" emoji="✅">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { title: "Verify from Two Directions", body: "Set the laser, shoot the field, then rotate 90° and verify the plane again. Inconsistencies reveal soft ground or instrument drift." },
                { title: "Work High Points First", body: "Always cut from the highest points toward the low. This prevents over-cutting and gives you control over where material ends up." },
                { title: "Flag Low Spots Before Equipment", body: "Walk the entire field with the rod before you start digging. Flag every fill area with paint or stakes. Low spots must be built up before grading begins." },
                { title: "Re-check After Compaction", body: "Soil compacts 0.1–0.3 ft after initial cuts. Run a final grade check after compaction and before placing drainage gravel." },
                { title: "Tolerance: ±0.02 ft (±¼\")", body: "Typical turf sub-base spec. Anything outside this range needs correction. Use your rod reading calculator to verify critical areas." },
                { title: "Obstacles: Goal Posts & Drain Boxes", body: "Mark these on your grid before entry. They create shadow zones where the laser can't reach. Shoot from multiple setups or use a pipe laser for tight areas." },
                { title: "Check Crown Before Equipment", body: "After establishing your grade, walk the full width from sideline to crown ridge checking rod readings. Do this before the excavator or motor grader moves in." },
                { title: "Drainage Slope Minimum", body: "Extended flat zones still need 0.5–1% slope toward field drains or perimeter drain. Confirm this is built into your sub-grade plan." },
              ].map(tip => (
                <div key={tip.title} className="flex gap-3 bg-gray-50 rounded-xl p-3">
                  <div className="text-green-600 mt-0.5 text-lg">✓</div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{tip.title}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{tip.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
