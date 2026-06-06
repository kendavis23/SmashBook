// Domain models for the booking context.
// These are the ONLY data structures apps and features should reference.
// DTO types are internal to @repo/api-client and must never be imported outside it.

export type UUID = string;

export type BookingType =
    | "regular"
    | "lesson_individual"
    | "lesson_group"
    | "train_and_play"
    | "corporate_event"
    | "tournament";

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";

export type PlayerRole = "organiser" | "player";

export type PaymentStatus = "pending" | "paid" | "refunded";

export type InviteStatus = "pending" | "accepted" | "declined";

export interface BookingListFilters {
    date_from?: string;
    date_to?: string;
    booking_type?: BookingType;
    booking_status?: BookingStatus;
    court_id?: string;
    player_search?: string;
}

export interface CalendarViewFilters {
    view?: "day" | "week";
    anchor_date?: string;
    court_id?: string;
}

export interface OpenGameFilters {
    date?: string;
    player_skill_level?: number;
    min_skill?: number;
    max_skill?: number;
}

export interface BookingInput {
    club_id: UUID;
    court_id: UUID;
    booking_type?: BookingType;
    start_datetime: string; // ISO 8601
    is_open_game?: boolean;
    max_players?: number;
    notes?: string | null;
    anchor_skill_level?: number | null;
    skill_level_override_min?: number | null;
    skill_level_override_max?: number | null;
    player_user_ids?: UUID[];
    on_behalf_of_user_id?: UUID | null;
    event_name?: string | null;
    contact_name?: string | null;
    contact_email?: string | null;
    contact_phone?: string | null;
    staff_profile_id?: UUID | null;
}

export interface BookingUpdateInput {
    court_id?: UUID | null;
    start_datetime?: string; // ISO 8601
    notes?: string | null;
    event_name?: string | null;
    contact_name?: string | null;
    contact_email?: string | null;
    contact_phone?: string | null;
}

export interface InvitePlayerInput {
    user_id: UUID;
}

export interface BookingPlayer {
    id: UUID;
    booking_id: UUID;
    user_id: UUID;
    full_name: string;
    role: PlayerRole;
    invite_status: InviteStatus;
    payment_status: PaymentStatus;
    amount_due: number;
    discount_amount: string;
    discount_source: string;
}

export interface Booking {
    id: UUID;
    club_id: UUID;
    court_id: UUID;
    court_name: string;
    booking_type: BookingType;
    status: BookingStatus;
    is_open_game: boolean;
    start_datetime: string; // ISO 8601
    end_datetime: string; // ISO 8601
    min_skill_level: number | null;
    max_skill_level: number | null;
    max_players: number | null;
    slots_available: number;
    total_price: number | null;
    notes: string | null;
    event_name: string | null;
    players: BookingPlayer[];
    created_at: string; // ISO 8601
}

export interface OpenGamePlayer {
    user_id: UUID;
    full_name: string;
    invite_status: InviteStatus;
}

export interface OpenGame {
    id: UUID;
    court_id: UUID;
    court_name: string;
    start_datetime: string; // ISO 8601
    end_datetime: string; // ISO 8601
    min_skill_level: number | null;
    max_skill_level: number | null;
    slots_available: number;
    total_price: number | null;
    players: OpenGamePlayer[];
}

export interface RecurringBookingInput {
    club_id: UUID;
    court_id: UUID;
    booking_type?: BookingType;
    first_start: string; // ISO 8601
    recurrence_rule: string;
    recurrence_end_date?: string | null; // "YYYY-MM-DD"
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
    occurrence: string; // ISO 8601
    reason: string;
}

export interface RecurringBookingResult {
    created: Booking[];
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
    start_datetime: string; // ISO 8601
    end_datetime: string; // ISO 8601
    event_name: string | null;
    players: BookingPlayer[];
    slots_available: number;
    total_price: number | null;
}

export interface CalendarBlockItem {
    kind: "block";
    id: UUID;
    court_id: UUID | null;
    start_datetime: string; // ISO 8601
    end_datetime: string; // ISO 8601
    reservation_type: string;
    title: string;
}

export type CalendarSlot = CalendarBookingItem | CalendarBlockItem;

export type CalendarTimeSlotStatus = "available" | "booked" | "blocked";

export interface CalendarTimeSlot {
    start_datetime: string; // ISO 8601
    end_datetime: string; // ISO 8601
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
    date: string; // "YYYY-MM-DD"
    courts: CalendarCourtColumn[];
}

export interface CalendarView {
    view: string;
    date_from: string;
    date_to: string;
    days: CalendarDay[];
}

export type DiscountSource = "membership" | "campaign" | "promo_code" | "staff_manual" | "ai_gap_offer";

export interface PriceQuoteFilters {
    club_id: UUID;
    start_datetime: string;
    booking_type?: BookingType;
    max_players?: number;
    for_user_id?: UUID;
}

export interface PriceQuote {
    club_id: UUID;
    booking_type: BookingType;
    start_datetime: string;
    max_players: number;
    pricing_available: boolean;
    base_price: number | null;
    unit_price: number | null;
    total_price: number | null;
    per_player_price: number | null;
    discount_amount: number | null;
    discount_source: DiscountSource | null;
    amount_due: number | null;
    membership_subscription_id: UUID | null;
    credit_applies: boolean;
}
