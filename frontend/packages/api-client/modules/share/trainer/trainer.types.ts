type UUID = string;

export interface TrainerRead {
    id: UUID;
    user_id: UUID;
    club_id: UUID;
    bio: string | null;
    is_active: boolean;
}

export interface TrainerAvailableSummary {
    id: UUID;
    user_id: UUID;
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
