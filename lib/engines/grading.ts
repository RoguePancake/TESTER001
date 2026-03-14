/**
 * GRADING ENGINE
 * Field grading calculations for turf installation.
 * Supports belly (crowned) and extended (flat) zones.
 * All internal calculations use decimal feet.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type FieldType = "football" | "soccer" | "custom";
export type PlaneMethod = "best_fit" | "simple_slope" | "crown";
export type ElevUnit = "tenths_foot" | "inches" | "decimal_feet";
export type CellZone = "belly" | "extended";

export interface ZoneConfig {
  bellyLengthFt: number;
  bellyWidthFt: number;
  bellyPlaneMethod: PlaneMethod;
  crownSlopePct: number;
  sidelineWidthFt: number;  // each side
  endZoneExtFt: number;     // each end
}

export interface FieldConfig {
  fieldType: FieldType;
  gridSpacingFt: number;
  elevUnit: ElevUnit;
  zones: ZoneConfig;
}

export interface MaterialStack {
  drainageGravelIn: number;
  screeningsIn: number;
  padIn: number;
  turfIn: number;
  turfRollWidthFt: number;
  gravelTonsPerCY: number;
}

export interface GridPointResult {
  col: number;
  row: number;
  zone: CellZone;
  existingElevFt: number;
  targetSubgradeFt: number;
  netCutFt: number;     // positive = cut needed, negative = fill needed
  totalCutFt: number;   // netCutFt + productThicknessFt
  status: "cut" | "fill" | "on_grade";
  cutVolumeCY: number;
  fillVolumeCY: number;
}

export interface MaterialOrders {
  drainageGravelCY: number;
  drainageGravelTons: number;
  screeningsCY: number;
  screeningsTons: number;
  padSqFt: number;
  turfSqFt: number;
  turfLinFt: number;
}

export interface ZoneSummary {
  zone: CellZone;
  areaSqFt: number;
  totalCutVolumeCY: number;
  totalFillVolumeCY: number;
  maxCutDepthFt: number;
  avgCutDepthFt: number;
  lowPointCount: number;
  lowPoints: Array<{ col: number; row: number; deficitIn: number }>;
  materialOrders: MaterialOrders;
}

export interface GradingSummary {
  bellySummary: ZoneSummary;
  extendedSummary: ZoneSummary;
  combined: {
    totalCutVolumeCY: number;
    totalFillVolumeCY: number;
    totalFieldAreaSqFt: number;
    materialOrders: MaterialOrders;
    layerVolumes: Array<{ name: string; thicknessIn: number; volumeCY: number }>;
  };
  totalProductThicknessIn: number;
  cols: number;
  rows: number;
}

interface PlaneCoeffs {
  a: number;  // x coefficient
  b: number;  // y coefficient
  c: number;  // intercept
  // z = a*x + b*y + c
}

interface GridPoint {
  col: number;
  row: number;
  elevFt: number;
}

// ── Unit Conversion ──────────────────────────────────────────────────────────

export function toDecimalFeet(value: number, unit: ElevUnit): number {
  switch (unit) {
    case "tenths_foot":   return value / 10;
    case "inches":        return value / 12;
    case "decimal_feet":  return value;
  }
}

// ── Material Thickness ───────────────────────────────────────────────────────

export function totalProductThicknessFt(stack: MaterialStack): number {
  return (stack.drainageGravelIn + stack.screeningsIn + stack.padIn + stack.turfIn) / 12;
}

// ── Grid Dimensions ──────────────────────────────────────────────────────────

export function gridDimensions(config: FieldConfig): {
  cols: number;
  rows: number;
  cellAreaSqFt: number;
  totalLengthFt: number;
  totalWidthFt: number;
} {
  const { zones, gridSpacingFt } = config;
  const totalLengthFt = zones.bellyLengthFt + 2 * zones.endZoneExtFt;
  const totalWidthFt  = zones.bellyWidthFt  + 2 * zones.sidelineWidthFt;
  const cols = Math.floor(totalLengthFt / gridSpacingFt) + 1;
  const rows = Math.floor(totalWidthFt  / gridSpacingFt) + 1;
  return { cols, rows, cellAreaSqFt: gridSpacingFt * gridSpacingFt, totalLengthFt, totalWidthFt };
}

// ── Zone Classification ──────────────────────────────────────────────────────

export function getCellZone(col: number, row: number, config: FieldConfig): CellZone {
  const { zones, gridSpacingFt } = config;
  const xFt = col * gridSpacingFt;
  const yFt = row * gridSpacingFt;

  const bellyStartX = zones.endZoneExtFt;
  const bellyEndX   = zones.endZoneExtFt + zones.bellyLengthFt;
  const bellyStartY = zones.sidelineWidthFt;
  const bellyEndY   = zones.sidelineWidthFt + zones.bellyWidthFt;

  if (xFt >= bellyStartX && xFt <= bellyEndX && yFt >= bellyStartY && yFt <= bellyEndY) {
    return "belly";
  }
  return "extended";
}

// ── Plane Fitting ────────────────────────────────────────────────────────────

/**
 * Solves a 3x3 linear system Ax = b using Gaussian elimination.
 * Used for best-fit plane fitting (z = ax + by + c).
 */
