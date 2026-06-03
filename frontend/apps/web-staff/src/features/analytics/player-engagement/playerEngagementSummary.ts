import type { PlayerActivityLeaderboard, InactiveMembersReport, PlayerValueRow } from "../types";

export type PlayerEngagementSummary = {
    /** Total paid members (from the inactive-members report's member_count). */
    totalPaidMembers: number;
    /** Distinct players who played in the most-active window. */
    playedRecently: number;
    /** playedRecently as a share of total paid members, 0 when none. */
    playedRecentlyPct: number;
    /** Members inactive past the threshold (from inactive_count). */
    inactiveMembers: number;
    /** inactiveMembers as a share of total paid members, 0 when none. */
    inactivePct: number;
    /** True when neither report returned any rows. */
    isEmpty: boolean;
};

function num(value: number | string | null | undefined): number {
    const v = Number(value);
    return Number.isFinite(v) ? v : 0;
}

function countRecentlyActive(rows: PlayerValueRow[], windowDays: number): number {
    const seen = new Set<string>();
    for (const row of rows) {
        const played = windowDays >= 90 ? row.played_last_90d : row.played_last_30d;
        if (num(played) > 0) seen.add(row.user_id);
    }
    return seen.size;
}

/**
 * Builds the KPI summary from the two engagement reports.
 *
 * Every divisor is guarded — when there are no paid members the percentage
 * fields are `0`, never `NaN`.
 */
export function computePlayerEngagementSummary(
    mostActive: PlayerActivityLeaderboard | undefined,
    inactive: InactiveMembersReport | undefined,
    windowDays: number
): PlayerEngagementSummary {
    const activeRows = mostActive?.rows ?? [];
    const inactiveRows = inactive?.rows ?? [];

    const totalPaidMembers = num(inactive?.member_count);
    const inactiveMembers = num(inactive?.inactive_count);
    const playedRecently = countRecentlyActive(activeRows, windowDays);

    const playedRecentlyPct = totalPaidMembers > 0 ? (playedRecently / totalPaidMembers) * 100 : 0;
    const inactivePct = totalPaidMembers > 0 ? (inactiveMembers / totalPaidMembers) * 100 : 0;

    const isEmpty = activeRows.length === 0 && inactiveRows.length === 0;

    return {
        totalPaidMembers,
        playedRecently,
        playedRecentlyPct,
        inactiveMembers,
        inactivePct,
        isEmpty,
    };
}
