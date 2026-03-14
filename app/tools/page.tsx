"use client";

import { useState } from "react";

// ── Helpers ────────────────────────────────────────────────────────────────

function round(n: number, decimals = 2) {
  return Math.round(n * 10 ** decimals) / 10 ** decimals;
}

// ── Section wrapper ────────────────────────────────────────────────────────

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
  const [tons, setTons] = useState("1.4"); // tons per cubic yard (crushed granite ≈ 1.4)

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
// CALCULATOR 3: Infill
// ══════════════════════════════════════════════════════════════════════════

const INFILL_TYPES = [
  { label: "Zeofill / Zeolite", lbsPerSqft: 1.5, bagLbs: 50 },
  { label: "Silica Sand", lbsPerSqft: 2.5, bagLbs: 50 },
  { label: "Crumb Rubber", lbsPerSqft: 2.0, bagLbs: 50 },
  { label: "Cork (organic)", lbsPerSqft: 1.0, bagLbs: 44 },
  { label: "Durafill Sand", lbsPerSqft: 2.0, bagLbs: 50 },
  { label: "HybridFill", lbsPerSqft: 1.75, bagLbs: 50 },
];

function InfillCalculator() {
  const [sqft, setSqft] = useState("");
  const [infillIdx, setInfillIdx] = useState(0);
  const [depth, setDepth] = useState("1.5"); // lb/sqft override if needed

  const infill = INFILL_TYPES[infillIdx];
  const area = parseFloat(sqft) || 0;
  const rate = parseFloat(depth) || infill.lbsPerSqft;
  const totalLbs = round(area * rate);
  const bags = Math.ceil(totalLbs / infill.bagLbs);
  const bagsPlus5 = Math.ceil(bags * 1.05);

  return (
    <Card title="Infill Calculator" emoji="🏖️">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <Field label="Total Sqft">
          <NumInput value={sqft} onChange={setSqft} placeholder="1500" />
        </Field>
        <Field label="Infill Type">
          <select
            value={infillIdx}
            onChange={(e) => {
              const i = parseInt(e.target.value);
              setInfillIdx(i);
              setDepth(String(INFILL_TYPES[i].lbsPerSqft));
            }}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {INFILL_TYPES.map((t, i) => (
              <option key={t.label} value={i}>{t.label}</option>
            ))}
          </select>
        </Field>
        <Field label={`Rate (lbs/sqft) — default ${infill.lbsPerSqft}`}>
          <NumInput value={depth} onChange={setDepth} placeholder={String(infill.lbsPerSqft)} />
        </Field>
      </div>
      {area > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Result label="Total Lbs" value={totalLbs.toLocaleString()} unit="lbs" />
            <Result label={`${infill.bagLbs}-lb Bags`} value={bags} unit="bags" />
            <Result label="Order (5% buffer)" value={bagsPlus5} unit="bags" highlight />
            <Result label="Per Bag Cost" value="—" unit="enter price" />
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Rate default: {infill.lbsPerSqft} lbs/sqft for {infill.label} in a {infill.bagLbs}-lb bag. Adjust rate for depth variation.
          </p>
        </>
      )}
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// CALCULATOR 4: Concrete
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

  // 1 cubic yard ≈ 40 bags of 60lb or 30 bags of 80lb
  const bagsPerYard = bagSize === "60" ? 40 : 30;
  const bags = Math.ceil(cubicYardsPlus10 * bagsPerYard);
  const totalCost = pricePerBag ? round(bags * parseFloat(pricePerBag)) : null;

  const hasInput = shape === "rect"
    ? parseFloat(length) > 0 && parseFloat(width) > 0
    : parseFloat(diameter) > 0;

  return (
    <Card title="Concrete Calculator" emoji="🧱">
      {/* Shape toggle */}
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
            <Field label="Length (ft)">
              <NumInput value={length} onChange={setLength} placeholder="20" />
            </Field>
            <Field label="Width (ft)">
              <NumInput value={width} onChange={setWidth} placeholder="10" />
            </Field>
          </>
        ) : (
          <Field label="Diameter (ft)">
            <NumInput value={diameter} onChange={setDiameter} placeholder="12" />
          </Field>
        )}
        <Field label="Depth (inches)">
          <NumInput value={depth} onChange={setDepth} placeholder="4" />
        </Field>
        <Field label="Bag Size">
          <select
            value={bagSize}
            onChange={(e) => setBagSize(e.target.value as "60" | "80")}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="80">80 lb bag</option>
            <option value="60">60 lb bag</option>
          </select>
        </Field>
        <Field label="Price / Bag ($)">
          <NumInput value={pricePerBag} onChange={setPricePerBag} placeholder="7.50" />
        </Field>
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
// CALCULATOR 5: Dual Infill
// ══════════════════════════════════════════════════════════════════════════

