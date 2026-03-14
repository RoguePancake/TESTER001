import { describe, it, expect } from "vitest";
import { profileCompleteness } from "@/lib/engines/employee";
import type { Profile } from "@/lib/supabase";

describe("Employee Engine", () => {
  describe("profileCompleteness", () => {
    it("returns 100 for a fully filled profile", () => {
      const profile: Profile = {
        id: "1",
        full_name: "John Doe",
        email: "john@test.com",
        phone: "555-0123",
        role: "installer",
        hire_date: "2025-01-15",
        employment_type: "employee",
        default_pay_rate: 25,
        address: "123 Main St",
        emergency_contact_name: "Jane Doe",
        emergency_contact_phone: "555-0124",
        is_active: true,
        created_at: "2025-01-01",
      };
      expect(profileCompleteness(profile)).toBe(100);
    });

    it("returns 0 for a completely empty profile", () => {
      const profile: Profile = {
        id: "2",
        full_name: "",
        role: "",
        is_active: true,
        created_at: "2025-01-01",
      };
      expect(profileCompleteness(profile)).toBe(0);
    });

    it("returns partial percentage for partially filled", () => {
      const profile: Profile = {
        id: "3",
        full_name: "Jane",
        email: "jane@test.com",
        role: "installer",
        is_active: true,
        created_at: "2025-01-01",
      };
      const pct = profileCompleteness(profile);
      expect(pct).toBeGreaterThan(0);
      expect(pct).toBeLessThan(100);
      // 3 out of 10 fields filled = 30%
      expect(pct).toBe(30);
    });
  });
});
