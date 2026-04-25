import type { UUID } from "../common";
import type {
    BookingType,
    BookingStatus,
    InviteStatus,
    BookingResponse,
    BookingPlayerResponse,
} from "../../share/booking/booking.types";

export type { UUID };

export type {
    BookingType,
    BookingStatus,
    PlayerRole,
    PaymentStatus,
    InviteStatus,
    BookingCreate,
    InvitePlayerRequest,
    BookingPlayerResponse,
    BookingResponse,
    OpenGameListParams,
    OpenGameSummary,
} from "../../share/booking/booking.types";

export interface BookingListParams {
    club_id: string;
    date_from?: string;
    date_to?: string;
    booking_type?: BookingType;
    booking_status?: BookingStatus;
    court_id?: string;
    player_search?: string;
}

export interface CalendarViewParams {
    club_id: string;
    view?: "day" | "week";
    anchor_date?: string;
    court_id?: string;
}

export interface BookingUpdate {
    court_id?: UUID | null;
    start_datetime?: string;
    notes?: string | null;
    event_name?: string | null;
    contact_name?: string | null;
    contact_email?: string | null;
    contact_phone?: string | null;
}

export interface RecurringBookingCreate {
    club_id: UUID;
    court_id: UUID;
    booking_type?: BookingType;
    first_start: string;
    recurrence_rule: string;
    recurrence_end_date?: string | null;
    max_players?: number;
    player_user_ids?: UUID[];
    notes?: string | null;
    event_name?: string | null;
    contact_name?: string | null;
    contact_email?: string | null;
    contact_phone?: string | null;
    staff_profile_id?: UUID | null;
    skip_conflicts?: boolean;
}

export interface RecurringBookingSkipped {
    occurrence: string;
    reason: string;
}

export interface RecurringBookingResponse {
    created: BookingResponse[];
    skipped: RecurringBookingSkipped[];
}

export interface CalendarBookingItem {
    kind: "booking";
    id: UUID;
    court_id: UUID;
    court_name: string;
    booking_type: BookingType;
    status: BookingStatus;
    is_open_game: boolean;
    start_datetime: string;
    end_datetime: string;
    event_name: string | null;
    players: BookingPlayerResponse[];
    slots_available: number;
    total_price: number | null;
}

export interface CalendarBlockItem {
    kind: "block";
    id: UUID;
    court_id: UUID | null;
    start_datetime: string;
    end_datetime: string;
    reservation_type: string;
    title: string;
}

export type CalendarSlot = CalendarBookingItem | CalendarBlockItem;

export type CalendarTimeSlotStatus = "available" | "booked" | "blocked";

export interface CalendarTimeSlot {
    start_datetime: string;
    end_datetime: string;
    status: CalendarTimeSlotStatus;
    booking_id: UUID | null;
    reservation_id: UUID | null;
}

export interface CalendarCourtColumn {
    court_id: UUID;
    court_name: string;
    slots: CalendarSlot[];
    time_slots: CalendarTimeSlot[];
}

export interface CalendarDay {
    date: string;
    courts: CalendarCourtColumn[];
}

export interface CalendarResponse {
    view: string;
    date_from: string;
    date_to: string;
    days: CalendarDay[];
}