function gaussianElim3(
  A: [number, number, number, number][],  // 3 rows, 4 cols (augmented)
): [number, number, number] | null {
  const M = A.map(row => [...row]) as [number, number, number, number][];

  for (let col = 0; col < 3; col++) {
    // Find pivot
    let maxRow = col;
    for (let row = col + 1; row < 3; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) maxRow = row;
    }
    [M[col], M[maxRow]] = [M[maxRow], M[col]];

    if (Math.abs(M[col][col]) < 1e-12) return null;

    for (let row = col + 1; row < 3; row++) {
      const factor = M[row][col] / M[col][col];
      for (let k = col; k < 4; k++) {
        M[row][k] -= factor * M[col][k];
      }
    }
  }

  // Back substitution
  const x: number[] = [0, 0, 0];
  for (let i = 2; i >= 0; i--) {
    x[i] = M[i][3];
    for (let j = i + 1; j < 3; j++) {
      x[i] -= M[i][j] * x[j];
    }
    x[i] /= M[i][i];
  }
  return [x[0], x[1], x[2]];
}

/**
 * Best-fit plane z = ax + by + c using least squares.
 * x = col * spacingFt, y = row * spacingFt
 */
export function fitBestFitPlane(points: GridPoint[], spacingFt: number): PlaneCoeffs {
  if (points.length < 3) {
    // Fallback: flat plane at mean elevation
    const meanZ = points.reduce((s, p) => s + p.elevFt, 0) / (points.length || 1);
    return { a: 0, b: 0, c: meanZ };
  }

  let sx2 = 0, sxy = 0, sx = 0, sy2 = 0, sy = 0, n = 0;
  let sxz = 0, syz = 0, sz = 0;

  for (const p of points) {
    const x = p.col * spacingFt;
    const y = p.row * spacingFt;
    const z = p.elevFt;
    sx2 += x * x; sxy += x * y; sx += x;
    sy2 += y * y; sy += y;
    sxz += x * z; syz += y * z; sz += z;
    n++;
  }

  const result = gaussianElim3([
    [sx2, sxy, sx, sxz],
    [sxy, sy2, sy, syz],
    [sx,  sy,  n,  sz ],
  ]);

  if (!result) {
    const meanZ = sz / n;
    return { a: 0, b: 0, c: meanZ };
  }
  return { a: result[0], b: result[1], c: result[2] };
}

/**
 * Simple slope plane: z = ax + c (no cross-slope, b=0).
 * Pure longitudinal slope.
 */
export function fitSimpleSlopePlane(points: GridPoint[], spacingFt: number): PlaneCoeffs {
  if (points.length < 2) {
    const meanZ = points.reduce((s, p) => s + p.elevFt, 0) / (points.length || 1);
    return { a: 0, b: 0, c: meanZ };
  }

  let sx2 = 0, sx = 0, sxz = 0, sz = 0, n = 0;
  for (const p of points) {
    const x = p.col * spacingFt;
    sx2 += x * x; sx += x; sxz += x * p.elevFt; sz += p.elevFt; n++;
  }

  const det = n * sx2 - sx * sx;
  if (Math.abs(det) < 1e-12) {
    return { a: 0, b: 0, c: sz / n };
  }
  const a = (n * sxz - sx * sz) / det;
  const c = (sz - a * sx) / n;
  return { a, b: 0, c };
}

