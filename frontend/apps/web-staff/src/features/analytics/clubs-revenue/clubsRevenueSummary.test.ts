import { describe, expect, it } from "vitest";
import { computeClubsRevenueSummary } from "./clubsRevenueSummary";
import type { ClubRevenueComparisonRow, TenantRevenueComparison } from "../types";

function club(over: Partial<ClubRevenueComparisonRow>): ClubRevenueComparisonRow {
    return {
        club_id: "c1",
        club_name: "Club",
        currency: "USD",
        gross_amount: 0,
        refund_amount: 0,
        net_amount: 0,
        transaction_count: 0,
        ...over,
    };
}

function comparison(clubs: ClubRevenueComparisonRow[]): TenantRevenueComparison {
    return { basis: "service", date_from: "2026-06-01", date_to: "2026-06-30", clubs };
}

describe("computeClubsRevenueSummary", () => {
    it("returns empty zeros when data is undefined", () => {
        const s = computeClubsRevenueSummary(undefined);
        expect(s.isEmpty).toBe(true);
        expect(s.rows).toEqual([]);
        expect(s.totalNet).toBe(0);
        expect(s.avgPerTransaction).toBe(0);
        expect(s.clubCount).toBe(0);
    });

    it("returns empty zeros when there are no clubs", () => {
        const s = computeClubsRevenueSummary(comparison([]));
        expect(s.isEmpty).toBe(true);
        expect(s.clubCount).toBe(0);
    });

    it("sums tenant-wide totals across clubs", () => {
        const s = computeClubsRevenueSummary(
            comparison([
                club({
                    club_id: "a",
                    gross_amount: 100,
                    refund_amount: 10,
                    net_amount: 90,
                    transaction_count: 5,
                }),
                club({
                    club_id: "b",
                    gross_amount: 200,
                    refund_amount: 20,
                    net_amount: 180,
                    transaction_count: 10,
                }),
            ])
        );
        expect(s.totalGross).toBe(300);
        expect(s.totalRefund).toBe(30);
        expect(s.totalNet).toBe(270);
        expect(s.totalTransactions).toBe(15);
        expect(s.avgPerTransaction).toBe(270 / 15);
        expect(s.clubCount).toBe(2);
        expect(s.isEmpty).toBe(false);
    });

    it("sorts clubs by net revenue descending and assigns ranks", () => {
        const s = computeClubsRevenueSummary(
            comparison([
                club({ club_id: "small", club_name: "Small", net_amount: 50 }),
                club({ club_id: "big", club_name: "Big", net_amount: 500 }),
                club({ club_id: "mid", club_name: "Mid", net_amount: 200 }),
            ])
        );
        expect(s.rows.map((r) => r.clubName)).toEqual(["Big", "Mid", "Small"]);
        expect(s.rows.map((r) => r.rank)).toEqual([1, 2, 3]);
    });

    it("computes share percentages that sum to ~100", () => {
        const s = computeClubsRevenueSummary(
            comparison([
                club({ club_id: "a", net_amount: 75 }),
                club({ club_id: "b", net_amount: 25 }),
            ])
        );
        const shares = s.rows.map((r) => r.sharePct);
        expect(shares).toEqual([75, 25]);
        expect(shares.reduce((a, b) => a + b, 0)).toBeCloseTo(100);
    });

    it("guards divide-by-zero: zero transactions → avgPerTransaction 0, not NaN", () => {
        const s = computeClubsRevenueSummary(
            comparison([club({ club_id: "a", net_amount: 0, transaction_count: 0 })])
        );
        expect(s.rows[0]!.avgPerTransaction).toBe(0);
        expect(Number.isNaN(s.rows[0]!.avgPerTransaction)).toBe(false);
        expect(s.avgPerTransaction).toBe(0);
    });

    it("guards share when total net is 0 → sharePct 0, not NaN", () => {
        const s = computeClubsRevenueSummary(
            comparison([
                club({ club_id: "a", net_amount: 0 }),
                club({ club_id: "b", net_amount: 0 }),
            ])
        );
        expect(s.rows.every((r) => r.sharePct === 0)).toBe(true);
        expect(s.totalNet).toBe(0);
    });

    it("coerces string-decimal amounts from the API", () => {
        const s = computeClubsRevenueSummary(
            comparison([
                club({
                    club_id: "a",
                    // API can return decimals as strings
                    gross_amount: "120.50" as unknown as number,
                    net_amount: "100.25" as unknown as number,
                    transaction_count: "4" as unknown as number,
                }),
            ])
        );
        expect(s.totalGross).toBe(120.5);
        expect(s.totalNet).toBe(100.25);
        expect(s.rows[0]!.avgPerTransaction).toBeCloseTo(100.25 / 4);
    });

    it("resolves a single shared currency, else null for mixed", () => {
        const single = computeClubsRevenueSummary(
            comparison([
                club({ club_id: "a", currency: "USD" }),
                club({ club_id: "b", currency: "USD" }),
            ])
        );
        expect(single.currency).toBe("USD");

        const mixed = computeClubsRevenueSummary(
            comparison([
                club({ club_id: "a", currency: "USD" }),
                club({ club_id: "b", currency: "EUR" }),
            ])
        );
        expect(mixed.currency).toBeNull();
    });
});
