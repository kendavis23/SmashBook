import type { UUID } from "../common";
export type { UUID };

export type SurfaceType = "artificial_grass" | "concrete" | "carpet" | "wood";

export type CalendarReservationType = "block" | "maintenance" | "event" | "skill_filter";

export interface CourtCreate {
    club_id: UUID;
    name: string;
    surface_type: SurfaceType;
    has_lighting?: boolean;
    lighting_surcharge?: number | null;
    is_active?: boolean;
}

export interface CourtUpdate {
    name?: string;
    surface_type?: SurfaceType;
    has_lighting?: boolean;
    lighting_surcharge?: number | null;
    is_active?: boolean;
}

export interface CourtResponse {
    id: UUID;
    club_id: UUID;
    name: string;
    surface_type: SurfaceType;
    has_lighting: boolean;
    lighting_surcharge: number | null;
    is_active: boolean;
}

export interface TimeSlot {
    start_time: string;
    end_time: string;
    is_available: boolean;
    price: number | null;
    price_label: string | null;
}

export interface CourtAvailabilityResponse {
    court_id: UUID;
    date: string;
    slots: TimeSlot[];
}

export interface CalendarReservationCreate {
    club_id: UUID;
    court_id?: UUID | null;
    reservation_type: CalendarReservationType;
    title: string;
    start_datetime: string;
    end_datetime: string;
    anchor_skill_level?: number | null;
    skill_range_above?: number | null;
    skill_range_below?: number | null;
    allowed_booking_types?: string[] | null;
    is_recurring?: boolean;
    recurrence_rule?: string | null;
    recurrence_end_date?: string | null;
}

export interface CalendarReservationUpdate {
    court_id?: UUID | null;
    reservation_type?: CalendarReservationType;
    title?: string;
    start_datetime?: string;
    end_datetime?: string;
    anchor_skill_level?: number | null;
    skill_range_above?: number | null;
    skill_range_below?: number | null;
    allowed_booking_types?: string[] | null;
    is_recurring?: boolean;
    recurrence_rule?: string | null;
    recurrence_end_date?: string | null;
}

export interface CalendarReservationResponse {
    id: UUID;
    club_id: UUID;
    court_id: UUID | null;
    reservation_type: CalendarReservationType;
    title: string;
    start_datetime: string;
    end_datetime: string;
    anchor_skill_level: number | null;
    skill_range_above: number | null;
    skill_range_below: number | null;
    allowed_booking_types: string[] | null;
    is_recurring: boolean;
    recurrence_rule: string | null;
    recurrence_end_date: string | null;
    created_by: UUID;
    created_at: string;
    updated_at: string;
}
