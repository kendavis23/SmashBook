import type { UUID } from "../common";
export type { UUID };

// ── Enums ────────────────────────────────────────────────────────────────────

export type PlayerSort = "lifetime_spend" | "bookings_played" | "last_played_at";

export type GroupDimension = "membership_tier" | "member_status" | "activity_status";

export type FlowGranularity = "day" | "week" | "month";

// ── Workstream B — per-player value ──────────────────────────────────────────

export interface PlayerValueRow {
    user_id: UUID;
    full_name: string | null;
    email: string | null;
    is_paid_member: boolean;
    membership_plan_name: string | null;
    first_played_at: string | null;
    last_played_at: string | null;
    bookings_played: number;
    played_last_30d: number;
    played_last_90d: number;
    lifetime_gross: number;
    lifetime_refunds: number;
    lifetime_spend: number;
    payments_count: number;
    currency: string | null;
}

export interface PlayerValueLeaderboard {
    club_id: UUID;
    members_only: boolean;
    sort: PlayerSort;
    limit: number;
    offset: number;
    total_records: number;
    rows: PlayerValueRow[];
}

export interface PlayerActivityLeaderboard {
    club_id: UUID;
    window_days: number;
    limit: number;
    offset: number;
    total_records: number;
    rows: PlayerValueRow[];
}

export interface InactiveMembersReport {
    club_id: UUID;
    inactive_days: number;
    cutoff: string;
    member_count: number;
    inactive_count: number;
    total_records: number;
    limit: number;
    offset: number;
    rows: PlayerValueRow[];
}

export interface GroupValueRow {
    group_key: string;
    group_label: string;
    player_count: number;
    paid_member_count: number;
    total_lifetime_spend: number;
    avg_lifetime_spend: number;
    total_lifetime_refunds: number;
    total_bookings_played: number;
}

export interface GroupValueReport {
    club_id: UUID;
    dimension: GroupDimension;
    inactive_days: number;
    currency: string | null;
    rows: GroupValueRow[];
}

// ── Workstream A — club-level player flow ────────────────────────────────────

export interface ActivePlayersKpi {
    club_id: UUID;
    as_of: string;
    window_days: number;
    active_players: number;
}

export interface ActivePlayersPoint {
    period_start: string;
    active_players: number;
}

export interface ActivePlayersTimeseries {
    club_id: UUID;
    granularity: FlowGranularity;
    date_from: string;
    date_to: string;
    points: ActivePlayersPoint[];
}

export interface SignupsPoint {
    period_start: string;
    signups: number;
}

export interface SignupsTimeseries {
    club_id: UUID;
    granularity: FlowGranularity;
    date_from: string;
    date_to: string;
    total_signups: number;
    points: SignupsPoint[];
}
