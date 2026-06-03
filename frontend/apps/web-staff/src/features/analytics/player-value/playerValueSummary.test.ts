import { describe, expect, it } from "vitest";
import { computePlayerValueSummary } from "./playerValueSummary";
import type { PlayerValueRow, PlayerValueLeaderboard } from "../types";

function row(overrides: Partial<PlayerValueRow>): PlayerValueRow {
    return {
        user_id: "u1",
        full_name: "A",
        email: "a@x.com",
        is_paid_member: true,
        membership_plan_name: "Premium",
        first_played_at: "2025-01-01",
        last_played_at: "2026-05-01",
        bookings_played: 0,
        played_last_30d: 0,
        played_last_90d: 0,
        lifetime_gross: 0,
        lifetime_refunds: 0,
        lifetime_spend: 0,
        payments_count: 0,
        currency: "INR",
        ...overrides,
    };
}

function value(rows: PlayerValueRow[]): PlayerValueLeaderboard {
    return {
        club_id: "c1",
        members_only: false,
        sort: "lifetime_spend",
        limit: 10,
        offset: 0,
        rows,
    };
}

describe("computePlayerValueSummary", () => {
    it("returns zeros and isEmpty for undefined input", () => {
        const s = computePlayerValueSummary(undefined);
        expect(s.totalBookings).toBe(0);
        expect(s.totalLifetimeSpend).toBe(0);
        expect(s.isEmpty).toBe(true);
    });

    it("sums bookings and lifetime spend across the value leaderboard", () => {
        const v = value([
            row({ user_id: "u1", bookings_played: 48, lifetime_spend: 78450 }),
            row({ user_id: "u2", bookings_played: 42, lifetime_spend: 62300 }),
        ]);
        const s = computePlayerValueSummary(v);
        expect(s.totalBookings).toBe(90);
        expect(s.totalLifetimeSpend).toBe(140750);
        expect(s.isEmpty).toBe(false);
    });

    it("coerces string-decimal spend fields before summing", () => {
        const v = value([
            row({ user_id: "u1", lifetime_spend: "100.50" as unknown as number }),
            row({ user_id: "u2", lifetime_spend: "9.50" as unknown as number }),
        ]);
        const s = computePlayerValueSummary(v);
        expect(s.totalLifetimeSpend).toBe(110);
    });

    it("guards divide-by-zero — isEmpty is false when rows exist", () => {
        const v = value([row({ user_id: "u1", lifetime_spend: 0 })]);
        const s = computePlayerValueSummary(v);
        expect(s.isEmpty).toBe(false);
    });
});
