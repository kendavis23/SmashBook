import type { CoachPopularityLeaderboard, CoachPopularityRow } from "../types";

/** Headline figures for the KPI cards, derived from the popularity leaderboard. */
export type CoachPopularitySummary = {
    /** Number of coaches in the leaderboard page. */
    coachCount: number;
    /** Number of active coaches (is_active === true). */
    activeCoachCount: number;
    /** All-time coaching sessions, summed across the rows. */
    totalSessions: number;
    /** Distinct players coached, summed across the rows. */
    totalDistinctPlayers: number;
    /** Lesson revenue, summed across the rows. */
    totalLessonRevenue: number;
    /**
     * Repeat players / distinct players across all rows, 0–100.
     * Player-weighted (a coach with many players counts more), divide-by-zero guarded.
     */
    avgReturnRatePct: number;
    /** True when the leaderboard returned no rows. */
    isEmpty: boolean;
};

function num(value: number | string | null | undefined): number {
    const v = Number(value);
    return Number.isFinite(v) ? v : 0;
}

function sumBy(
    rows: CoachPopularityRow[],
    pick: (r: CoachPopularityRow) => number | string
): number {
    return rows.reduce((acc, r) => acc + num(pick(r)), 0);
}

/**
 * Builds the KPI summary from the popularity leaderboard.
 * Return rate is player-weighted (repeat / distinct, not a mean of per-coach
 * rates) and every divisor is guarded — returns 0, never NaN.
 */
export function computeCoachPopularitySummary(
    value: CoachPopularityLeaderboard | undefined
): CoachPopularitySummary {
    const rows = value?.rows ?? [];

    const totalSessions = sumBy(rows, (r) => r.sessions);
    const totalDistinctPlayers = sumBy(rows, (r) => r.distinct_players);
    const totalRepeatPlayers = sumBy(rows, (r) => r.repeat_players);
    const totalLessonRevenue = sumBy(rows, (r) => r.lesson_revenue);

    const avgReturnRatePct =
        totalDistinctPlayers > 0 ? (totalRepeatPlayers / totalDistinctPlayers) * 100 : 0;

    const activeCoachCount = rows.filter((r) => r.is_active === true).length;

    return {
        coachCount: rows.length,
        activeCoachCount,
        totalSessions,
        totalDistinctPlayers,
        totalLessonRevenue,
        avgReturnRatePct,
        isEmpty: rows.length === 0,
    };
}
