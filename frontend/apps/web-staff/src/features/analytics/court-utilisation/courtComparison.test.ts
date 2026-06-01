import { describe, expect, it } from "vitest";
import type { CourtUtilisationSummary } from "@repo/staff-domain/models";
import { computeCourtComparison } from "./courtComparison";

function court(over: Partial<CourtUtilisationSummary>): CourtUtilisationSummary {
    return {
        court_id: "c1",
        court_name: "Court 1",
        total_slots: 100,
        booked_slots: 50,
        utilisation_pct: 50,
        revenue_actual: 500,
        revenue_potential: 1000,
        ...over,
    };
}

describe("computeCourtComparison", () => {
    it("returns zeros and null best/worst for empty input", () => {
        const s = computeCourtComparison([]);
        expect(s).toMatchObject({
            courtCount: 0,
            totalSlots: 0,
            bookedSlots: 0,
            avgUtilisationPct: 0,
            revenueActual: 0,
            revenuePotential: 0,
            revenueOpportunity: 0,
            revenueOpportunityPct: 0,
            best: null,
            worst: null,
        });
        expect(s.rows).toEqual([]);
    });

    it("derives per-court utilisation from booked/total slots", () => {
        const s = computeCourtComparison([
            court({ court_id: "a", total_slots: 200, booked_slots: 150 }),
        ]);
        expect(s.rows[0]?.utilisationPct).toBeCloseTo(75);
    });

    it("reports 0% (never NaN) when a court has no slots", () => {
        const s = computeCourtComparison([
            court({ court_id: "a", total_slots: 0, booked_slots: 0 }),
        ]);
        expect(s.rows[0]?.utilisationPct).toBe(0);
        expect(s.avgUtilisationPct).toBe(0);
    });

    it("uses slot-weighted utilisation, not the mean of per-court percentages", () => {
        // Court A: 100% of 10 slots. Court B: 0% of 90 slots.
        // Mean of percentages = 50%. Slot-weighted = 10/100 = 10%.
        const s = computeCourtComparison([
            court({ court_id: "a", total_slots: 10, booked_slots: 10 }),
            court({ court_id: "b", total_slots: 90, booked_slots: 0 }),
        ]);
        expect(s.avgUtilisationPct).toBeCloseTo(10);
    });

    it("sums slots and revenue across courts", () => {
        const s = computeCourtComparison([
            court({ court_id: "a", total_slots: 100, booked_slots: 60, revenue_actual: 600 }),
            court({ court_id: "b", total_slots: 100, booked_slots: 40, revenue_actual: 400 }),
        ]);
        expect(s.totalSlots).toBe(200);
        expect(s.bookedSlots).toBe(100);
        expect(s.revenueActual).toBe(1000);
    });

    it("coerces string-decimal API fields to numbers", () => {
        const s = computeCourtComparison([
            court({
                total_slots: 100,
                booked_slots: 50,
                revenue_actual: "500.50" as unknown as number,
                revenue_potential: "1000.25" as unknown as number,
            }),
        ]);
        expect(s.revenueActual).toBeCloseTo(500.5);
        expect(s.revenuePotential).toBeCloseTo(1000.25);
    });

    it("clamps a negative revenue opportunity to 0", () => {
        const s = computeCourtComparison([
            court({ revenue_actual: 1200, revenue_potential: 1000 }),
        ]);
        expect(s.rows[0]?.revenueOpportunity).toBe(0);
        expect(s.revenueOpportunity).toBe(0);
    });

    it("computes opportunity percentage as 0 when actual revenue is 0", () => {
        const s = computeCourtComparison([court({ revenue_actual: 0, revenue_potential: 500 })]);
        expect(s.revenueOpportunityPct).toBe(0);
    });

    it("ranks best/worst by utilisation regardless of table sort", () => {
        const s = computeCourtComparison(
            [
                court({ court_id: "low", court_name: "Low", total_slots: 100, booked_slots: 30 }),
                court({
                    court_id: "high",
                    court_name: "High",
                    total_slots: 100,
                    booked_slots: 90,
                }),
            ],
            "revenue"
        );
        expect(s.best?.courtId).toBe("high");
        expect(s.worst?.courtId).toBe("low");
    });

    it("leaves worst null when there is only one court", () => {
        const s = computeCourtComparison([court({ court_id: "solo" })]);
        expect(s.best?.courtId).toBe("solo");
        expect(s.worst).toBeNull();
    });

    it("sorts rows by the requested key, best first", () => {
        const courts = [
            court({ court_id: "a", booked_slots: 40, revenue_actual: 900, revenue_potential: 950 }),
            court({
                court_id: "b",
                booked_slots: 80,
                revenue_actual: 100,
                revenue_potential: 1000,
            }),
        ];
        expect(computeCourtComparison(courts, "utilisation").rows[0]?.courtId).toBe("b");
        expect(computeCourtComparison(courts, "revenue").rows[0]?.courtId).toBe("a");
        expect(computeCourtComparison(courts, "opportunity").rows[0]?.courtId).toBe("b");
    });
});
