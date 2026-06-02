import { describe, expect, it } from "vitest";
import type { RevenueTimeseriesPoint } from "@repo/staff-domain/models";
import { computeRevenueTrend } from "./revenueTrend";

function point(period: string, net: number): RevenueTimeseriesPoint {
    return {
        period_start: period,
        gross_amount: net,
        refund_amount: 0,
        net_amount: net,
        transaction_count: 1,
    };
}

describe("computeRevenueTrend", () => {
    it("returns zeros and isEmpty for empty input", () => {
        const t = computeRevenueTrend([]);
        expect(t.isEmpty).toBe(true);
        expect(t.totalNet).toBe(0);
        expect(t.avgNetPerPeriod).toBe(0);
        expect(t.peakNet).toBe(0);
        expect(t.peakPeriod).toBeNull();
        expect(t.changePct).toBe(0);
        expect(t.direction).toBe("flat");
    });

    it("sums total and averages per period", () => {
        const t = computeRevenueTrend([
            point("2026-05-01", 100),
            point("2026-05-02", 200),
            point("2026-05-03", 300),
        ]);
        expect(t.totalNet).toBe(600);
        expect(t.avgNetPerPeriod).toBe(200);
        expect(t.periodCount).toBe(3);
        expect(t.isEmpty).toBe(false);
    });

    it("identifies the peak period", () => {
        const t = computeRevenueTrend([
            point("2026-05-01", 100),
            point("2026-05-02", 500),
            point("2026-05-03", 300),
        ]);
        expect(t.peakNet).toBe(500);
        expect(t.peakPeriod).toBe("2026-05-02");
    });

    it("computes a positive latest change", () => {
        const t = computeRevenueTrend([point("2026-05-01", 100), point("2026-05-02", 150)]);
        expect(t.changePct).toBeCloseTo(50);
        expect(t.direction).toBe("up");
    });

    it("computes a negative latest change", () => {
        const t = computeRevenueTrend([point("2026-05-01", 200), point("2026-05-02", 150)]);
        expect(t.changePct).toBeCloseTo(-25);
        expect(t.direction).toBe("down");
    });

    it("guards a zero prior period — no NaN/Infinity", () => {
        const t = computeRevenueTrend([point("2026-05-01", 0), point("2026-05-02", 150)]);
        expect(t.changePct).toBe(0);
        expect(t.direction).toBe("flat");
    });

    it("coerces string-decimal net amounts", () => {
        const t = computeRevenueTrend([
            {
                period_start: "2026-05-01",
                gross_amount: 0,
                refund_amount: 0,
                net_amount: "120.50" as unknown as number,
                transaction_count: 1,
            },
            {
                period_start: "2026-05-02",
                gross_amount: 0,
                refund_amount: 0,
                net_amount: "79.50" as unknown as number,
                transaction_count: 1,
            },
        ]);
        expect(t.totalNet).toBeCloseTo(200);
        expect(t.avgNetPerPeriod).toBeCloseTo(100);
    });

    it("single point has no change", () => {
        const t = computeRevenueTrend([point("2026-05-01", 100)]);
        expect(t.changePct).toBe(0);
        expect(t.direction).toBe("flat");
        expect(t.peakNet).toBe(100);
    });
});
