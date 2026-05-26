export type UUID = string;

export interface PlayerSearchResult {
    id: UUID;
    full_name: string;
    skill_level: number | null;
}

export interface PlayerSearchParams {
    q?: string;
    club_id?: string;
}

export interface RegisterPlayerInput {
    tenant_subdomain: string;
    club_id: UUID;
    email: string;
    full_name: string;
    password: string;
}

export interface RegisterPlayerResult {
    user_id: UUID;
    email: string;
    message: string;
}

export interface PlayerInviteInput {
    email: string;
    full_name: string;
    club_id: UUID;
}

export interface PlayerInviteResult {
    user_id: UUID;
    email: string;
    club_id: UUID;
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