export function evaluatePlane(plane: PlaneCoeffs, xFt: number, yFt: number): number {
  return plane.a * xFt + plane.b * yFt + plane.c;
}

/**
 * Crown target elevation for a single cell.
 * Ridge runs along the center row of the belly. Elevation drops bilaterally
 * by crownSlopePct toward the sidelines.
 */
export function crownTargetElevation(
  col: number,
  row: number,
  crownCenterRowFt: number,
  spacingFt: number,
  longSlope: PlaneCoeffs,
  crownSlopePct: number,
): number {
  const xFt = col * spacingFt;
  const yFt = row * spacingFt;
  const ridgeZ = evaluatePlane(longSlope, xFt, crownCenterRowFt);
  const distFromCenter = Math.abs(yFt - crownCenterRowFt);
  return ridgeZ - (distFromCenter * crownSlopePct / 100);
}

// ── Benchmark / Rod Reading ──────────────────────────────────────────────────

/**
 * Returns the rod reading that the laser receiver should display when
 * the rod tip is exactly at target sub-grade elevation.
 * rodReading = instrumentHeight - targetSubgradeElev
 */
export function computeRodReading(
  instrumentHeightFt: number,
  targetSubgradeElevFt: number,
): number {
  return instrumentHeightFt - targetSubgradeElevFt;
}

// ── Material Orders ──────────────────────────────────────────────────────────

export function calcMaterialOrders(areaSqFt: number, stack: MaterialStack): MaterialOrders {
  const gravelDepthFt   = stack.drainageGravelIn / 12;
  const screenDepthFt   = stack.screeningsIn / 12;

  const gravelCY        = (areaSqFt * gravelDepthFt) / 27;
  const screenCY        = stack.screeningsIn > 0 ? (areaSqFt * screenDepthFt) / 27 : 0;

  return {
    drainageGravelCY:    round2(gravelCY),
    drainageGravelTons:  round2(gravelCY * stack.gravelTonsPerCY),
    screeningsCY:        round2(screenCY),
    screeningsTons:      round2(screenCY * 1.35), // DG/screenings default
    padSqFt:             stack.padIn > 0 ? round2(areaSqFt) : 0,
    turfSqFt:            round2(areaSqFt),
    turfLinFt:           round2(areaSqFt / stack.turfRollWidthFt),
  };
}

function addMaterialOrders(a: MaterialOrders, b: MaterialOrders): MaterialOrders {
  return {
    drainageGravelCY:   round2(a.drainageGravelCY   + b.drainageGravelCY),
    drainageGravelTons: round2(a.drainageGravelTons  + b.drainageGravelTons),
    screeningsCY:       round2(a.screeningsCY        + b.screeningsCY),
    screeningsTons:     round2(a.screeningsTons      + b.screeningsTons),
    padSqFt:            round2(a.padSqFt             + b.padSqFt),
    turfSqFt:           round2(a.turfSqFt            + b.turfSqFt),
    turfLinFt:          round2(a.turfLinFt           + b.turfLinFt),
  };
}

// ── Heatmap Color ────────────────────────────────────────────────────────────

export function heatmapColor(result: GridPointResult, maxCutFt: number): string {
  if (result.status === "fill")     return "bg-blue-300";
  if (result.status === "on_grade") return "bg-green-200";
  if (maxCutFt <= 0) return "bg-lime-200";
  const pct = result.netCutFt / maxCutFt;
  if (pct < 0.25) return "bg-lime-200";
  if (pct < 0.50) return "bg-yellow-300";
  if (pct < 0.75) return "bg-orange-400";
  return "bg-red-500";
}

// ── Main Analysis ────────────────────────────────────────────────────────────

const ON_GRADE_TOLERANCE_FT = 0.02; // ±0.25 inches

