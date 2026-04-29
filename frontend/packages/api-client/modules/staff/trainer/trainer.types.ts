import type { UUID } from "../common";
import type { BookingStatus, BookingType } from "../booking/booking.types";
export type { UUID, BookingType, BookingStatus };

export interface TrainerAvailabilityCreate {
    club_id: UUID;
    day_of_week: number;
    start_time: string;
    end_time: string;
    effective_from: string;
    effective_until?: string | null;
    notes?: string | null;
}

export interface TrainerAvailabilityUpdate {
    day_of_week?: number | null;
    start_time?: string | null;
    end_time?: string | null;
    effective_from?: string | null;
    effective_until?: string | null;
    notes?: string | null;
}

export interface TrainerAvailabilityRead {
    id: UUID;
    staff_profile_id: UUID;
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

export interface TrainerRead {
    id: UUID;
    user_id: UUID;
    club_id: UUID;
    full_name: string;
    bio: string | null;
    is_active: boolean;
    availability: TrainerAvailabilityRead[];
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
