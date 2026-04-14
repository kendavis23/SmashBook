export type UUID = string;

export type BookingType =
    | "regular"
    | "lesson_individual"
    | "lesson_group"
    | "corporate_event"
    | "tournament";

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";

export interface TrainerAvailability {
    id: UUID;
    staff_profile_id: UUID;
    /** 0 = Monday … 6 = Sunday */
    day_of_week: number;
    start_time: string;
    end_time: string;
    set_by_user_id: UUID;
    effective_from: string;
    effective_until: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface TrainerAvailabilityInput {
    club_id: UUID;
    /** 0 = Monday … 6 = Sunday */
    day_of_week: number;
    start_time: string;
    end_time: string;
    effective_from: string;
    effective_until?: string | null;
    notes?: string | null;
}

export interface TrainerAvailabilityUpdateInput {
    day_of_week?: number | null;
    start_time?: string | null;
    end_time?: string | null;
    effective_from?: string | null;
    effective_until?: string | null;
    notes?: string | null;
}

export interface BookingParticipant {
    user_id: UUID;
    full_name: string;
    email: string;
    role: string;
    payment_status: string;
    invite_status: string;
}

export interface TrainerBookingItem {
    booking_id: UUID;
    club_id: UUID;
    court_id: UUID;
    court_name: string;
    booking_type: BookingType;
    status: BookingStatus;
    start_datetime: string;
    end_datetime: string;
    participants: BookingParticipant[];
}

export interface Trainer {
    id: UUID;
    user_id: UUID;
    club_id: UUID;
    bio: string | null;
    is_active: boolean;
    availability: TrainerAvailability[];
}