export function analyzeGrid(
  elevations: string[][],
  config: FieldConfig,
  stack: MaterialStack,
): { results: GridPointResult[][]; summary: GradingSummary } {
  const dims = gridDimensions(config);
  const productThickFt = totalProductThicknessFt(stack);
  const { rows, cols, cellAreaSqFt } = dims;

  // Convert elevations to decimal feet
  const elevFt: number[][] = [];
  for (let r = 0; r < rows; r++) {
    elevFt[r] = [];
    for (let c = 0; c < cols; c++) {
      const raw = parseFloat((elevations[r]?.[c]) ?? "0") || 0;
      elevFt[r][c] = toDecimalFeet(raw, config.elevUnit);
    }
  }

  // Separate belly and extended grid points
  const bellyPoints: GridPoint[] = [];
  const extendedPoints: GridPoint[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const pt: GridPoint = { col: c, row: r, elevFt: elevFt[r][c] };
      if (getCellZone(c, r, config) === "belly") {
        bellyPoints.push(pt);
      } else {
        extendedPoints.push(pt);
      }
    }
  }

  // Fit planes
  let bellyPlane: PlaneCoeffs;
  let extendedPlane: PlaneCoeffs;
  let crownCenterRowFt = 0;
  let bellyLongSlope: PlaneCoeffs = { a: 0, b: 0, c: 0 };

  const spacing = config.gridSpacingFt;

  if (config.zones.bellyPlaneMethod === "crown") {
    // Fit longitudinal slope to center-row belly points
    const totalWidthFt = dims.totalWidthFt;
    crownCenterRowFt = config.zones.sidelineWidthFt + config.zones.bellyWidthFt / 2;
    // Find belly points on/near center Y
    const centerY = crownCenterRowFt;
    const centerLinePts = bellyPoints.filter(p => {
      const yFt = p.row * spacing;
      return Math.abs(yFt - centerY) <= spacing * 0.6;
    });
    bellyLongSlope = centerLinePts.length >= 2
      ? fitSimpleSlopePlane(centerLinePts, spacing)
      : fitSimpleSlopePlane(bellyPoints, spacing);
    // bellyPlane is unused for crown — we compute per-point below
    bellyPlane = bellyLongSlope;
  } else if (config.zones.bellyPlaneMethod === "simple_slope") {
    bellyPlane = fitSimpleSlopePlane(bellyPoints, spacing);
  } else {
    bellyPlane = fitBestFitPlane(bellyPoints, spacing);
  }

  extendedPlane = extendedPoints.length >= 3
    ? fitBestFitPlane(extendedPoints, spacing)
    : extendedPoints.length >= 2
      ? fitSimpleSlopePlane(extendedPoints, spacing)
      : { a: 0, b: 0, c: extendedPoints[0]?.elevFt ?? 0 };

  // Analyze each cell
  const results: GridPointResult[][] = [];
  for (let r = 0; r < rows; r++) {
    results[r] = [];
    for (let c = 0; c < cols; c++) {
      const zone = getCellZone(c, r, config);
      const existingElevFt = elevFt[r][c];
      const xFt = c * spacing;
      const yFt = r * spacing;

      let targetSubgradeFt: number;
      if (zone === "belly" && config.zones.bellyPlaneMethod === "crown") {
        targetSubgradeFt = crownTargetElevation(
          c, r, crownCenterRowFt, spacing, bellyLongSlope, config.zones.crownSlopePct
        );
      } else if (zone === "belly") {
        targetSubgradeFt = evaluatePlane(bellyPlane, xFt, yFt);
      } else {
        targetSubgradeFt = evaluatePlane(extendedPlane, xFt, yFt);
      }

      const netCutFt = existingElevFt - targetSubgradeFt;
      const totalCutFt = netCutFt + productThickFt;

      let status: GridPointResult["status"];
      if (Math.abs(netCutFt) <= ON_GRADE_TOLERANCE_FT) {
        status = "on_grade";
      } else if (netCutFt < 0) {
        status = "fill";
      } else {
        status = "cut";
      }

      const cutVolumeCY  = status === "cut"  ? (totalCutFt * cellAreaSqFt) / 27 : 0;
      const fillVolumeCY = status === "fill" ? (Math.abs(netCutFt) * cellAreaSqFt) / 27 : 0;

      results[r][c] = {
        col: c, row: r, zone,
        existingElevFt, targetSubgradeFt,
        netCutFt, totalCutFt, status,
        cutVolumeCY: Math.max(0, cutVolumeCY),
        fillVolumeCY: Math.max(0, fillVolumeCY),
      };
    }
  }

  // Build zone summaries
  const summary = buildSummary(results, stack, config, dims);
  return { results, summary };
}

