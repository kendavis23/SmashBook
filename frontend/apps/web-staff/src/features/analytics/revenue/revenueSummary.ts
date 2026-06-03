import type { ClubRevenueSummary, RevenueByTypeRow } from "@repo/staff-domain/models";

export type RevenueSummaryStats = {
    grossAmount: number;
    refundAmount: number;
    netAmount: number;
    transactionCount: number;
    avgTransactionValue: number;
    /** True when the API returned no data at all. */
    isEmpty: boolean;
};

export type RevenueTypeStats = {
    revenueType: string;
    grossAmount: number;
    refundAmount: number;
    netAmount: number;
    transactionCount: number;
    avgPerTransaction: number;
    /** Share of total net revenue, 0–100. */
    sharePct: number;
};

export type RevenueBreakdown = {
    rows: RevenueTypeStats[];
    totalGross: number;
    totalRefund: number;
    totalNet: number;
    totalTransactions: number;
    avgPerTransaction: number;
};

/** Derives top-level KPI stats from a ClubRevenueSummary API response. */
export function computeRevenueSummaryStats(
    data: ClubRevenueSummary | undefined
): RevenueSummaryStats {
    if (!data) {
        return {
            grossAmount: 0,
            refundAmount: 0,
            netAmount: 0,
            transactionCount: 0,
            avgTransactionValue: 0,
            isEmpty: true,
        };
    }

    return {
        grossAmount: Number(data.gross_amount) || 0,
        refundAmount: Number(data.refund_amount) || 0,
        netAmount: Number(data.net_amount) || 0,
        transactionCount: Number(data.transaction_count) || 0,
        avgTransactionValue: Number(data.avg_transaction_value) || 0,
        isEmpty: false,
    };
}

/** Derives per-type breakdown stats from a list of RevenueByTypeRow. */
export function computeRevenueBreakdown(rows: RevenueByTypeRow[]): RevenueBreakdown {
    if (rows.length === 0) {
        return {
            rows: [],
            totalGross: 0,
            totalRefund: 0,
            totalNet: 0,
            totalTransactions: 0,
            avgPerTransaction: 0,
        };
    }

    const totalNet = rows.reduce((sum, r) => sum + (Number(r.net_amount) || 0), 0);
    const totalGross = rows.reduce((sum, r) => sum + (Number(r.gross_amount) || 0), 0);
    const totalRefund = rows.reduce((sum, r) => sum + (Number(r.refund_amount) || 0), 0);
    const totalTransactions = rows.reduce((sum, r) => sum + (Number(r.transaction_count) || 0), 0);

    const typed: RevenueTypeStats[] = rows.map((r) => {
        const net = Number(r.net_amount) || 0;
        const txCount = Number(r.transaction_count) || 0;
        return {
            revenueType: r.revenue_type,
            grossAmount: Number(r.gross_amount) || 0,
            refundAmount: Number(r.refund_amount) || 0,
            netAmount: net,
            transactionCount: txCount,
            avgPerTransaction: txCount > 0 ? net / txCount : 0,
            sharePct: totalNet > 0 ? (net / totalNet) * 100 : 0,
        };
    });

    // Sort descending by net amount
    typed.sort((a, b) => b.netAmount - a.netAmount);

    // Largest-remainder correction: adjust the last item so percentages sum to exactly 100.
    if (typed.length > 0 && totalNet > 0) {
        const sumOfOthers = typed
            .slice(0, -1)
            .reduce((s, r) => s + parseFloat(r.sharePct.toFixed(1)), 0);
        const last = typed[typed.length - 1]!;
        last.sharePct = Math.max(0, parseFloat((100 - sumOfOthers).toFixed(1)));
    }

    return {
        rows: typed,
        totalGross,
        totalRefund,
        totalNet,
        totalTransactions,
        avgPerTransaction: totalTransactions > 0 ? totalNet / totalTransactions : 0,
    };
}