function DualInfillCalculator() {
  const [mode, setMode] = useState<"single" | "dual">("single");
  const [sqft, setSqft] = useState("");

  // Layer 1
  const [l1Idx, setL1Idx] = useState(1); // Silica Sand
  const [l1Rate, setL1Rate] = useState(String(INFILL_TYPES[1].lbsPerSqft));
  const [l1Price, setL1Price] = useState("");

  // Layer 2
  const [l2Idx, setL2Idx] = useState(2); // Crumb Rubber
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

  // Dual presets
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
      {/* Mode toggle */}
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

      {/* Sqft input */}
      <div className="mb-4 max-w-xs">
        <Field label="Total Sqft">
          <NumInput value={sqft} onChange={setSqft} placeholder="1500" />
        </Field>
      </div>

      {/* Layer 1 */}
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
          <Field label={`Rate (lbs/sqft)`}>
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

      {/* Layer 2 — only show in dual mode */}
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
            <Field label={`Rate (lbs/sqft)`}>
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

      {/* Grand total for dual */}
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
// SPORT FIELD LAYOUTS
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
          <button
            key={l}
            onClick={() => setLevel(l)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              level === l
                ? "bg-green-700 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {specs[l].label}
          </button>
        ))}
      </div>

      {/* ASCII diagram */}
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
          ["Total Field", s.fieldLength],
          ["Width", s.fieldWidth],
          ["Playing Field", s.playingLength],
          ["Each End Zone", s.endZone],
          ["Hash Marks", s.hashMarks],
          ["Hash Spacing", s.hashSpacing],
          ["Goal Post Width", s.goalpostWidth],
          ["Goal Post Position", s.goalpostOffset],
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
    mlb: {
      label: "MLB / Adult",
      bases: "90 ft",
      pitching: "60 ft 6 in",
      homeToSecond: "127 ft 3⅜ in",
      foulLine: "Min 325 ft (LF/RF), 400 ft center",
      infieldGrass: "95 ft radius from home plate",
      moundHeight: "10 in above home plate",
      baseSize: "15 in × 15 in",
      homePlate: "17 in wide",
    },
    youth60: {
      label: "Youth 60/90",
      bases: "90 ft",
      pitching: "60 ft",
      homeToSecond: "127 ft 3 in",
      foulLine: "200 ft minimum",
      infieldGrass: "95 ft radius",
      moundHeight: "6 in",
      baseSize: "15 in × 15 in",
      homePlate: "17 in wide",
    },
    youth50: {
      label: "Youth 50/70",
      bases: "70 ft",
      pitching: "50 ft",
      homeToSecond: "99 ft",
      foulLine: "200 ft minimum",
      infieldGrass: "70 ft radius",
      moundHeight: "6 in",
      baseSize: "15 in × 15 in",
      homePlate: "17 in wide",
    },
  };

  const s = specs[level];

  return (
    <Card title="Baseball Field Layout" emoji="⚾">
      <div className="flex gap-2 mb-4">
        {(["mlb", "youth60", "youth50"] as const).map((l) => (
          <button
            key={l}
            onClick={() => setLevel(l)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              level === l
                ? "bg-green-700 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
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
          ["Base Path", s.bases],
          ["Pitching Distance", s.pitching],
          ["Home → 2nd Base", s.homeToSecond],
          ["Foul Lines", s.foulLine],
          ["Infield Radius", s.infieldGrass],
          ["Mound Height", s.moundHeight],
          ["Base Size", s.baseSize],
          ["Home Plate Width", s.homePlate],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between bg-gray-50 rounded px-3 py-1.5">
            <span className="text-gray-500">{k}</span>
            <span className="font-medium">{v}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
        <strong>Setting bases:</strong> Place home plate first. Run string from center of home plate at 45° to find 1st and 3rd base. Second base is exactly {s.homeToSecond} from the center of home plate, measured along the diagonal. Use a 3-4-5 triangle to verify square corners.
      </div>
    </Card>
  );
}

function SoccerLayout() {
  const [level, setLevel] = useState<"fifa" | "hs" | "youth">("fifa");

  const specs = {
    fifa: {
      label: "FIFA / Adult",
      length: "100–110 m (330–360 ft)",
      width: "64–75 m (210–246 ft)",
      penaltyArea: "40.3 m × 16.5 m",
      goalArea: "18.3 m × 5.5 m",
      centerCircle: "9.15 m radius",
      penaltySpot: "11 m (36 ft) from goal line",
      goalWidth: "7.32 m (8 yds) × 2.44 m high",
      cornerRadius: "1 m arc",
    },
    hs: {
      label: "High School",
      length: "100–120 yds (300–360 ft)",
      width: "55–80 yds (165–240 ft)",
      penaltyArea: "44 yds × 18 yds",
      goalArea: "20 yds × 6 yds",
      centerCircle: "10 yd radius",
      penaltySpot: "12 yds from goal line",
      goalWidth: "8 yds × 8 ft high",
      cornerRadius: "1 yd arc",
    },
    youth: {
      label: "Youth (U10–U12)",
      length: "70–80 yds",
      width: "45–55 yds",
      penaltyArea: "36 yds × 14 yds",
      goalArea: "14 yds × 5 yds",
      centerCircle: "8 yd radius",
      penaltySpot: "10 yds from goal line",
      goalWidth: "6 yds × 6 ft high",
      cornerRadius: "1 yd arc",
    },
  };

  const s = specs[level];

  return (
    <Card title="Soccer Field Layout" emoji="⚽">
      <div className="flex gap-2 mb-4">
        {(["fifa", "hs", "youth"] as const).map((l) => (
          <button
            key={l}
            onClick={() => setLevel(l)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              level === l
                ? "bg-green-700 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
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
          ["Field Length", s.length],
          ["Field Width", s.width],
          ["Penalty Area", s.penaltyArea],
          ["Goal Area", s.goalArea],
          ["Center Circle", s.centerCircle],
          ["Penalty Spot", s.penaltySpot],
          ["Goal Size", s.goalWidth],
          ["Corner Arc", s.cornerRadius],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between bg-gray-50 rounded px-3 py-1.5">
            <span className="text-gray-500">{k}</span>
            <span className="font-medium">{v}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
        <strong>Marking order:</strong> Mark center spot → measure out touchlines → mark goal lines → measure penalty areas from center of goal line out → mark center circle → mark corner arcs last.
      </div>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// PAGE
// ══════════════════════════════════════════════════════════════════════════

const TABS = [
  { id: "turf", label: "🌿 Turf" },
  { id: "gravel", label: "🪨 Gravel" },
  { id: "infill", label: "🏖️ Infill" },
  { id: "concrete", label: "🧱 Concrete" },
  { id: "football", label: "🏈 Football" },
  { id: "baseball", label: "⚾ Baseball" },
  { id: "soccer", label: "⚽ Soccer" },
  { id: "grading", label: "📐 Grading" },
] as const;

type TabId = typeof TABS[number]["id"];

export default function ToolsPage() {
  const [active, setActive] = useState<TabId>("turf");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">🔧 Field Tools</h1>
        <p className="text-gray-500 text-sm mt-1">Material calculators and sport field layout references</p>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              active === tab.id
                ? "bg-green-700 text-white shadow-sm"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Calculator panels */}
      {active === "turf" && <TurfCalculator />}
      {active === "gravel" && <GravelCalculator />}
      {active === "infill" && <DualInfillCalculator />}
      {active === "concrete" && <ConcreteCalculator />}
      {active === "football" && <FootballLayout />}
      {active === "baseball" && <BaseballLayout />}
      {active === "soccer" && <SoccerLayout />}
      {active === "grading" && (
        <Card title="Field Grading Tool" emoji="📐">
          <p className="text-sm text-gray-500 mb-4">
            Full grading analysis for belly (crowned) and extended zones (sidelines, dzones).
            Enter laser-level elevation readings, calculate cut/fill volumes, and get complete material orders.
          </p>
          <a
            href="/tools/grading"
            className="inline-block bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-800 transition-colors"
          >
            Open Grading Tool →
          </a>
        </Card>
      )}
    </div>
  );
}
