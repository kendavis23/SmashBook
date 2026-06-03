import type { PlayerValueLeaderboard, PlayerValueRow } from "../types";

/** Headline figures for the KPI cards, derived from the value leaderboard. */
export type PlayerValueSummary = {
    /** Lifetime bookings played, summed across the value leaderboard rows. */
    totalBookings: number;
    /** Lifetime net spend, summed across the value leaderboard rows. */
    totalLifetimeSpend: number;
    /** True when the leaderboard returned no rows. */
    isEmpty: boolean;
};

function num(value: number | string | null | undefined): number {
    const v = Number(value);
    return Number.isFinite(v) ? v : 0;
}

function sumBy(rows: PlayerValueRow[], pick: (r: PlayerValueRow) => number | string): number {
    return rows.reduce((acc, r) => acc + num(pick(r)), 0);
}

/**
 * Builds the KPI summary from the value leaderboard.
 * Every divisor is guarded — returns 0, never NaN.
 */
export function computePlayerValueSummary(
    value: PlayerValueLeaderboard | undefined
): PlayerValueSummary {
    const valueRows = value?.rows ?? [];

    const totalBookings = sumBy(valueRows, (r) => r.bookings_played);
    const totalLifetimeSpend = sumBy(valueRows, (r) => r.lifetime_spend);

    return {
        totalBookings,
        totalLifetimeSpend,
        isEmpty: valueRows.length === 0,
    };
}