function buildSummary(
  results: GridPointResult[][],
  stack: MaterialStack,
  config: FieldConfig,
  dims: ReturnType<typeof gridDimensions>,
): GradingSummary {
  const { cols, rows, cellAreaSqFt } = dims;

  const bellyResults: GridPointResult[] = [];
  const extResults:   GridPointResult[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const res = results[r][c];
      if (res.zone === "belly") bellyResults.push(res);
      else extResults.push(res);
    }
  }

  const bellySummary  = buildZoneSummary("belly",    bellyResults, cellAreaSqFt, stack);
  const extSummary    = buildZoneSummary("extended", extResults,   cellAreaSqFt, stack);
  const combinedOrders = addMaterialOrders(bellySummary.materialOrders, extSummary.materialOrders);
  const totalAreaSqFt = (bellyResults.length + extResults.length) * cellAreaSqFt;
  const productThicknessIn = stack.drainageGravelIn + stack.screeningsIn + stack.padIn + stack.turfIn;

  const layerVolumes = [
    { name: "Drainage Gravel", thicknessIn: stack.drainageGravelIn,
      volumeCY: round2((totalAreaSqFt * stack.drainageGravelIn / 12) / 27) },
    ...(stack.screeningsIn > 0 ? [{ name: "Screenings/Chips", thicknessIn: stack.screeningsIn,
      volumeCY: round2((totalAreaSqFt * stack.screeningsIn / 12) / 27) }] : []),
    ...(stack.padIn > 0 ? [{ name: "Pad", thicknessIn: stack.padIn,
      volumeCY: round2((totalAreaSqFt * stack.padIn / 12) / 27) }] : []),
    { name: "Turf", thicknessIn: stack.turfIn,
      volumeCY: round2((totalAreaSqFt * stack.turfIn / 12) / 27) },
  ];

  return {
    bellySummary,
    extendedSummary: extSummary,
    combined: {
      totalCutVolumeCY:  round2(bellySummary.totalCutVolumeCY  + extSummary.totalCutVolumeCY),
      totalFillVolumeCY: round2(bellySummary.totalFillVolumeCY + extSummary.totalFillVolumeCY),
      totalFieldAreaSqFt: round2(totalAreaSqFt),
      materialOrders: combinedOrders,
      layerVolumes,
    },
    totalProductThicknessIn: productThicknessIn,
    cols,
    rows,
  };
}

function buildZoneSummary(
  zone: CellZone,
  points: GridPointResult[],
  cellAreaSqFt: number,
  stack: MaterialStack,
): ZoneSummary {
  if (points.length === 0) {
    return {
      zone, areaSqFt: 0,
      totalCutVolumeCY: 0, totalFillVolumeCY: 0,
      maxCutDepthFt: 0, avgCutDepthFt: 0,
      lowPointCount: 0, lowPoints: [],
      materialOrders: calcMaterialOrders(0, stack),
    };
  }

  const areaSqFt = points.length * cellAreaSqFt;
  let totalCut = 0, totalFill = 0, maxCut = 0, sumCut = 0, cutCount = 0;
  const lowPoints: ZoneSummary["lowPoints"] = [];

  for (const p of points) {
    totalCut  += p.cutVolumeCY;
    totalFill += p.fillVolumeCY;
    if (p.status === "cut") {
      if (p.netCutFt > maxCut) maxCut = p.netCutFt;
      sumCut += p.netCutFt;
      cutCount++;
    }
    if (p.status === "fill") {
      lowPoints.push({ col: p.col, row: p.row, deficitIn: round2(Math.abs(p.netCutFt) * 12) });
    }
  }

  const materialOrders = calcMaterialOrders(areaSqFt, stack);

  return {
    zone,
    areaSqFt: round2(areaSqFt),
    totalCutVolumeCY:  round2(totalCut),
    totalFillVolumeCY: round2(totalFill),
    maxCutDepthFt:     round2(maxCut),
    avgCutDepthFt:     cutCount > 0 ? round2(sumCut / cutCount) : 0,
    lowPointCount:     lowPoints.length,
    lowPoints,
    materialOrders,
  };
}

