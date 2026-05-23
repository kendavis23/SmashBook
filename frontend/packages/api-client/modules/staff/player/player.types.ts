import type { UUID } from "../common";
export type { UUID };

export interface UserRegister {
    tenant_subdomain: string;
    club_id: UUID;
    email: string;
    full_name: string;
    password: string;
}

export interface RegisterResponse {
    user_id: UUID;
    email: string;
    message: string;
}

export interface SkillLevelUpdate {
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

export interface SkillLevelUpdateResponse {
    user_id: UUID;
    skill_level: number;
    skill_assigned_by: UUID;
    skill_assigned_at: string;
    history_entry: SkillLevelHistoryItem;
}
