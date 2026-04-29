export type UUID = string;

export interface Trainer {
    id: UUID;
    user_id: UUID;
    club_id: UUID;
    bio: string | null;
    is_active: boolean;
}

export interface TrainerAvailableSummary {
    staff_profile_id: UUID;
    club_id: UUID;
    full_name: string;
    bio: string | null;
}

export interface ListAvailableTrainersParams {
    clubId: string;
    date: string;
    startTime: string;
    endTime: string;
}