// ── CSV Export ───────────────────────────────────────────────────────────────

export function toCsvString(
  results: GridPointResult[][],
  summary: GradingSummary,
  config: FieldConfig,
): string {
  const lines: string[] = [];

  // Summary header
  lines.push("Field Grading Report");
  lines.push(`Field Type,${config.fieldType}`);
  lines.push(`Grid Spacing,${config.gridSpacingFt} ft`);
  lines.push(`Total Product Thickness,${summary.totalProductThicknessIn} in`);
  lines.push(`Belly Cut Volume,${summary.bellySummary.totalCutVolumeCY} CY`);
  lines.push(`Belly Fill Volume,${summary.bellySummary.totalFillVolumeCY} CY`);
  lines.push(`Extended Cut Volume,${summary.extendedSummary.totalCutVolumeCY} CY`);
  lines.push(`Extended Fill Volume,${summary.extendedSummary.totalFillVolumeCY} CY`);
  lines.push(`Total Cut Volume,${summary.combined.totalCutVolumeCY} CY`);
  lines.push(`Total Field Area,${summary.combined.totalFieldAreaSqFt} sqft`);
  lines.push(`Drainage Gravel (total),${summary.combined.materialOrders.drainageGravelCY} CY,${summary.combined.materialOrders.drainageGravelTons} tons`);
  if (summary.combined.materialOrders.screeningsCY > 0) {
    lines.push(`Screenings (total),${summary.combined.materialOrders.screeningsCY} CY,${summary.combined.materialOrders.screeningsTons} tons`);
  }
  lines.push(`Turf (total),${summary.combined.materialOrders.turfSqFt} sqft,${summary.combined.materialOrders.turfLinFt} lin ft`);
  lines.push("");

  // Grid data
  lines.push("Col,Row,Zone,Existing Elev (ft),Target Subgrade (ft),Net Cut (ft),Total Cut (ft),Status,Cut Vol (CY),Fill Vol (CY)");
  for (const row of results) {
    for (const p of row) {
      lines.push([
        p.col, p.row, p.zone,
        p.existingElevFt.toFixed(3),
        p.targetSubgradeFt.toFixed(3),
        p.netCutFt.toFixed(3),
        p.totalCutFt.toFixed(3),
        p.status,
        p.cutVolumeCY.toFixed(4),
        p.fillVolumeCY.toFixed(4),
      ].join(","));
    }
  }

  return lines.join("\n");
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── Field Presets ────────────────────────────────────────────────────────────

export const FIELD_PRESETS: Record<FieldType, Partial<FieldConfig & { zones: ZoneConfig }>> = {
  football: {
    fieldType: "football",
    gridSpacingFt: 10,
    elevUnit: "tenths_foot",
    zones: {
      bellyLengthFt: 360,
      bellyWidthFt: 160,
      bellyPlaneMethod: "crown",
      crownSlopePct: 1.5,
      sidelineWidthFt: 10,
      endZoneExtFt: 10,
    },
  },
  soccer: {
    fieldType: "soccer",
    gridSpacingFt: 10,
    elevUnit: "tenths_foot",
    zones: {
      bellyLengthFt: 360,
      bellyWidthFt: 225,
      bellyPlaneMethod: "best_fit",
      crownSlopePct: 1.0,
      sidelineWidthFt: 10,
      endZoneExtFt: 10,
    },
  },
  custom: {
    fieldType: "custom",
    gridSpacingFt: 10,
    elevUnit: "tenths_foot",
    zones: {
      bellyLengthFt: 200,
      bellyWidthFt: 100,
      bellyPlaneMethod: "best_fit",
      crownSlopePct: 1.0,
      sidelineWidthFt: 0,
      endZoneExtFt: 0,
    },
  },
};
