export type UUID = string;

export interface Trainer {
    id: UUID;
    user_id: UUID;
    club_id: UUID;
    bio: string | null;
    is_active: boolean;
}
