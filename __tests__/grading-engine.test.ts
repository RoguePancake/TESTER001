import { describe, it, expect } from "vitest";
import {
  toDecimalFeet,
  totalProductThicknessFt,
  gridDimensions,
  getCellZone,
  fitBestFitPlane,
  fitSimpleSlopePlane,
  evaluatePlane,
  crownTargetElevation,
  calcMaterialOrders,
  analyzeGrid,
  FIELD_PRESETS,
  type FieldConfig,
  type MaterialStack,
} from "@/lib/engines/grading";

const DEFAULT_STACK: MaterialStack = {
  drainageGravelIn: 4,
  screeningsIn: 0,
  padIn: 0.5,
  turfIn: 2,
  turfRollWidthFt: 15,
  gravelTonsPerCY: 1.4,
};

describe("Grading Engine", () => {
  describe("toDecimalFeet", () => {
    it("converts tenths of foot", () => {
      expect(toDecimalFeet(15, "tenths_foot")).toBeCloseTo(1.5);
    });

    it("converts inches", () => {
      expect(toDecimalFeet(12, "inches")).toBeCloseTo(1.0);
      expect(toDecimalFeet(6, "inches")).toBeCloseTo(0.5);
    });

    it("passes through decimal feet", () => {
      expect(toDecimalFeet(2.5, "decimal_feet")).toBe(2.5);
    });
  });

  describe("totalProductThicknessFt", () => {
    it("sums all material layers and converts to feet", () => {
      const result = totalProductThicknessFt(DEFAULT_STACK);
      expect(result).toBeCloseTo((4 + 0 + 0.5 + 2) / 12);
    });

    it("handles zero values", () => {
      const stack: MaterialStack = {
        drainageGravelIn: 0, screeningsIn: 0, padIn: 0, turfIn: 0,
        turfRollWidthFt: 15, gravelTonsPerCY: 1.4,
      };
      expect(totalProductThicknessFt(stack)).toBe(0);
    });
  });

  describe("gridDimensions", () => {
    it("calculates football field dimensions", () => {
      const config: FieldConfig = {
        ...FIELD_PRESETS.football as FieldConfig,
      };
      const dims = gridDimensions(config);
      expect(dims.totalLengthFt).toBe(380); // 360 + 2*10
      expect(dims.totalWidthFt).toBe(180);  // 160 + 2*10
      expect(dims.cols).toBe(39);           // 380/10 + 1
      expect(dims.rows).toBe(19);           // 180/10 + 1
      expect(dims.cellAreaSqFt).toBe(100);  // 10*10
    });
  });

  describe("getCellZone", () => {
    it("classifies belly zone correctly", () => {
      const config: FieldConfig = {
        ...FIELD_PRESETS.football as FieldConfig,
      };
      // Middle of the field (belly)
      expect(getCellZone(19, 9, config)).toBe("belly");
    });

    it("classifies extended zone at corners", () => {
      const config: FieldConfig = {
        ...FIELD_PRESETS.football as FieldConfig,
      };
      // Corner (extended)
      expect(getCellZone(0, 0, config)).toBe("extended");
    });
  });

  describe("fitBestFitPlane", () => {
    it("fits a flat plane for level points", () => {
      const points = [
        { col: 0, row: 0, elevFt: 100 },
        { col: 1, row: 0, elevFt: 100 },
        { col: 0, row: 1, elevFt: 100 },
        { col: 1, row: 1, elevFt: 100 },
      ];
      const plane = fitBestFitPlane(points, 10);
      expect(plane.a).toBeCloseTo(0);
      expect(plane.b).toBeCloseTo(0);
      expect(plane.c).toBeCloseTo(100);
    });

    it("fits a sloped plane", () => {
      const points = [
        { col: 0, row: 0, elevFt: 100 },
        { col: 1, row: 0, elevFt: 101 },
        { col: 2, row: 0, elevFt: 102 },
        { col: 0, row: 1, elevFt: 100 },
        { col: 1, row: 1, elevFt: 101 },
        { col: 2, row: 1, elevFt: 102 },
      ];
      const plane = fitBestFitPlane(points, 10);
      expect(plane.a).toBeCloseTo(0.1); // 1ft rise per 10ft run
      expect(plane.b).toBeCloseTo(0);
    });

    it("returns mean elevation for fewer than 3 points", () => {
      const points = [
        { col: 0, row: 0, elevFt: 95 },
        { col: 1, row: 0, elevFt: 105 },
      ];
      const plane = fitBestFitPlane(points, 10);
      expect(plane.c).toBeCloseTo(100);
    });
  });

  describe("fitSimpleSlopePlane", () => {
    it("fits a longitudinal-only slope", () => {
      const points = [
        { col: 0, row: 0, elevFt: 100 },
        { col: 1, row: 0, elevFt: 102 },
        { col: 2, row: 0, elevFt: 104 },
      ];
      const plane = fitSimpleSlopePlane(points, 10);
      expect(plane.a).toBeCloseTo(0.2);
      expect(plane.b).toBe(0);
    });
  });

  describe("evaluatePlane", () => {
    it("evaluates z = ax + by + c", () => {
      const plane = { a: 0.1, b: 0.05, c: 100 };
      expect(evaluatePlane(plane, 20, 10)).toBeCloseTo(102.5);
    });
  });

  describe("crownTargetElevation", () => {
    it("ridge is highest at center", () => {
      const longSlope = { a: 0, b: 0, c: 100 };
      const centerY = 80;
      const spacing = 10;
      const crownPct = 1.5;

      const atCenter = crownTargetElevation(5, 8, centerY, spacing, longSlope, crownPct);
      const atEdge = crownTargetElevation(5, 4, centerY, spacing, longSlope, crownPct);

      expect(atCenter).toBeGreaterThan(atEdge);
    });
  });

  describe("calcMaterialOrders", () => {
    it("calculates material orders for a given area", () => {
      const area = 10000; // 100x100 ft
      const orders = calcMaterialOrders(area, DEFAULT_STACK);

      expect(orders.drainageGravelCY).toBeGreaterThan(0);
      expect(orders.drainageGravelTons).toBeGreaterThan(orders.drainageGravelCY);
      expect(orders.turfSqFt).toBe(10000);
      expect(orders.turfLinFt).toBeCloseTo(10000 / 15, 1);
    });

    it("returns zero for zero area", () => {
      const orders = calcMaterialOrders(0, DEFAULT_STACK);
      expect(orders.drainageGravelCY).toBe(0);
      expect(orders.turfSqFt).toBe(0);
    });
  });

  describe("analyzeGrid", () => {
    it("analyzes a small custom field", () => {
      const config: FieldConfig = {
        fieldType: "custom",
        gridSpacingFt: 10,
        elevUnit: "decimal_feet",
        zones: {
          bellyLengthFt: 20,
          bellyWidthFt: 20,
          bellyPlaneMethod: "best_fit",
          crownSlopePct: 1.0,
          sidelineWidthFt: 0,
          endZoneExtFt: 0,
        },
      };

      // 3x3 grid of elevations (all at 100ft)
      const elevations = [
        ["100", "100", "100"],
        ["100", "100", "100"],
        ["100", "100", "100"],
      ];

      const { results, summary } = analyzeGrid(elevations, config, DEFAULT_STACK);

      expect(results.length).toBe(3);
      expect(results[0].length).toBe(3);
      expect(summary.cols).toBe(3);
      expect(summary.rows).toBe(3);
      // All on grade (flat field, flat target)
      for (const row of results) {
        for (const cell of row) {
          expect(cell.status).toBe("on_grade");
        }
      }
    });
  });
});
