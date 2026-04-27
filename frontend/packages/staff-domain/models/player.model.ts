export type UUID = string;

export interface ClubSummary {
    club_id: UUID;
    club_name: string;
    role: string;
}

export interface TokenResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
    clubs: ClubSummary[];
}

export interface RegisterPlayerInput {
    tenant_subdomain: string;
    email: string;
    full_name: string;
    password: string;
}

export interface SkillLevelUpdateInput {
    new_level: number;
    reason?: string | null;
}

export interface SkillLevelHistoryItem {
    id: UUID;
    previous_level: number | null;
    new_level: number;
    assigned_by: UUID;
    reason: string | null;
    created_at: string;
}

export interface SkillLevelUpdateResult {
    user_id: UUID;
    skill_level: number;
    skill_assigned_by: UUID;
    skill_assigned_at: string;
    history_entry: SkillLevelHistoryItem;
}
