import { describe, expect, it } from "vitest";
import { availableGranularities, bucketPoints, defaultGranularity } from "./utilisationBuckets";
import type { DailyUtilisationPoint } from "../types";

function point(
    date: string,
    overrides: Partial<DailyUtilisationPoint> = {}
): DailyUtilisationPoint {
    return {
        snapshot_date: date,
        total_slots: 10,
        booked_slots: 4,
        utilisation_pct: 40,
        revenue_actual: 100,
        revenue_potential: 250,
        ...overrides,
    };
}

describe("defaultGranularity", () => {
    it("is daily for up to 7 days", () => {
        expect(defaultGranularity(1)).toBe("daily");
        expect(defaultGranularity(7)).toBe("daily");
    });

    it("is weekly for 8–30 days", () => {
        expect(defaultGranularity(8)).toBe("weekly");
        expect(defaultGranularity(30)).toBe("weekly");
    });

    it("is monthly beyond 30 days", () => {
        expect(defaultGranularity(31)).toBe("monthly");
        expect(defaultGranularity(120)).toBe("monthly");
    });
});

describe("availableGranularities", () => {
    it("offers only daily for a single day", () => {
        expect(availableGranularities(1)).toEqual(["daily"]);
        expect(availableGranularities(0)).toEqual(["daily"]);
    });

    it("offers the full set once there is more than one day", () => {
        expect(availableGranularities(2)).toEqual(["daily", "weekly", "monthly"]);
        expect(availableGranularities(20)).toEqual(["daily", "weekly", "monthly"]);
        expect(availableGranularities(60)).toEqual(["daily", "weekly", "monthly"]);
    });
});

describe("bucketPoints", () => {
    it("returns an empty array for no points", () => {
        expect(bucketPoints([], "daily")).toEqual([]);
    });

    it("daily is a pass-through, one bucket per point", () => {
        const buckets = bucketPoints([point("2026-04-01"), point("2026-04-02")], "daily");
        expect(buckets).toHaveLength(2);
        expect(buckets[0]?.label).toBe("1 Apr");
        expect(buckets[0]?.totalSlots).toBe(10);
    });

    it("weekly groups Monday-anchored weeks and sums them", () => {
        // 2026-03-30 is a Monday; 2026-04-05 is the Sunday of that week.
        const buckets = bucketPoints(
            [
                point("2026-03-30", { total_slots: 5, booked_slots: 2, revenue_actual: 50 }),
                point("2026-04-05", { total_slots: 7, booked_slots: 3, revenue_actual: 70 }),
                point("2026-04-06", { total_slots: 9, booked_slots: 4, revenue_actual: 90 }),
            ],
            "weekly"
        );
        expect(buckets).toHaveLength(2);
        expect(buckets[0]?.totalSlots).toBe(12); // 30 Mar + 5 Apr same week
        expect(buckets[0]?.bookedSlots).toBe(5);
        expect(buckets[0]?.revenueActual).toBe(120);
        expect(buckets[0]?.label).toBe("30 Mar – 5 Apr");
        expect(buckets[1]?.totalSlots).toBe(9); // 6 Apr starts the next week
    });

    it("monthly groups by calendar month with a short-month label", () => {
        const buckets = bucketPoints(
            [
                point("2026-03-31", { total_slots: 3, revenue_potential: 30 }),
                point("2026-04-01", { total_slots: 4, revenue_potential: 40 }),
                point("2026-04-30", { total_slots: 5, revenue_potential: 50 }),
            ],
            "monthly"
        );
        expect(buckets).toHaveLength(2);
        expect(buckets[0]?.label).toBe("Mar");
        expect(buckets[0]?.totalSlots).toBe(3);
        expect(buckets[1]?.label).toBe("Apr");
        expect(buckets[1]?.totalSlots).toBe(9);
        expect(buckets[1]?.revenuePotential).toBe(90);
    });

    it("coerces string decimal revenue fields", () => {
        const buckets = bucketPoints(
            [point("2026-04-01", { revenue_actual: "12.50", revenue_potential: "100.00" })],
            "daily"
        );
        expect(buckets[0]?.revenueActual).toBe(12.5);
        expect(buckets[0]?.revenuePotential).toBe(100);
    });

    it("keeps buckets in chronological input order", () => {
        const buckets = bucketPoints(
            [point("2026-04-01"), point("2026-05-01"), point("2026-06-01")],
            "monthly"
        );
        expect(buckets.map((b) => b.label)).toEqual(["Apr", "May", "Jun"]);
    });
});
