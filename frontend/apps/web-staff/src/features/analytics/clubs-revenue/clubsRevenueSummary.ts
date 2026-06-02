import type { ClubRevenueComparisonRow, TenantRevenueComparison } from "../types";

/** One club's figures, derived and ready to render (sorted, with share + averages). */
export type ClubRevenueStats = {
    clubId: string;
    clubName: string;
    currency: string | null;
    grossAmount: number;
    refundAmount: number;
    netAmount: number;
    transactionCount: number;
    /** netAmount / transactionCount, 0 when there are no transactions. */
    avgPerTransaction: number;
    /** Share of total net revenue, 0–100. 0 when total net is 0. */
    sharePct: number;
    /** 1-based rank by net revenue (descending). */
    rank: number;
};

/** Tenant-wide totals + per-club derived rows for the clubs-revenue dashboard. */
export type ClubsRevenueSummary = {
    rows: ClubRevenueStats[];
    totalGross: number;
    totalRefund: number;
    totalNet: number;
    totalTransactions: number;
    /** totalNet / totalTransactions, 0 when there are no transactions. */
    avgPerTransaction: number;
    /** Number of clubs in the comparison. */
    clubCount: number;
    /** Single currency code when every club shares one, else null (mixed/none). */
    currency: string | null;
    /** True when the API returned no clubs at all. */
    isEmpty: boolean;
};

function num(value: number | string | null | undefined): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

/**
 * Derives the tenant-wide totals and per-club stats from a TenantRevenueComparison.
 * Clubs are sorted by net revenue descending; every divisor is guarded so empty /
 * zero-revenue inputs yield 0, never NaN.
 */
export function computeClubsRevenueSummary(
    data: TenantRevenueComparison | undefined
): ClubsRevenueSummary {
    const clubs: ClubRevenueComparisonRow[] = data?.clubs ?? [];

    if (clubs.length === 0) {
        return {
            rows: [],
            totalGross: 0,
            totalRefund: 0,
            totalNet: 0,
            totalTransactions: 0,
            avgPerTransaction: 0,
            clubCount: 0,
            currency: null,
            isEmpty: true,
        };
    }

    const totalGross = clubs.reduce((sum, c) => sum + num(c.gross_amount), 0);
    const totalRefund = clubs.reduce((sum, c) => sum + num(c.refund_amount), 0);
    const totalNet = clubs.reduce((sum, c) => sum + num(c.net_amount), 0);
    const totalTransactions = clubs.reduce((sum, c) => sum + num(c.transaction_count), 0);

    const sorted = [...clubs].sort((a, b) => num(b.net_amount) - num(a.net_amount));

    const rows: ClubRevenueStats[] = sorted.map((c, idx) => {
        const netAmount = num(c.net_amount);
        const transactionCount = num(c.transaction_count);
        return {
            clubId: c.club_id,
            clubName: c.club_name,
            currency: c.currency,
            grossAmount: num(c.gross_amount),
            refundAmount: num(c.refund_amount),
            netAmount,
            transactionCount,
            avgPerTransaction: transactionCount > 0 ? netAmount / transactionCount : 0,
            sharePct: totalNet > 0 ? (netAmount / totalNet) * 100 : 0,
            rank: idx + 1,
        };
    });

    return {
        rows,
        totalGross,
        totalRefund,
        totalNet,
        totalTransactions,
        avgPerTransaction: totalTransactions > 0 ? totalNet / totalTransactions : 0,
        clubCount: clubs.length,
        currency: resolveCurrency(clubs),
        isEmpty: false,
    };
}

/** Single currency when every club agrees on one; otherwise null (mixed or absent). */
function resolveCurrency(clubs: ClubRevenueComparisonRow[]): string | null {
    const codes = new Set(clubs.map((c) => c.currency).filter((c): c is string => Boolean(c)));
    if (codes.size !== 1) return null;
    const [only] = codes;
    return only ?? null;
}
