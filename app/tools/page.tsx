"use client";

import { useState } from "react";

// ── Helpers ────────────────────────────────────────────────────────────────

function round(n: number, decimals = 2) {
  return Math.round(n * 10 ** decimals) / 10 ** decimals;
}

// ── Shared UI primitives ───────────────────────────────────────────────────

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

function NumInput({ value, onChange, placeholder = "0", min = 0 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; min?: number;
}) {
  return (
    <input
      type="number"
      min={min}
      step="any"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
    />
  );
}

function Result({ label, value, unit, highlight }: {
  label: string; value: string | number; unit?: string; highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg p-3 ${highlight ? "bg-green-50 border border-green-200" : "bg-gray-50"}`}>
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-xl font-bold ${highlight ? "text-green-700" : "text-gray-900"}`}>
        {value}
        {unit && <span className="text-sm font-normal text-gray-400 ml-1">{unit}</span>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// CALCULATOR 1: Turf / Sqft + Waste
// ══════════════════════════════════════════════════════════════════════════

function TurfCalculator() {
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [waste, setWaste] = useState("10");
  const [rollWidth, setRollWidth] = useState("15");

  const sqft = parseFloat(length) * parseFloat(width) || 0;
  const wastePct = parseFloat(waste) / 100 || 0.1;
  const sqftWithWaste = round(sqft * (1 + wastePct));
  const wasteOnly = round(sqftWithWaste - sqft);
  const rw = parseFloat(rollWidth) || 15;
  const linearFt = sqft > 0 ? round(sqftWithWaste / rw) : 0;

  return (
    <Card title="Turf / Sqft + Waste" emoji="🌿">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Field label="Length (ft)">
          <NumInput value={length} onChange={setLength} placeholder="50" />
        </Field>
        <Field label="Width (ft)">
          <NumInput value={width} onChange={setWidth} placeholder="30" />
        </Field>
        <Field label="Waste %">
          <NumInput value={waste} onChange={setWaste} placeholder="10" />
        </Field>
        <Field label="Roll Width (ft)">
          <NumInput value={rollWidth} onChange={setRollWidth} placeholder="15" />
        </Field>
      </div>
      {sqft > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Result label="Base Sqft" value={sqft.toLocaleString()} unit="sqft" />
          <Result label={`Waste (+${waste}%)`} value={wasteOnly.toLocaleString()} unit="sqft" />
          <Result label="Order This Much" value={sqftWithWaste.toLocaleString()} unit="sqft" highlight />
          <Result label={`Linear Ft (${rw}ft roll)`} value={linearFt.toLocaleString()} unit="lin ft" />
        </div>
      )}
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// CALCULATOR 2: Gravel / Base Material
// ══════════════════════════════════════════════════════════════════════════

function GravelCalculator() {
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [depth, setDepth] = useState("4");
  const [tons, setTons] = useState("1.4");

  const sqft = parseFloat(length) * parseFloat(width) || 0;
  const depthFt = (parseFloat(depth) || 0) / 12;
  const cubicFt = sqft * depthFt;
  const cubicYards = round(cubicFt / 27);
  const cubicYardsPlus10 = round(cubicYards * 1.1);
  const tonsNeeded = round(cubicYardsPlus10 * (parseFloat(tons) || 1.4));

  return (
    <Card title="Gravel / Base Material" emoji="🪨">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Field label="Length (ft)">
          <NumInput value={length} onChange={setLength} placeholder="50" />
        </Field>
        <Field label="Width (ft)">
          <NumInput value={width} onChange={setWidth} placeholder="30" />
        </Field>
        <Field label="Depth (inches)">
          <NumInput value={depth} onChange={setDepth} placeholder="4" />
        </Field>
        <Field label="Tons / Cu Yd">
          <select
            value={tons}
            onChange={(e) => setTons(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="1.4">Crushed Granite (1.4)</option>
            <option value="1.35">Decomposed Granite (1.35)</option>
            <option value="1.5">Crushed Limestone (1.5)</option>
            <option value="1.3">Pea Gravel (1.3)</option>
            <option value="1.25">River Rock (1.25)</option>
          </select>
        </Field>
      </div>
      {sqft > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Result label="Area" value={sqft.toLocaleString()} unit="sqft" />
          <Result label="Cubic Yards" value={cubicYards} unit="yd³" />
          <Result label="With 10% Buffer" value={cubicYardsPlus10} unit="yd³" highlight />
          <Result label="Tons to Order" value={tonsNeeded} unit="tons" highlight />
        </div>
      )}
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// CALCULATOR 3 & 4: Dual Infill
// ══════════════════════════════════════════════════════════════════════════

const INFILL_TYPES = [
  { label: "Zeofill / Zeolite", lbsPerSqft: 1.5, bagLbs: 50 },
  { label: "Silica Sand", lbsPerSqft: 2.5, bagLbs: 50 },
  { label: "Crumb Rubber", lbsPerSqft: 2.0, bagLbs: 50 },
  { label: "Cork (organic)", lbsPerSqft: 1.0, bagLbs: 44 },
  { label: "Durafill Sand", lbsPerSqft: 2.0, bagLbs: 50 },
  { label: "HybridFill", lbsPerSqft: 1.75, bagLbs: 50 },
];

function DualInfillCalculator() {
  const [mode, setMode] = useState<"single" | "dual">("single");
  const [sqft, setSqft] = useState("");

  const [l1Idx, setL1Idx] = useState(1);
  const [l1Rate, setL1Rate] = useState(String(INFILL_TYPES[1].lbsPerSqft));
  const [l1Price, setL1Price] = useState("");

  const [l2Idx, setL2Idx] = useState(2);
  const [l2Rate, setL2Rate] = useState(String(INFILL_TYPES[2].lbsPerSqft));
  const [l2Price, setL2Price] = useState("");

  const area = parseFloat(sqft) || 0;

  const l1 = INFILL_TYPES[l1Idx];
  const l1TotalLbs = round(area * (parseFloat(l1Rate) || l1.lbsPerSqft));
  const l1Bags = Math.ceil(l1TotalLbs / l1.bagLbs);
  const l1BagsPlus5 = Math.ceil(l1Bags * 1.05);
  const l1Cost = l1Price ? round(l1BagsPlus5 * parseFloat(l1Price)) : null;

  const l2 = INFILL_TYPES[l2Idx];
  const l2TotalLbs = round(area * (parseFloat(l2Rate) || l2.lbsPerSqft));
  const l2Bags = Math.ceil(l2TotalLbs / l2.bagLbs);
  const l2BagsPlus5 = Math.ceil(l2Bags * 1.05);
  const l2Cost = l2Price ? round(l2BagsPlus5 * parseFloat(l2Price)) : null;

  const totalCost = (l1Cost ?? 0) + (l2Cost ?? 0);

  const PRESETS = [
    { label: "Sand + Rubber", l1: 1, l2: 2 },
    { label: "Sand + Cork", l1: 1, l2: 3 },
    { label: "Sand + Zeofill", l1: 1, l2: 0 },
    { label: "Sand + HybridFill", l1: 1, l2: 5 },
  ];

  function applyPreset(p: { l1: number; l2: number }) {
    setL1Idx(p.l1);
    setL1Rate(String(INFILL_TYPES[p.l1].lbsPerSqft));
    setL2Idx(p.l2);
    setL2Rate(String(INFILL_TYPES[p.l2].lbsPerSqft));
    setMode("dual");
  }

  return (
    <Card title="Infill Calculator" emoji="🏖️">
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <div className="flex gap-2">
          {([["single", "Single Layer"], ["dual", "Dual Layer"]] as const).map(([m, lbl]) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                mode === m ? "bg-green-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
        {mode === "dual" && (
          <div className="flex gap-1 flex-wrap ml-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => applyPreset(p)}
                className="px-2 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded text-xs font-medium hover:bg-blue-100"
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mb-4 max-w-xs">
        <Field label="Total Sqft">
          <NumInput value={sqft} onChange={setSqft} placeholder="1500" />
        </Field>
      </div>

      <div className={`rounded-xl border p-4 mb-3 ${mode === "dual" ? "border-amber-200 bg-amber-50/30" : "border-gray-200"}`}>
        {mode === "dual" && <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-3">Layer 1 — Base (Sand)</p>}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <Field label="Infill Type">
            <select
              value={l1Idx}
              onChange={(e) => { const i = parseInt(e.target.value); setL1Idx(i); setL1Rate(String(INFILL_TYPES[i].lbsPerSqft)); }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {INFILL_TYPES.map((t, i) => <option key={t.label} value={i}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Rate (lbs/sqft)">
            <NumInput value={l1Rate} onChange={setL1Rate} placeholder={String(l1.lbsPerSqft)} />
          </Field>
          <Field label="Price / Bag ($)">
            <NumInput value={l1Price} onChange={setL1Price} placeholder="12.00" />
          </Field>
        </div>
        {area > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Result label="Total Lbs" value={l1TotalLbs.toLocaleString()} unit="lbs" />
            <Result label={`${l1.bagLbs}lb Bags`} value={l1Bags} unit="bags" />
            <Result label="Order (+5%)" value={l1BagsPlus5} unit="bags" highlight />
            {l1Cost !== null && <Result label="Layer Cost" value={`$${l1Cost.toLocaleString()}`} highlight />}
          </div>
        )}
      </div>

      {mode === "dual" && (
        <div className="rounded-xl border border-green-200 bg-green-50/30 p-4 mb-3">
          <p className="text-xs font-bold text-green-800 uppercase tracking-wide mb-3">Layer 2 — Top (Rubber / Cork / etc.)</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <Field label="Infill Type">
              <select
                value={l2Idx}
                onChange={(e) => { const i = parseInt(e.target.value); setL2Idx(i); setL2Rate(String(INFILL_TYPES[i].lbsPerSqft)); }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {INFILL_TYPES.map((t, i) => <option key={t.label} value={i}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Rate (lbs/sqft)">
              <NumInput value={l2Rate} onChange={setL2Rate} placeholder={String(l2.lbsPerSqft)} />
            </Field>
            <Field label="Price / Bag ($)">
              <NumInput value={l2Price} onChange={setL2Price} placeholder="18.00" />
            </Field>
          </div>
          {area > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Result label="Total Lbs" value={l2TotalLbs.toLocaleString()} unit="lbs" />
              <Result label={`${l2.bagLbs}lb Bags`} value={l2Bags} unit="bags" />
              <Result label="Order (+5%)" value={l2BagsPlus5} unit="bags" highlight />
              {l2Cost !== null && <Result label="Layer Cost" value={`$${l2Cost.toLocaleString()}`} highlight />}
            </div>
          )}
        </div>
      )}

      {mode === "dual" && area > 0 && (l1Cost !== null || l2Cost !== null) && (
        <div className="rounded-xl bg-gray-900 text-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Total Infill Cost (Both Layers)</p>
              <p className="text-3xl font-black text-green-400 mt-1">${totalCost.toLocaleString()}</p>
            </div>
            <div className="text-right text-sm text-gray-300">
              <p>{l1BagsPlus5} bags {l1.label}</p>
              <p>{l2BagsPlus5} bags {l2.label}</p>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-3">
        All quantities include 5% overage. Adjust lbs/sqft rate based on pile height and depth spec.
      </p>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// CALCULATOR 5: Concrete
// ══════════════════════════════════════════════════════════════════════════

function ConcreteCalculator() {
  const [shape, setShape] = useState<"rect" | "circle">("rect");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [diameter, setDiameter] = useState("");
  const [depth, setDepth] = useState("4");
  const [bagSize, setBagSize] = useState<"60" | "80">("80");
  const [pricePerBag, setPricePerBag] = useState("");

  const depthFt = (parseFloat(depth) || 0) / 12;
  let cubicFt = 0;
  if (shape === "rect") {
    cubicFt = (parseFloat(length) || 0) * (parseFloat(width) || 0) * depthFt;
  } else {
    const r = (parseFloat(diameter) || 0) / 2;
    cubicFt = Math.PI * r * r * depthFt;
  }

  const cubicYards = round(cubicFt / 27);
  const cubicYardsPlus10 = round(cubicYards * 1.1);
  const bagsPerYard = bagSize === "60" ? 40 : 30;
  const bags = Math.ceil(cubicYardsPlus10 * bagsPerYard);
  const totalCost = pricePerBag ? round(bags * parseFloat(pricePerBag)) : null;
  const hasInput = shape === "rect"
    ? parseFloat(length) > 0 && parseFloat(width) > 0
    : parseFloat(diameter) > 0;

  return (
    <Card title="Concrete Calculator" emoji="🧱">
      <div className="flex gap-2 mb-4">
        {([["rect", "Rectangular Slab"], ["circle", "Circular Slab"]] as const).map(([s, lbl]) => (
          <button
            key={s}
            onClick={() => setShape(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              shape === s ? "bg-green-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {lbl}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {shape === "rect" ? (
          <>
            <Field label="Length (ft)"><NumInput value={length} onChange={setLength} placeholder="20" /></Field>
            <Field label="Width (ft)"><NumInput value={width} onChange={setWidth} placeholder="10" /></Field>
          </>
        ) : (
          <Field label="Diameter (ft)"><NumInput value={diameter} onChange={setDiameter} placeholder="12" /></Field>
        )}
        <Field label="Depth (inches)"><NumInput value={depth} onChange={setDepth} placeholder="4" /></Field>
        <Field label="Bag Size">
          <select value={bagSize} onChange={(e) => setBagSize(e.target.value as "60" | "80")} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
            <option value="80">80 lb bag</option>
            <option value="60">60 lb bag</option>
          </select>
        </Field>
        <Field label="Price / Bag ($)"><NumInput value={pricePerBag} onChange={setPricePerBag} placeholder="7.50" /></Field>
      </div>
      {hasInput && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Result label="Cubic Feet" value={round(cubicFt)} unit="ft³" />
            <Result label="Cubic Yards" value={cubicYards} unit="yd³" />
            <Result label="Yards + 10% Buffer" value={cubicYardsPlus10} unit="yd³" highlight />
            <Result label={`${bagSize}lb Bags Needed`} value={bags.toLocaleString()} unit="bags" highlight />
          </div>
          {totalCost !== null && (
            <div className="mt-3 rounded-lg p-3 bg-green-50 border border-green-200">
              <div className="text-xs text-gray-500">Estimated Material Cost</div>
              <div className="text-2xl font-bold text-green-700">${totalCost.toLocaleString()}</div>
            </div>
          )}
          <p className="text-xs text-gray-400 mt-3">
            Approximate: 1 yd³ ≈ {bagsPerYard} × {bagSize}lb bags. Always add 10% for waste and spillage.
          </p>
        </>
      )}
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// FIELD LAYOUTS
// ══════════════════════════════════════════════════════════════════════════

function FootballLayout() {
  const [level, setLevel] = useState<"nfl" | "ncaa" | "hs">("nfl");

  const specs = {
    nfl: {
      label: "NFL / Pro",
      fieldLength: "360 ft (120 yds total)",
      fieldWidth: "160 ft (53⅓ yds)",
      playingLength: "300 ft (100 yds)",
      endZone: "30 ft (10 yds) each end",
      hashMarks: "70 ft 9 in from each sideline",
      hashSpacing: "18 ft 6 in apart",
      goalpostOffset: "On end line",
      goalpostWidth: "18 ft 6 in",
      notes: "Hash marks align with uprights. Numbers are 6 ft tall, 4 ft wide.",
    },
    ncaa: {
      label: "NCAA / College",
      fieldLength: "360 ft (120 yds total)",
      fieldWidth: "160 ft (53⅓ yds)",
      playingLength: "300 ft (100 yds)",
      endZone: "30 ft (10 yds) each end",
      hashMarks: "60 ft from each sideline",
      hashSpacing: "40 ft apart",
      goalpostOffset: "On end line",
      goalpostWidth: "18 ft 6 in",
      notes: "Wider hash spacing than NFL. Numbers same size.",
    },
    hs: {
      label: "High School",
      fieldLength: "360 ft (120 yds total)",
      fieldWidth: "160 ft (53⅓ yds)",
      playingLength: "300 ft (100 yds)",
      endZone: "30 ft (10 yds) each end",
      hashMarks: "53 ft 4 in from each sideline",
      hashSpacing: "53 ft 4 in apart",
      goalpostOffset: "On end line",
      goalpostWidth: "23 ft 4 in",
      notes: "Widest hash spacing. Goalpost wider than college/pro.",
    },
  };

  const s = specs[level];

  return (
    <Card title="Football Field Layout" emoji="🏈">
      <div className="flex gap-2 mb-4">
        {(["nfl", "ncaa", "hs"] as const).map((l) => (
          <button key={l} onClick={() => setLevel(l)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${level === l ? "bg-green-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {specs[l].label}
          </button>
        ))}
      </div>
      <pre className="bg-gray-900 text-green-400 text-xs rounded-lg p-4 overflow-x-auto leading-relaxed mb-4 font-mono">
{`┌─────────────────────────────────────┐
│         END ZONE (10 yds)           │
├──────┬──────────────────────┬───────┤  ← Goal Line
│      │  ·····hash·marks·····│       │
│      │                      │       │  ← 50 yd line
│      │  ·····hash·marks·····│       │
├──────┴──────────────────────┴───────┤  ← Goal Line
│         END ZONE (10 yds)           │
└─────────────────────────────────────┘
  ←──────── ${s.fieldWidth} ────────→`}
      </pre>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        {[
          ["Total Field", s.fieldLength], ["Width", s.fieldWidth],
          ["Playing Field", s.playingLength], ["Each End Zone", s.endZone],
          ["Hash Marks", s.hashMarks], ["Hash Spacing", s.hashSpacing],
          ["Goal Post Width", s.goalpostWidth], ["Goal Post Position", s.goalpostOffset],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between bg-gray-50 rounded px-3 py-1.5">
            <span className="text-gray-500">{k}</span>
            <span className="font-medium">{v}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-3">{s.notes}</p>
    </Card>
  );
}

function BaseballLayout() {
  const [level, setLevel] = useState<"mlb" | "youth60" | "youth50">("mlb");

  const specs = {
    mlb: { label: "MLB / Adult", bases: "90 ft", pitching: "60 ft 6 in", homeToSecond: "127 ft 3⅜ in", foulLine: "Min 325 ft (LF/RF), 400 ft center", infieldGrass: "95 ft radius from home plate", moundHeight: "10 in above home plate", baseSize: "15 in × 15 in", homePlate: "17 in wide" },
    youth60: { label: "Youth 60/90", bases: "90 ft", pitching: "60 ft", homeToSecond: "127 ft 3 in", foulLine: "200 ft minimum", infieldGrass: "95 ft radius", moundHeight: "6 in", baseSize: "15 in × 15 in", homePlate: "17 in wide" },
    youth50: { label: "Youth 50/70", bases: "70 ft", pitching: "50 ft", homeToSecond: "99 ft", foulLine: "200 ft minimum", infieldGrass: "70 ft radius", moundHeight: "6 in", baseSize: "15 in × 15 in", homePlate: "17 in wide" },
  };

  const s = specs[level];

  return (
    <Card title="Baseball Field Layout" emoji="⚾">
      <div className="flex gap-2 mb-4">
        {(["mlb", "youth60", "youth50"] as const).map((l) => (
          <button key={l} onClick={() => setLevel(l)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${level === l ? "bg-green-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {specs[l].label}
          </button>
        ))}
      </div>
      <pre className="bg-gray-900 text-green-400 text-xs rounded-lg p-4 overflow-x-auto leading-relaxed mb-4 font-mono">
{`              CF
             /   \\
           LF     RF
          /         \\
    ─────────────────────
    |   2B            |
    |  /  \\           |
    | 3B    1B        |
    |    HP           |
    ─────────────────────
  ← Foul Line          Foul Line →
     Base path: ${s.bases} square`}
      </pre>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        {[
          ["Base Path", s.bases], ["Pitching Distance", s.pitching],
          ["Home → 2nd Base", s.homeToSecond], ["Foul Lines", s.foulLine],
          ["Infield Radius", s.infieldGrass], ["Mound Height", s.moundHeight],
          ["Base Size", s.baseSize], ["Home Plate Width", s.homePlate],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between bg-gray-50 rounded px-3 py-1.5">
            <span className="text-gray-500">{k}</span>
            <span className="font-medium">{v}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
        <strong>Setting bases:</strong> Place home plate first. Run string from center at 45° to find 1st and 3rd. Second base is exactly {s.homeToSecond} from home plate along the diagonal. Use a 3-4-5 triangle to verify square corners.
      </div>
    </Card>
  );
}

function SoccerLayout() {
  const [level, setLevel] = useState<"fifa" | "hs" | "youth">("fifa");

  const specs = {
    fifa: { label: "FIFA / Adult", length: "100–110 m (330–360 ft)", width: "64–75 m (210–246 ft)", penaltyArea: "40.3 m × 16.5 m", goalArea: "18.3 m × 5.5 m", centerCircle: "9.15 m radius", penaltySpot: "11 m (36 ft) from goal line", goalWidth: "7.32 m (8 yds) × 2.44 m high", cornerRadius: "1 m arc" },
    hs: { label: "High School", length: "100–120 yds (300–360 ft)", width: "55–80 yds (165–240 ft)", penaltyArea: "44 yds × 18 yds", goalArea: "20 yds × 6 yds", centerCircle: "10 yd radius", penaltySpot: "12 yds from goal line", goalWidth: "8 yds × 8 ft high", cornerRadius: "1 yd arc" },
    youth: { label: "Youth (U10–U12)", length: "70–80 yds", width: "45–55 yds", penaltyArea: "36 yds × 14 yds", goalArea: "14 yds × 5 yds", centerCircle: "8 yd radius", penaltySpot: "10 yds from goal line", goalWidth: "6 yds × 6 ft high", cornerRadius: "1 yd arc" },
  };

  const s = specs[level];

  return (
    <Card title="Soccer Field Layout" emoji="⚽">
      <div className="flex gap-2 mb-4">
        {(["fifa", "hs", "youth"] as const).map((l) => (
          <button key={l} onClick={() => setLevel(l)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${level === l ? "bg-green-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {specs[l].label}
          </button>
        ))}
      </div>
      <pre className="bg-gray-900 text-green-400 text-xs rounded-lg p-4 overflow-x-auto leading-relaxed mb-4 font-mono">
{`┌─────────────────────────────────────────┐
│ ┌──────────┐           ┌──────────┐     │
│ │ Goal Area│           │ Goal Area│     │
│ ├──────────┴───────────┴──────────┤     │
│ │         Penalty Area            │     │
│ │              · (spot)           │     │
│ ├─────────────────────────────────┤     │
│              (○) Center Circle         │
│ ├─────────────────────────────────┤     │
│ │         Penalty Area            │     │
│ │              · (spot)           │     │
│ ├──────────┬───────────┬──────────┤     │
│ │ Goal Area│           │ Goal Area│     │
│ └──────────┘           └──────────┘     │
└─────────────────────────────────────────┘`}
      </pre>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        {[
          ["Field Length", s.length], ["Field Width", s.width],
          ["Penalty Area", s.penaltyArea], ["Goal Area", s.goalArea],
          ["Center Circle", s.centerCircle], ["Penalty Spot", s.penaltySpot],
          ["Goal Size", s.goalWidth], ["Corner Arc", s.cornerRadius],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between bg-gray-50 rounded px-3 py-1.5">
            <span className="text-gray-500">{k}</span>
            <span className="font-medium">{v}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
        <strong>Marking order:</strong> Mark center spot → measure out touchlines → mark goal lines → measure penalty areas → mark center circle → mark corner arcs last.
      </div>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// CALCULATOR 6: French Drain / Trench
// ══════════════════════════════════════════════════════════════════════════

interface DrainRun {
  id: number;
  name: string;
  linearFt: string;
  widthIn: string;
  depthIn: string;
  pipeDiamIn: string;
  gravelTonsPerCY: string;
}

let _drainId = 0;
function newRun(name = ""): DrainRun {
  return { id: ++_drainId, name, linearFt: "", widthIn: "12", depthIn: "18", pipeDiamIn: "4", gravelTonsPerCY: "1.4" };
}

function calcRunVolumes(run: DrainRun) {
  const lf        = parseFloat(run.linearFt) || 0;
  const wFt       = (parseFloat(run.widthIn) || 0) / 12;
  const dFt       = (parseFloat(run.depthIn) || 0) / 12;
  const pipeDFt   = (parseFloat(run.pipeDiamIn) || 0) / 12;
  const tonsPerCY = parseFloat(run.gravelTonsPerCY) || 1.4;

  const trenchCuFt   = lf * wFt * dFt;
  const trenchCY     = round(trenchCuFt / 27);
  const pipeCuFt     = Math.PI * (pipeDFt / 2) ** 2 * lf;
  const gravelCuFt   = Math.max(0, trenchCuFt - pipeCuFt);
  const gravelCY     = round(gravelCuFt / 27);
  const gravelTons   = round(gravelCY * tonsPerCY);
  // fabric wraps bottom + two sides; top is open (trench perim = w + 2d, per linear ft)
  const fabricSqFt   = round(lf * ((parseFloat(run.widthIn) || 0) / 12 + 2 * (parseFloat(run.depthIn) || 0) / 12));

  return { lf, trenchCY, gravelCY, gravelTons, fabricSqFt };
}

const PIPE_SIZES = ["2", "3", "4", "6", "8", "10", "12"];
const GRAVEL_TYPES = [
  { label: "Drain Rock / Pea Gravel (1.3)", value: "1.3" },
  { label: "Crushed Granite (1.4)", value: "1.4" },
  { label: "Crushed Limestone (1.5)", value: "1.5" },
];

function FrenchDrainCalculator() {
  const [runs, setRuns] = useState<DrainRun[]>([newRun("Perimeter")]);

  function updateRun(id: number, key: keyof DrainRun, val: string) {
    setRuns(prev => prev.map(r => r.id === id ? { ...r, [key]: val } : r));
  }

  function addRun() {
    setRuns(prev => [...prev, newRun(`Run ${prev.length + 1}`)]);
  }

  function removeRun(id: number) {
    setRuns(prev => prev.filter(r => r.id !== id));
  }

  const computed = runs.map(r => ({ ...r, ...calcRunVolumes(r) }));
  const totals = computed.reduce(
    (acc, r) => ({
      lf:         acc.lf + r.lf,
      trenchCY:   acc.trenchCY + r.trenchCY,
      gravelCY:   acc.gravelCY + r.gravelCY,
      gravelTons: acc.gravelTons + r.gravelTons,
      fabricSqFt: acc.fabricSqFt + r.fabricSqFt,
    }),
    { lf: 0, trenchCY: 0, gravelCY: 0, gravelTons: 0, fabricSqFt: 0 }
  );

  const hasAny = computed.some(r => r.lf > 0);

  return (
    <Card title="French Drain / Trench Calculator" emoji="🌊">
      <p className="text-xs text-gray-500 mb-4">
        Add each drain run separately — perimeter, center spine, cross drains, goal area, etc. Gravel fill accounts for pipe displacement.
      </p>

      {/* Run rows */}
      <div className="space-y-3 mb-4">
        {runs.map((run, idx) => {
          const v = computed[idx];
          return (
            <div key={run.id} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              {/* Run header */}
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="text"
                  value={run.name}
                  onChange={e => updateRun(run.id, "name", e.target.value)}
                  placeholder="Run name (e.g. Perimeter)"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                {runs.length > 1 && (
                  <button
                    onClick={() => removeRun(run.id)}
                    className="px-2 py-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>

              {/* Run inputs */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
                <Field label="Linear Feet">
                  <NumInput value={run.linearFt} onChange={v => updateRun(run.id, "linearFt", v)} placeholder="200" />
                </Field>
                <Field label="Trench Width (in)">
                  <NumInput value={run.widthIn} onChange={v => updateRun(run.id, "widthIn", v)} placeholder="12" />
                </Field>
                <Field label="Trench Depth (in)">
                  <NumInput value={run.depthIn} onChange={v => updateRun(run.id, "depthIn", v)} placeholder="18" />
                </Field>
                <Field label="Pipe Dia. (in)">
                  <select
                    value={run.pipeDiamIn}
                    onChange={e => updateRun(run.id, "pipeDiamIn", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {PIPE_SIZES.map(s => <option key={s} value={s}>{s}" pipe</option>)}
                  </select>
                </Field>
                <Field label="Gravel Type">
                  <select
                    value={run.gravelTonsPerCY}
                    onChange={e => updateRun(run.id, "gravelTonsPerCY", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {GRAVEL_TYPES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                  </select>
                </Field>
              </div>

              {/* Per-run results */}
              {v.lf > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <Result label="Linear Ft" value={v.lf.toLocaleString()} unit="ft" />
                  <Result label="Excavation" value={v.trenchCY} unit="CY" />
                  <Result label="Drain Gravel" value={v.gravelCY} unit="CY" highlight />
                  <Result label="Gravel Tons" value={v.gravelTons} unit="tons" highlight />
                  <Result label="Filter Fabric" value={v.fabricSqFt.toLocaleString()} unit="sqft" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add run button */}
      <button
        onClick={addRun}
        className="w-full py-2 rounded-xl border-2 border-dashed border-gray-300 text-sm text-gray-500 hover:border-green-400 hover:text-green-700 transition-colors mb-4"
      >
        + Add Another Drain Run
      </button>

      {/* Totals */}
      {hasAny && (
        <div className="rounded-xl bg-gray-900 text-white p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Project Drain Totals</p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: "Total Linear Ft", value: round(totals.lf, 0).toLocaleString(), unit: "ft" },
              { label: "Total Excavation", value: round(totals.trenchCY), unit: "CY" },
              { label: "Total Drain Gravel", value: round(totals.gravelCY), unit: "CY", green: true },
              { label: "Gravel Tons", value: round(totals.gravelTons), unit: "tons", green: true },
              { label: "Filter Fabric", value: round(totals.fabricSqFt, 0).toLocaleString(), unit: "sqft" },
            ].map(item => (
              <div key={item.label}>
                <p className="text-xs text-gray-400">{item.label}</p>
                <p className={`text-xl font-bold ${item.green ? "text-green-400" : "text-white"}`}>
                  {item.value} <span className="text-sm font-normal text-gray-400">{item.unit}</span>
                </p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Gravel fill = trench volume minus pipe displacement. Fabric covers trench bottom + both walls.
          </p>
        </div>
      )}
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// CALCULATOR 7: Project Takeoff Summary
// ══════════════════════════════════════════════════════════════════════════

interface RemovalLine {
  id: number;
  label: string;
  cy: string;
}

interface MaterialLine {
  id: number;
  label: string;
  cy: string;
  tonsPerCY: string;
  sqft: string;
  linFt: string;
  unit: "cy" | "sqft";
}

let _remId = 0;
let _matId = 0;

function ProjectTakeoffCalculator() {
  // Removal section
  const [soilLbs, setSoilLbs] = useState("2700");
  const [truckCY, setTruckCY] = useState("14");
  const [removalLines, setRemovalLines] = useState<RemovalLine[]>([
    { id: ++_remId, label: "Field Sub-grade Cut", cy: "" },
    { id: ++_remId, label: "French Drain Excavation", cy: "" },
  ]);

  // Material order section
  const [fillDirtCY, setFillDirtCY] = useState("");
  const [matLines, setMatLines] = useState<MaterialLine[]>([
    { id: ++_matId, label: "Field Drainage Gravel", cy: "", tonsPerCY: "1.4", sqft: "", linFt: "", unit: "cy" },
    { id: ++_matId, label: "French Drain Gravel",   cy: "", tonsPerCY: "1.3", sqft: "", linFt: "", unit: "cy" },
    { id: ++_matId, label: "Screenings / Chips",    cy: "", tonsPerCY: "1.35", sqft: "", linFt: "", unit: "cy" },
    { id: ++_matId, label: "Pad",                   cy: "", tonsPerCY: "0",   sqft: "", linFt: "", unit: "sqft" },
    { id: ++_matId, label: "Turf",                  cy: "", tonsPerCY: "0",   sqft: "", linFt: "", unit: "sqft" },
  ]);

  function updateRemoval(id: number, key: keyof RemovalLine, val: string) {
    setRemovalLines(prev => prev.map(r => r.id === id ? { ...r, [key]: val } : r));
  }
  function addRemoval() {
    setRemovalLines(prev => [...prev, { id: ++_remId, label: "Other Removal", cy: "" }]);
  }
  function removeRemoval(id: number) {
    setRemovalLines(prev => prev.filter(r => r.id !== id));
  }

  function updateMat(id: number, key: keyof MaterialLine, val: string) {
    setMatLines(prev => prev.map(m => m.id === id ? { ...m, [key]: val } : m));
  }
  function addMaterial() {
    setMatLines(prev => [...prev, { id: ++_matId, label: "Other Material", cy: "", tonsPerCY: "1.4", sqft: "", linFt: "", unit: "cy" }]);
  }
  function removeMat(id: number) {
    setMatLines(prev => prev.filter(m => m.id !== id));
  }

  // Removal totals
  const totalRemovalCY = removalLines.reduce((s, r) => s + (parseFloat(r.cy) || 0), 0);
  const fillDirtCYNum = parseFloat(fillDirtCY) || 0;
  const netRemovalCY = Math.max(0, totalRemovalCY - fillDirtCYNum);
  const soilLbsNum = parseFloat(soilLbs) || 2700;
  const truckCYNum = parseFloat(truckCY) || 14;
  const totalRemovalTons = round((totalRemovalCY * soilLbsNum) / 2000);
  const truckLoads = Math.ceil(netRemovalCY / truckCYNum);

  // Material totals
  const totalGravelCY = matLines
    .filter(m => m.unit === "cy" && m.tonsPerCY !== "0")
    .reduce((s, m) => s + (parseFloat(m.cy) || 0), 0);
  const totalGravelTons = matLines
    .filter(m => m.unit === "cy" && m.tonsPerCY !== "0")
    .reduce((s, m) => s + round((parseFloat(m.cy) || 0) * (parseFloat(m.tonsPerCY) || 0)), 0);

  const sel = "w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500";

  return (
    <Card title="Project Takeoff Summary" emoji="📋">
      <p className="text-xs text-gray-500 mb-5">
        Aggregate numbers from the grading tool, French drain calc, and any other sources to get one complete project summary.
      </p>

      {/* ── REMOVAL ── */}
      <div className="mb-6">
        <h3 className="font-bold text-sm text-gray-800 mb-1">Material Removal (Haul-Off)</h3>
        <p className="text-xs text-gray-500 mb-3">Enter cubic yards from each source. Use numbers from the Field Grading and French Drain tools above.</p>

        <div className="space-y-2 mb-3">
          {removalLines.map(line => (
            <div key={line.id} className="flex gap-2 items-center">
              <input
                type="text"
                value={line.label}
                onChange={e => updateRemoval(line.id, "label", e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Item name"
              />
              <div className="w-28 shrink-0">
                <NumInput value={line.cy} onChange={v => updateRemoval(line.id, "cy", v)} placeholder="0" />
              </div>
              <span className="text-xs text-gray-400 shrink-0">CY</span>
              <button
                onClick={() => removeRemoval(line.id)}
                className="text-xs text-gray-300 hover:text-red-400 shrink-0 px-1"
              >✕</button>
            </div>
          ))}
        </div>

        <button
          onClick={addRemoval}
          className="text-xs text-green-700 hover:text-green-800 font-medium mb-4"
        >
          + Add removal item
        </button>

        {/* Soil weight + truck size */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <Field label="Soil Weight (lbs/CY)">
            <NumInput value={soilLbs} onChange={setSoilLbs} placeholder="2700" />
          </Field>
          <Field label="Fill Dirt Needed (CY)">
            <NumInput value={fillDirtCY} onChange={setFillDirtCY} placeholder="0" />
          </Field>
          <Field label="Truck Size (CY)">
            <select value={truckCY} onChange={e => setTruckCY(e.target.value)} className={sel}>
              <option value="10">10 CY — small dump</option>
              <option value="14">14 CY — tandem</option>
              <option value="18">18 CY — tri-axle</option>
              <option value="20">20 CY — semi</option>
            </select>
          </Field>
        </div>

        {/* Removal results */}
        {totalRemovalCY > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Result label="Total Removal" value={round(totalRemovalCY)} unit="CY" />
            <Result label="Est. Weight" value={totalRemovalTons.toLocaleString()} unit="tons" />
            <Result label={`Net Haul-Off (after ${fillDirtCYNum > 0 ? `${fillDirtCYNum} CY fill` : "fill"})`} value={round(netRemovalCY)} unit="CY" highlight />
            <Result label={`Truck Loads (${truckCY} CY)`} value={truckLoads} unit="loads" highlight />
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 mb-6" />

      {/* ── MATERIALS IN ── */}
      <div className="mb-4">
        <h3 className="font-bold text-sm text-gray-800 mb-1">Materials to Bring In</h3>
        <p className="text-xs text-gray-500 mb-3">Enter quantities per material type. CY-based materials show tonnage; sqft-based show area only.</p>

        <div className="space-y-2 mb-3">
          {matLines.map(line => (
            <div key={line.id} className="rounded-lg border border-gray-100 bg-gray-50 p-2">
              <div className="flex gap-2 items-center mb-2">
                <input
                  type="text"
                  value={line.label}
                  onChange={e => updateMat(line.id, "label", e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <select value={line.unit} onChange={e => updateMat(line.id, "unit", e.target.value as "cy"|"sqft")} className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="cy">CY</option>
                  <option value="sqft">sqft</option>
                </select>
                <button onClick={() => removeMat(line.id)} className="text-xs text-gray-300 hover:text-red-400 px-1">✕</button>
              </div>
              <div className="flex gap-2 flex-wrap">
                {line.unit === "cy" ? (
                  <>
                    <div className="w-28">
                      <NumInput value={line.cy} onChange={v => updateMat(line.id, "cy", v)} placeholder="0 CY" />
                    </div>
                    {line.tonsPerCY !== "0" && (
                      <div className="w-32">
                        <select value={line.tonsPerCY} onChange={e => updateMat(line.id, "tonsPerCY", e.target.value)} className="w-full border border-gray-300 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-green-500">
                          <option value="1.3">1.3 t/CY</option>
                          <option value="1.35">1.35 t/CY</option>
                          <option value="1.4">1.4 t/CY</option>
                          <option value="1.5">1.5 t/CY</option>
                        </select>
                      </div>
                    )}
                    {(parseFloat(line.cy) || 0) > 0 && line.tonsPerCY !== "0" && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-green-50 border border-green-200 rounded-lg text-xs font-semibold text-green-700">
                        {round((parseFloat(line.cy) || 0) * parseFloat(line.tonsPerCY))} tons
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="w-28">
                      <NumInput value={line.sqft} onChange={v => updateMat(line.id, "sqft", v)} placeholder="0 sqft" />
                    </div>
                    <div className="w-28">
                      <NumInput value={line.linFt} onChange={v => updateMat(line.id, "linFt", v)} placeholder="0 lin ft" />
                    </div>
                    <div className="flex items-center text-xs text-gray-400 gap-2">
                      <span>sqft / lin ft</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addMaterial}
          className="text-xs text-green-700 hover:text-green-800 font-medium mb-4"
        >
          + Add material item
        </button>
      </div>

      {/* Grand summary bar */}
      {(totalRemovalCY > 0 || totalGravelCY > 0) && (
        <div className="rounded-xl bg-gray-900 text-white p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Project Grand Summary</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-400">Total Haul-Off</p>
              <p className="text-2xl font-black text-red-400">{round(netRemovalCY)} <span className="text-sm font-normal text-gray-400">CY</span></p>
              <p className="text-xs text-gray-500">{totalRemovalTons} tons · {truckLoads} loads</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Fill Dirt In</p>
              <p className="text-2xl font-black text-amber-400">{fillDirtCYNum || "—"} <span className="text-sm font-normal text-gray-400">{fillDirtCYNum ? "CY" : ""}</span></p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Total Gravel In</p>
              <p className="text-2xl font-black text-green-400">{round(totalGravelCY)} <span className="text-sm font-normal text-gray-400">CY</span></p>
              <p className="text-xs text-gray-500">{round(totalGravelTons)} tons</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Truck Loads Out</p>
              <p className="text-2xl font-black text-white">{truckLoads} <span className="text-sm font-normal text-gray-400">loads</span></p>
              <p className="text-xs text-gray-500">@ {truckCY} CY / truck</p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// TOOL CATALOG & NAVIGATION
// ══════════════════════════════════════════════════════════════════════════

type ToolId = "turf" | "gravel" | "infill" | "concrete" | "french-drain" | "takeoff" | "football" | "baseball" | "soccer" | "grading";
type CategoryId = "all" | "calculators" | "field-refs" | "advanced";

interface ToolDef {
  id: ToolId;
  label: string;
  emoji: string;
  desc: string;
  category: Exclude<CategoryId, "all">;
  external?: boolean; // opens a separate page
  href?: string;
}

const TOOLS: ToolDef[] = [
  { id: "turf",         label: "Turf & Sqft",       emoji: "🌿", desc: "Area, waste %, and linear footage",           category: "calculators" },
  { id: "gravel",       label: "Gravel / Base",      emoji: "🪨", desc: "Cubic yards and tons from depth",             category: "calculators" },
  { id: "infill",       label: "Infill",             emoji: "🏖️", desc: "Single or dual-layer bag quantities",          category: "calculators" },
  { id: "concrete",     label: "Concrete",           emoji: "🧱", desc: "Slab bags and cost estimator",                 category: "calculators" },
  { id: "french-drain", label: "French Drain",       emoji: "🌊", desc: "Multi-run trench excavation & drain gravel",   category: "calculators" },
  { id: "takeoff",      label: "Project Takeoff",    emoji: "📋", desc: "Total removal, haul-off loads & all materials",category: "calculators" },
  { id: "football",     label: "Football Dims",      emoji: "🏈", desc: "NFL, NCAA, and HS field specifications",       category: "field-refs" },
  { id: "baseball",     label: "Baseball Dims",      emoji: "⚾", desc: "MLB, 60/90, and 50/70 youth layouts",         category: "field-refs" },
  { id: "soccer",       label: "Soccer Dims",        emoji: "⚽", desc: "FIFA, HS, and youth field specs",              category: "field-refs" },
  { id: "grading",      label: "Field Grading",      emoji: "📐", desc: "Laser survey cut/fill analysis & orders",     category: "advanced", external: true, href: "/tools/grading" },
];

const CATEGORIES: { id: CategoryId; label: string; color: string; activeColor: string }[] = [
  { id: "all",        label: "All Tools",          color: "bg-gray-100 text-gray-600 hover:bg-gray-200",          activeColor: "bg-gray-800 text-white" },
  { id: "calculators",label: "Material Calculators",color: "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200", activeColor: "bg-green-700 text-white" },
  { id: "field-refs", label: "Field References",    color: "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200",    activeColor: "bg-blue-700 text-white" },
  { id: "advanced",   label: "Advanced Tools",      color: "bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200", activeColor: "bg-purple-700 text-white" },
];

const CATEGORY_ACCENT: Record<Exclude<CategoryId, "all">, { border: string; bg: string; badge: string }> = {
  "calculators": { border: "border-green-400",  bg: "bg-green-50",  badge: "bg-green-100 text-green-700" },
  "field-refs":  { border: "border-blue-400",   bg: "bg-blue-50",   badge: "bg-blue-100 text-blue-700" },
  "advanced":    { border: "border-purple-400", bg: "bg-purple-50", badge: "bg-purple-100 text-purple-700" },
};

function ToolCard({ tool, isActive, onClick }: { tool: ToolDef; isActive: boolean; onClick: () => void }) {
  const accent = CATEGORY_ACCENT[tool.category];

  if (tool.external && tool.href) {
    return (
      <a
        href={tool.href}
        className={`group relative flex flex-col gap-1 rounded-xl border-2 p-3 transition-all cursor-pointer hover:shadow-md ${
          isActive ? `${accent.border} ${accent.bg} shadow-sm` : "border-gray-200 bg-white hover:border-gray-300"
        }`}
      >
        <div className="flex items-start justify-between">
          <span className="text-2xl leading-none">{tool.emoji}</span>
          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${accent.badge}`}>
            Open →
          </span>
        </div>
        <span className="font-semibold text-sm text-gray-900 mt-1">{tool.label}</span>
        <span className="text-xs text-gray-500 leading-snug">{tool.desc}</span>
      </a>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`group relative flex flex-col gap-1 rounded-xl border-2 p-3 text-left transition-all hover:shadow-md w-full ${
        isActive ? `${accent.border} ${accent.bg} shadow-sm` : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <div className="flex items-start justify-between">
        <span className="text-2xl leading-none">{tool.emoji}</span>
        {isActive && (
          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${accent.badge}`}>
            Active
          </span>
        )}
      </div>
      <span className="font-semibold text-sm text-gray-900 mt-1">{tool.label}</span>
      <span className="text-xs text-gray-500 leading-snug">{tool.desc}</span>
    </button>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// PAGE
// ══════════════════════════════════════════════════════════════════════════

export default function ToolsPage() {
  const [activeTool, setActiveTool] = useState<ToolId>("turf");
  const [activeCategory, setActiveCategory] = useState<CategoryId>("all");

  const visibleTools = activeCategory === "all"
    ? TOOLS
    : TOOLS.filter(t => t.category === activeCategory);

  const selectedTool = TOOLS.find(t => t.id === activeTool);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">🔧 Field Tools</h1>
        <p className="text-gray-500 text-sm mt-1">Material calculators, field references, and advanced grading tools</p>
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeCategory === cat.id ? cat.activeColor : cat.color
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Tool grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {visibleTools.map(tool => (
          <ToolCard
            key={tool.id}
            tool={tool}
            isActive={activeTool === tool.id && !tool.external}
            onClick={() => {
              if (!tool.external) setActiveTool(tool.id);
            }}
          />
        ))}
      </div>

      {/* Active tool label breadcrumb */}
      {selectedTool && !selectedTool.external && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="text-gray-400">Showing:</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${CATEGORY_ACCENT[selectedTool.category].badge}`}>
            {CATEGORIES.find(c => c.id === selectedTool.category)?.label}
          </span>
          <span className="font-medium text-gray-700">{selectedTool.emoji} {selectedTool.label}</span>
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-gray-200" />

      {/* Active tool content */}
      {activeTool === "turf"         && <TurfCalculator />}
      {activeTool === "gravel"       && <GravelCalculator />}
      {activeTool === "infill"       && <DualInfillCalculator />}
      {activeTool === "concrete"     && <ConcreteCalculator />}
      {activeTool === "french-drain" && <FrenchDrainCalculator />}
      {activeTool === "takeoff"      && <ProjectTakeoffCalculator />}
      {activeTool === "football"     && <FootballLayout />}
      {activeTool === "baseball"     && <BaseballLayout />}
      {activeTool === "soccer"       && <SoccerLayout />}
    </div>
  );
}
