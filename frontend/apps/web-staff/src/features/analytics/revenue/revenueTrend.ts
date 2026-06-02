import type { RevenueTimeseriesPoint } from "@repo/staff-domain/models";

export type RevenueTrendStats = {
    /** Net revenue summed across all periods. */
    totalNet: number;
    /** Average net revenue per period (guarded against empty input). */
    avgNetPerPeriod: number;
    /** Highest single-period net amount, and the period it occurred in. */
    peakNet: number;
    peakPeriod: string | null;
    /**
     * Momentum: net revenue of the most recent period vs the period before it,
     * expressed as a signed percentage. `0` when there is no prior period or the
     * prior period was `0` (guarded — never NaN/Infinity).
     */
    changePct: number;
    /** Sign of `changePct`, for picking an up/down/flat affordance without re-deriving. */
    direction: "up" | "down" | "flat";
    /** Number of periods the trend is computed over. */
    periodCount: number;
    /** True when there is nothing to render. */
    isEmpty: boolean;
};

function netOf(point: RevenueTimeseriesPoint): number {
    return Number(point.net_amount) || 0;
}

/**
 * Derives headline trend KPIs from a revenue timeseries. Pure — the chart and
 * the View read these instead of recomputing inline. All divisors are guarded
 * (see FE_ANALYTICS_GUIDE Step 2): empty/zero input yields `0`, never `NaN`.
 */
export function computeRevenueTrend(points: RevenueTimeseriesPoint[]): RevenueTrendStats {
    if (points.length === 0) {
        return {
            totalNet: 0,
            avgNetPerPeriod: 0,
            peakNet: 0,
            peakPeriod: null,
            changePct: 0,
            direction: "flat",
            periodCount: 0,
            isEmpty: true,
        };
    }

    const totalNet = points.reduce((sum, p) => sum + netOf(p), 0);
    const avgNetPerPeriod = totalNet / points.length;

    let peakNet = -Infinity;
    let peakPeriod: string | null = null;
    for (const p of points) {
        const net = netOf(p);
        if (net > peakNet) {
            peakNet = net;
            peakPeriod = p.period_start;
        }
    }
    if (peakNet === -Infinity) peakNet = 0;

    let changePct = 0;
    const last = points.at(-1);
    const prev = points.at(-2);
    if (last && prev) {
        const prevNet = netOf(prev);
        if (prevNet !== 0) changePct = ((netOf(last) - prevNet) / Math.abs(prevNet)) * 100;
    }

    const direction: RevenueTrendStats["direction"] =
        changePct > 0 ? "up" : changePct < 0 ? "down" : "flat";

    return {
        totalNet,
        avgNetPerPeriod,
        peakNet,
        peakPeriod,
        changePct,
        direction,
        periodCount: points.length,
        isEmpty: false,
    };
}
