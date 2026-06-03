import type { ActivePlayersKpi, ActivePlayersTimeseries, SignupsTimeseries } from "../types";

/** Headline figures for the KPI cards, derived from the three flow reports. */
export type PlayerActivitySummary = {
    /** Active players over the KPI window (distinct players who played). */
    activePlayers: number;
    /** The window (days) the active-players KPI counts over. */
    windowDays: number;
    /** New signups across the whole selected range (from the signups report). */
    totalSignups: number;
    /** Mean signups per period bucket across the range, 0 when no buckets. */
    avgSignupsPerPeriod: number;
    /** Highest active-players value across the timeseries, 0 when empty. */
    peakActivePlayers: number;
    /** Lowest active-players value across the timeseries, 0 when empty. */
    troughActivePlayers: number;
    /**
     * Net change in active players from the first to the last period in the
     * range (last − first). Positive = growing, negative = shrinking.
     */
    activeNetChange: number;
    /** activeNetChange as a percentage of the first period, 0 when first is 0. */
    activeNetChangePct: number;
    /** Number of periods (buckets) in the active-players timeseries. */
    periodCount: number;
    /** True when every report came back empty (no KPI, no points, no signups). */
    isEmpty: boolean;
};

/** Coerces a possibly-string numeric field to a finite number, else 0. */
function num(value: number | string | null | undefined): number {
    const v = Number(value);
    return Number.isFinite(v) ? v : 0;
}

/**
 * Builds the KPI summary from the active-players KPI, the active-players
 * timeseries, and the signups timeseries.
 *
 * Every divisor is guarded — when there are no periods or the first period is
 * zero, the derived percentage / average fields are `0`, never `NaN` (the single
 * most important analytics correctness rule; see the analytics guide).
 */
export function computePlayerActivitySummary(
    kpi: ActivePlayersKpi | undefined,
    activeSeries: ActivePlayersTimeseries | undefined,
    signupsSeries: SignupsTimeseries | undefined
): PlayerActivitySummary {
    const activePoints = activeSeries?.points ?? [];
    const signupPoints = signupsSeries?.points ?? [];

    const activePlayers = num(kpi?.active_players);
    const windowDays = num(kpi?.window_days);
    const totalSignups = num(signupsSeries?.total_signups);

    const activeValues = activePoints.map((p) => num(p.active_players));
    const peakActivePlayers = activeValues.length > 0 ? Math.max(...activeValues) : 0;
    const troughActivePlayers = activeValues.length > 0 ? Math.min(...activeValues) : 0;

    const first = activeValues[0] ?? 0;
    const last = activeValues[activeValues.length - 1] ?? 0;
    const activeNetChange = last - first;
    const activeNetChangePct = first > 0 ? (activeNetChange / first) * 100 : 0;

    const periodCount = activePoints.length;
    const avgSignupsPerPeriod = signupPoints.length > 0 ? totalSignups / signupPoints.length : 0;

    const isEmpty =
        activePlayers === 0 &&
        totalSignups === 0 &&
        activePoints.length === 0 &&
        signupPoints.length === 0;

    return {
        activePlayers,
        windowDays,
        totalSignups,
        avgSignupsPerPeriod,
        peakActivePlayers,
        troughActivePlayers,
        activeNetChange,
        activeNetChangePct,
        periodCount,
        isEmpty,
    };
}
