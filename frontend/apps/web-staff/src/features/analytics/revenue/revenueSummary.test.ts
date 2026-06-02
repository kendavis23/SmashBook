import { describe, expect, it } from "vitest";
import { computeRevenueSummaryStats, computeRevenueBreakdown } from "./revenueSummary";
import type { ClubRevenueSummary, RevenueByTypeRow } from "@repo/staff-domain/models";

const makeRow = (
    revenue_type: string,
    gross: number,
    refund: number,
    net: number,
    tx: number
): RevenueByTypeRow => ({
    revenue_type,
    gross_amount: gross,
    refund_amount: refund,
    net_amount: net,
    transaction_count: tx,
});

const makeSummary = (
    gross: number,
    refund: number,
    net: number,
    tx: number,
    avg: number
): ClubRevenueSummary => ({
    club_id: "club-1",
    basis: "service",
    date_from: "2026-05-01",
    date_to: "2026-05-31",
    currency: "GBP",
    gross_amount: gross,
    refund_amount: refund,
    net_amount: net,
    transaction_count: tx,
    avg_transaction_value: avg,
    by_type: [],
});

describe("computeRevenueSummaryStats", () => {
    it("returns all-zero isEmpty:true for undefined", () => {
        const result = computeRevenueSummaryStats(undefined);
        expect(result.isEmpty).toBe(true);
        expect(result.grossAmount).toBe(0);
        expect(result.netAmount).toBe(0);
        expect(result.transactionCount).toBe(0);
    });

    it("maps summary fields correctly", () => {
        const result = computeRevenueSummaryStats(makeSummary(1000, 50, 950, 100, 9.5));
        expect(result.isEmpty).toBe(false);
        expect(result.grossAmount).toBe(1000);
        expect(result.refundAmount).toBe(50);
        expect(result.netAmount).toBe(950);
        expect(result.transactionCount).toBe(100);
        expect(result.avgTransactionValue).toBeCloseTo(9.5);
    });

    it("coerces string-valued numbers from API", () => {
        const summary = makeSummary(0, 0, 0, 0, 0);
        // Simulate API returning strings (real API may do this)
        (summary as unknown as Record<string, unknown>).gross_amount = "500.50";
        (summary as unknown as Record<string, unknown>).net_amount = "450.00";
        const result = computeRevenueSummaryStats(summary);
        expect(result.grossAmount).toBeCloseTo(500.5);
        expect(result.netAmount).toBeCloseTo(450);
    });
});

describe("computeRevenueBreakdown", () => {
    it("returns empty breakdown for zero rows", () => {
        const result = computeRevenueBreakdown([]);
        expect(result.rows).toHaveLength(0);
        expect(result.totalNet).toBe(0);
        expect(result.avgPerTransaction).toBe(0);
    });

    it("computes share percentages correctly", () => {
        const rows = [
            makeRow("court_booking", 1000, 100, 900, 50),
            makeRow("coaching", 500, 50, 450, 30),
        ];
        const result = computeRevenueBreakdown(rows);
        const total = 900 + 450;
        const court = result.rows.find((r) => r.revenueType === "court_booking")!;
        expect(court.sharePct).toBeCloseTo((900 / total) * 100);
    });

    it("guards division by zero — zero transactions → avgPerTransaction is 0", () => {
        const rows = [makeRow("membership", 500, 0, 500, 0)];
        const result = computeRevenueBreakdown(rows);
        expect(result.rows[0]!.avgPerTransaction).toBe(0);
        expect(result.avgPerTransaction).toBe(0);
    });

    it("guards division by zero — zero totalNet → sharePct is 0", () => {
        const rows = [makeRow("equipment", 0, 0, 0, 10)];
        const result = computeRevenueBreakdown(rows);
        expect(result.rows[0]!.sharePct).toBe(0);
    });

    it("sorts rows by net amount descending", () => {
        const rows = [
            makeRow("equipment", 100, 0, 100, 5),
            makeRow("court_booking", 1000, 0, 1000, 50),
            makeRow("coaching", 500, 0, 500, 25),
        ];
        const result = computeRevenueBreakdown(rows);
        expect(result.rows[0]!.revenueType).toBe("court_booking");
        expect(result.rows[1]!.revenueType).toBe("coaching");
        expect(result.rows[2]!.revenueType).toBe("equipment");
    });

    it("totals are sum of all rows", () => {
        const rows = [
            makeRow("court_booking", 1000, 100, 900, 50),
            makeRow("coaching", 500, 50, 450, 30),
        ];
        const result = computeRevenueBreakdown(rows);
        expect(result.totalGross).toBe(1500);
        expect(result.totalRefund).toBe(150);
        expect(result.totalNet).toBe(1350);
        expect(result.totalTransactions).toBe(80);
    });
});
