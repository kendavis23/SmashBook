import { describe, expect, it } from "vitest";
import { computePlayerActivitySummary } from "./playerActivitySummary";
import type { ActivePlayersKpi, ActivePlayersTimeseries, SignupsTimeseries } from "../types";

function kpi(active: number, windowDays = 30): ActivePlayersKpi {
    return {
        club_id: "club-1",
        as_of: "2026-06-02",
        window_days: windowDays,
        active_players: active,
    };
}

function activeSeries(values: number[]): ActivePlayersTimeseries {
    return {
        club_id: "club-1",
        granularity: "day",
        date_from: "2026-05-04",
        date_to: "2026-06-02",
        points: values.map((v, i) => ({
            period_start: `2026-05-${String(i + 4).padStart(2, "0")}`,
            active_players: v,
        })),
    };
}

function signupsSeries(values: number[]): SignupsTimeseries {
    return {
        club_id: "club-1",
        granularity: "day",
        date_from: "2026-05-04",
        date_to: "2026-06-02",
        total_signups: values.reduce((a, b) => a + b, 0),
        points: values.map((v, i) => ({
            period_start: `2026-05-${String(i + 4).padStart(2, "0")}`,
            signups: v,
        })),
    };
}

describe("computePlayerActivitySummary", () => {
    it("returns all zeros and isEmpty for undefined inputs", () => {
        const s = computePlayerActivitySummary(undefined, undefined, undefined);
        expect(s.activePlayers).toBe(0);
        expect(s.totalSignups).toBe(0);
        expect(s.peakActivePlayers).toBe(0);
        expect(s.troughActivePlayers).toBe(0);
        expect(s.activeNetChange).toBe(0);
        expect(s.activeNetChangePct).toBe(0);
        expect(s.avgSignupsPerPeriod).toBe(0);
        expect(s.periodCount).toBe(0);
        expect(s.isEmpty).toBe(true);
    });

    it("carries the KPI active-players count and window", () => {
        const s = computePlayerActivitySummary(kpi(42, 90), undefined, undefined);
        expect(s.activePlayers).toBe(42);
        expect(s.windowDays).toBe(90);
        expect(s.isEmpty).toBe(false);
    });

    it("computes peak, trough and net change across the active series", () => {
        const s = computePlayerActivitySummary(kpi(10), activeSeries([8, 12, 6, 14]), undefined);
        expect(s.peakActivePlayers).toBe(14);
        expect(s.troughActivePlayers).toBe(6);
        expect(s.activeNetChange).toBe(6); // last 14 − first 8
        expect(s.activeNetChangePct).toBeCloseTo(75, 5); // 6 / 8 × 100
        expect(s.periodCount).toBe(4);
    });

    it("guards net-change percentage when the first period is zero (no NaN)", () => {
        const s = computePlayerActivitySummary(kpi(5), activeSeries([0, 4, 8]), undefined);
        expect(s.activeNetChange).toBe(8);
        expect(s.activeNetChangePct).toBe(0);
        expect(Number.isNaN(s.activeNetChangePct)).toBe(false);
    });

    it("totals signups and averages per period from the signups series", () => {
        const s = computePlayerActivitySummary(undefined, undefined, signupsSeries([2, 3, 5]));
        expect(s.totalSignups).toBe(10);
        expect(s.avgSignupsPerPeriod).toBeCloseTo(10 / 3, 5);
    });

    it("guards the per-period average when there are no signup buckets (no NaN)", () => {
        const empty: SignupsTimeseries = {
            club_id: "club-1",
            granularity: "day",
            date_from: "2026-05-04",
            date_to: "2026-06-02",
            total_signups: 0,
            points: [],
        };
        const s = computePlayerActivitySummary(undefined, undefined, empty);
        expect(s.avgSignupsPerPeriod).toBe(0);
        expect(Number.isNaN(s.avgSignupsPerPeriod)).toBe(false);
    });

    it("coerces string-decimal numeric fields", () => {
        const messy = {
            club_id: "club-1",
            as_of: "2026-06-02",
            window_days: "30",
            active_players: "7",
        } as unknown as ActivePlayersKpi;
        const s = computePlayerActivitySummary(messy, undefined, undefined);
        expect(s.activePlayers).toBe(7);
        expect(s.windowDays).toBe(30);
    });

    it("is not empty when only the timeseries has points", () => {
        const s = computePlayerActivitySummary(undefined, activeSeries([1, 2]), undefined);
        expect(s.isEmpty).toBe(false);
    });
});
