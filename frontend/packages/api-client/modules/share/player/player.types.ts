import type { UUID } from "../../staff/common";
export type { UUID };

export interface PlayerSearchResult {
    id: UUID;
    full_name: string;
    skill_level: number | null;
}

export interface PlayerSearchParams {
    q?: string;
    club_id?: string;
}
