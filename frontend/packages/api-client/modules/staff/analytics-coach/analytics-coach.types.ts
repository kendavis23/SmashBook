import type { UUID } from "../common";
export type { UUID };

export type CoachSort =
    | "sessions"
    | "distinct_players"
    | "repeat_players"
    | "return_rate"
    | "lesson_revenue"
    | "last_session_at";

export interface CoachPopularityRow {
    staff_profile_id: UUID;
    user_id: UUID | null;
    coach_name: string | null;
    is_active: boolean | null;
    sessions: number;
    first_session_at: string | null;
    last_session_at: string | null;
    sessions_last_30d: number;
    sessions_last_90d: number;
    distinct_players: number;
    repeat_players: number;
    return_rate: number;
    total_attendances: number;
    lesson_revenue: number;
    currency: string | null;
}

export interface CoachPopularityLeaderboard {
    club_id: UUID;
    sort: CoachSort;
    limit: number;
    offset: number;
    total_records: number;
    rows: CoachPopularityRow[];
}
