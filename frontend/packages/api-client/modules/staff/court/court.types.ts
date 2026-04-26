import type { UUID } from "../common";
export type { UUID };

export type {
    SurfaceType,
    CourtListParams,
    CourtResponse,
    TimeSlot,
    CourtAvailabilityResponse,
} from "../../share/court/court.types";
import type { SurfaceType } from "../../share/court/court.types";

export type CalendarReservationType =
    | "training_block"
    | "private_hire"
    | "maintenance"
    | "tournament_hold";

export interface CalendarReservationListParams {
    club_id: string;
    reservation_type?: CalendarReservationType;
    court_id?: string;
    from_dt?: string;
    to_dt?: string;
}

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

export interface CalendarReservationCreate {
    club_id: UUID;
    court_id?: UUID | null;
    reservation_type: CalendarReservationType;
    title: string;
    start_datetime: string;
    end_datetime: string;
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
    allowed_booking_types: string[] | null;
    is_recurring: boolean;
    recurrence_rule: string | null;
    recurrence_end_date: string | null;
    created_by: UUID;
    created_at: string;
    updated_at: string;
}
