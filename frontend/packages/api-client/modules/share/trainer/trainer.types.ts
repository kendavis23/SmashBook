type UUID = string;

export interface TrainerRead {
    id: UUID;
    user_id: UUID;
    club_id: UUID;
    bio: string | null;
    is_active: boolean;
}
