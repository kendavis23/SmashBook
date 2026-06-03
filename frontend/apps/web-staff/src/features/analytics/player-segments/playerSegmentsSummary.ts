import type { GroupValueReport, GroupValueRow } from "../types";

/** A segment row with all numeric fields coerced and a paid-member share. */
export type SegmentStats = {
    groupKey: string;
    groupLabel: string;
    players: number;
    paidMembers: number;
    /** paidMembers / players × 100, guarded. */
    paidMemberPct: number;
    totalLifetimeSpend: number;
    avgLifetimeSpend: number;
    totalLifetimeRefunds: number;
    totalBookingsPlayed: number;
    /** Share of total players across all segments, 0 when no players. */
    playerSharePct: number;
};

/** Headline figures rolled up across every segment in the report. */
export type SegmentSummary = {
    rows: SegmentStats[];
    totalPlayers: number;
    totalPaidMembers: number;
    /** paidMembers / players × 100 across all segments, guarded. */
    paidMemberPct: number;
    totalLifetimeSpend: number;
    /** Lifetime spend per player across all segments, guarded. */
    avgLifetimeSpendPerPlayer: number;
    totalLifetimeRefunds: number;
    totalBookingsPlayed: number;
    currency: string | null;
    isEmpty: boolean;
};

/** Coerce a possibly-string decimal API field to a finite number (0 otherwise). */
function num(value: number | string | null | undefined): number {
    const v = Number(value);
    return Number.isFinite(v) ? v : 0;
}

/**
 * Rolls a `GroupValueReport` into per-segment stats plus club-wide totals.
 *
 * All ratios are guarded against divide-by-zero (an empty segment, a club
 * with no players yet) and return 0, never NaN. Lifetime spend per player is
 * computed from the *summed* totals — never averaged from per-segment averages,
 * so a 90-player segment counts more than a 9-player one.
 */
export function computeSegmentSummary(report: GroupValueReport | undefined): SegmentSummary {
    const rawRows = report?.rows ?? [];

    const totals = rawRows.reduce(
        (acc, row: GroupValueRow) => {
            acc.players += num(row.player_count);
            acc.paidMembers += num(row.paid_member_count);
            acc.spend += num(row.total_lifetime_spend);
            acc.refunds += num(row.total_lifetime_refunds);
            acc.bookings += num(row.total_bookings_played);
            return acc;
        },
        { players: 0, paidMembers: 0, spend: 0, refunds: 0, bookings: 0 }
    );

    const rows: SegmentStats[] = rawRows.map((row) => {
        const players = num(row.player_count);
        const paidMembers = num(row.paid_member_count);
        return {
            groupKey: row.group_key,
            groupLabel: row.group_label,
            players,
            paidMembers,
            paidMemberPct: players > 0 ? (paidMembers / players) * 100 : 0,
            totalLifetimeSpend: num(row.total_lifetime_spend),
            avgLifetimeSpend: num(row.avg_lifetime_spend),
            totalLifetimeRefunds: num(row.total_lifetime_refunds),
            totalBookingsPlayed: num(row.total_bookings_played),
            playerSharePct: totals.players > 0 ? (players / totals.players) * 100 : 0,
        };
    });

    return {
        rows,
        totalPlayers: totals.players,
        totalPaidMembers: totals.paidMembers,
        paidMemberPct: totals.players > 0 ? (totals.paidMembers / totals.players) * 100 : 0,
        totalLifetimeSpend: totals.spend,
        avgLifetimeSpendPerPlayer: totals.players > 0 ? totals.spend / totals.players : 0,
        totalLifetimeRefunds: totals.refunds,
        totalBookingsPlayed: totals.bookings,
        currency: report?.currency ?? null,
        isEmpty: rawRows.length === 0,
    };
}
