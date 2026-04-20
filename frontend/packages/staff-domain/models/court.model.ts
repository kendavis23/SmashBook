// Domain models for the court context.
// These are the ONLY data structures apps and features should reference.
// DTO types are internal to @repo/api-client and must never be imported outside it.

export type UUID = string;

export type SurfaceType = "indoor" | "outdoor" | "crystal" | "artificial_grass";

export type CalendarReservationType =
    | "training_block"
    | "private_hire"
    | "maintenance"
    | "tournament_hold";

export interface Court {
    id: UUID;
    club_id: UUID;
    name: string;
    surface_type: SurfaceType;
    has_lighting: boolean;
    lighting_surcharge: number | null;
    is_active: boolean;
}

export interface CourtInput {
    club_id: UUID;
    name: string;
    surface_type: SurfaceType;
    has_lighting?: boolean;
    lighting_surcharge?: number | null;
    is_active?: boolean;
}

export interface CourtUpdateInput {
    name?: string;
    surface_type?: SurfaceType;
    has_lighting?: boolean;
    lighting_surcharge?: number | null;
    is_active?: boolean;
}

export interface TimeSlot {
    start_time: string; // "HH:MM"
    end_time: string; // "HH:MM"
    is_available: boolean;
    price: number | null;
    price_label: string | null;
}

export interface CourtAvailability {
    court_id: UUID;
    date: string; // ISO date "YYYY-MM-DD"
    slots: TimeSlot[];
}

export interface CalendarReservationInput {
    club_id: UUID;
    court_id?: UUID | null;
    reservation_type: CalendarReservationType;
    title: string;
    start_datetime: string; // ISO 8601
    end_datetime: string; // ISO 8601
    allowed_booking_types?: string[] | null;
    is_recurring?: boolean;
    recurrence_rule?: string | null;
    recurrence_end_date?: string | null;
}

export interface CalendarReservationUpdateInput {
    court_id?: UUID | null;
    reservation_type?: CalendarReservationType;
    title?: string;
    start_datetime?: string;
    end_datetime?: string;
    allowed_booking_types?: string[] | null;
    is_recurring?: boolean;
    recurrence_rule?: string | null;
    recurrence_end_date?: string | null;
}

export interface CalendarReservation {
    id: UUID;
    club_id: UUID;
    court_id: UUID | null;
    reservation_type: CalendarReservationType;
    title: string;
    start_datetime: string; // ISO 8601
    end_datetime: string; // ISO 8601
    allowed_booking_types: string[] | null;
    is_recurring: boolean;
    recurrence_rule: string | null;
    recurrence_end_date: string | null;
    created_by: UUID;
    created_at: string; // ISO 8601
    updated_at: string; // ISO 8601
}
