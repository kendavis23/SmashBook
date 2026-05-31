import { describe, expect, it } from "vitest";
import { computeUtilisationSummary } from "./utilisationSummary";
import type { DailyUtilisationPoint } from "../types";

function point(overrides: Partial<DailyUtilisationPoint> = {}): DailyUtilisationPoint {
    return {
        snapshot_date: "2026-05-25",
        total_slots: 50,
        booked_slots: 25,
        utilisation_pct: 50,
        revenue_actual: 300,
        revenue_potential: 500,
        ...overrides,
    };
}

describe("computeUtilisationSummary", () => {
    it("returns zeroed summary for empty input", () => {
        const s = computeUtilisationSummary([]);
        expect(s.totalSlots).toBe(0);
        expect(s.bookedSlots).toBe(0);
        expect(s.avgUtilisationPct).toBe(0);
        expect(s.revenueActual).toBe(0);
        expect(s.revenueOpportunity).toBe(0);
        expect(s.dayCount).toBe(0);
        expect(s.isSingleDay).toBe(false);
    });

    it("flags single-day ranges", () => {
        const s = computeUtilisationSummary([point()]);
        expect(s.isSingleDay).toBe(true);
        expect(s.dayCount).toBe(1);
    });

    it("sums slots and revenue across multiple days", () => {
        const s = computeUtilisationSummary([
            point({ snapshot_date: "2026-05-25", total_slots: 50, booked_slots: 20 }),
            point({ snapshot_date: "2026-05-26", total_slots: 50, booked_slots: 40 }),
        ]);
        expect(s.totalSlots).toBe(100);
        expect(s.bookedSlots).toBe(60);
        expect(s.isSingleDay).toBe(false);
    });

    it("derives utilisation from slot totals (slot-weighted, not avg of percentages)", () => {
        const s = computeUtilisationSummary([
            point({ total_slots: 100, booked_slots: 90, utilisation_pct: 90 }),
            point({ total_slots: 10, booked_slots: 1, utilisation_pct: 10 }),
        ]);
        // 91 / 110 = 82.7%, not (90 + 10) / 2 = 50%
        expect(s.avgUtilisationPct).toBeCloseTo((91 / 110) * 100, 5);
    });

    it("reports 0% utilisation when there are no slots (no divide-by-zero)", () => {
        const s = computeUtilisationSummary([
            point({ total_slots: 0, booked_slots: 0, revenue_actual: 0, revenue_potential: 0 }),
        ]);
        expect(s.avgUtilisationPct).toBe(0);
        expect(s.revenueOpportunityPct).toBe(0);
        expect(Number.isNaN(s.avgUtilisationPct)).toBe(false);
    });

    it("computes revenue opportunity and clamps negatives to 0", () => {
        const gap = computeUtilisationSummary([
            point({ revenue_actual: 300, revenue_potential: 500 }),
        ]);
        expect(gap.revenueOpportunity).toBe(200);
        expect(gap.revenueOpportunityPct).toBeCloseTo((200 / 300) * 100, 5);

        const over = computeUtilisationSummary([
            point({ revenue_actual: 600, revenue_potential: 500 }),
        ]);
        expect(over.revenueOpportunity).toBe(0);
    });
});
