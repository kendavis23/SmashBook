import { describe, expect, it } from "vitest";
import { computeSegmentSummary } from "./playerSegmentsSummary";
import type { GroupValueReport, GroupValueRow } from "../types";

function row(overrides: Partial<GroupValueRow>): GroupValueRow {
    return {
        group_key: "k",
        group_label: "Segment",
        player_count: 0,
        paid_member_count: 0,
        total_lifetime_spend: 0,
        avg_lifetime_spend: 0,
        total_lifetime_refunds: 0,
        total_bookings_played: 0,
        ...overrides,
    };
}

function report(rows: GroupValueRow[], currency: string | null = "INR"): GroupValueReport {
    return { club_id: "club-1", dimension: "membership_tier", inactive_days: 30, currency, rows };
}

describe("computeSegmentSummary", () => {
    it("returns empty zeros when the report is undefined", () => {
        const s = computeSegmentSummary(undefined);
        expect(s.isEmpty).toBe(true);
        expect(s.totalPlayers).toBe(0);
        expect(s.paidMemberPct).toBe(0);
        expect(s.avgLifetimeSpendPerPlayer).toBe(0);
        expect(s.rows).toEqual([]);
    });

    it("returns empty when rows are empty", () => {
        const s = computeSegmentSummary(report([]));
        expect(s.isEmpty).toBe(true);
        expect(s.rows).toHaveLength(0);
    });

    it("sums player, member, spend, refund and booking totals across segments", () => {
        const s = computeSegmentSummary(
            report([
                row({
                    group_key: "premium",
                    player_count: 90,
                    paid_member_count: 90,
                    total_lifetime_spend: 270000,
                    total_lifetime_refunds: 9000,
                    total_bookings_played: 500,
                }),
                row({
                    group_key: "free",
                    player_count: 10,
                    paid_member_count: 0,
                    total_lifetime_spend: 13000,
                    total_lifetime_refunds: 400,
                    total_bookings_played: 48,
                }),
            ])
        );
        expect(s.totalPlayers).toBe(100);
        expect(s.totalPaidMembers).toBe(90);
        expect(s.totalLifetimeSpend).toBe(283000);
        expect(s.totalLifetimeRefunds).toBe(9400);
        expect(s.totalBookingsPlayed).toBe(548);
        expect(s.isEmpty).toBe(false);
        expect(s.currency).toBe("INR");
    });

    it("computes spend per player from summed totals, not from per-segment averages", () => {
        // A 90-player segment must outweigh a 10-player one.
        const s = computeSegmentSummary(
            report([
                row({ player_count: 90, total_lifetime_spend: 270000, avg_lifetime_spend: 3000 }),
                row({ player_count: 10, total_lifetime_spend: 10000, avg_lifetime_spend: 1000 }),
            ])
        );
        // 280000 / 100 = 2800, NOT the mean of the per-segment averages (2000).
        expect(s.avgLifetimeSpendPerPlayer).toBe(2800);
    });

    it("guards divide-by-zero — no NaN when a segment or the club has no players", () => {
        const s = computeSegmentSummary(
            report([row({ group_key: "empty", player_count: 0, paid_member_count: 0 })])
        );
        expect(s.paidMemberPct).toBe(0);
        expect(s.avgLifetimeSpendPerPlayer).toBe(0);
        expect(s.rows[0]?.paidMemberPct).toBe(0);
        expect(s.rows[0]?.playerSharePct).toBe(0);
        expect(Number.isNaN(s.paidMemberPct)).toBe(false);
    });

    it("computes per-segment paid-member and player-share percentages", () => {
        const s = computeSegmentSummary(
            report([
                row({ group_key: "a", player_count: 75, paid_member_count: 75 }),
                row({ group_key: "b", player_count: 25, paid_member_count: 0 }),
            ])
        );
        expect(s.rows[0]?.paidMemberPct).toBe(100);
        expect(s.rows[0]?.playerSharePct).toBe(75);
        expect(s.rows[1]?.paidMemberPct).toBe(0);
        expect(s.rows[1]?.playerSharePct).toBe(25);
        expect(s.paidMemberPct).toBe(75);
    });

    it("coerces string-decimal API fields to numbers", () => {
        const s = computeSegmentSummary(
            report([
                row({
                    player_count: 5,
                    total_lifetime_spend: "1234.50" as unknown as number,
                    avg_lifetime_spend: "246.90" as unknown as number,
                }),
            ])
        );
        expect(s.totalLifetimeSpend).toBeCloseTo(1234.5);
        expect(s.rows[0]?.avgLifetimeSpend).toBeCloseTo(246.9);
    });
});
