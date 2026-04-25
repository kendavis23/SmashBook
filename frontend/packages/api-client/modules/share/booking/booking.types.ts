export type UUID = string;

export type BookingType =
    | "regular"
    | "lesson_individual"
    | "lesson_group"
    | "corporate_event"
    | "tournament";

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";

export type PlayerRole = "organiser" | "player";

export type PaymentStatus = "pending" | "paid" | "refunded";

export type InviteStatus = "pending" | "accepted" | "declined";

export interface OpenGameListParams {
    club_id: string;
    date?: string;
    min_skill?: number;
    max_skill?: number;
}

export interface BookingCreate {
    club_id: UUID;
    court_id: UUID;
    booking_type?: BookingType;
    start_datetime: string;
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

export interface InvitePlayerRequest {
    user_id: UUID;
}

export interface BookingPlayerResponse {
    id: UUID;
    booking_id: UUID;
    user_id: UUID;
    full_name: string;
    role: PlayerRole;
    invite_status: InviteStatus;
    payment_status: PaymentStatus;
    amount_due: number;
}

export interface BookingResponse {
    id: UUID;
    club_id: UUID;
    court_id: UUID;
    court_name: string;
    booking_type: BookingType;
    status: BookingStatus;
    is_open_game: boolean;
    start_datetime: string;
    end_datetime: string;
    min_skill_level: number | null;
    max_skill_level: number | null;
    max_players: number | null;
    slots_available: number;
    total_price: number | null;
    notes: string | null;
    event_name: string | null;
    players: BookingPlayerResponse[];
    created_at: string;
}

export interface OpenGameSummary {
    id: UUID;
    court_id: UUID;
    court_name: string;
    start_datetime: string;
    end_datetime: string;
    min_skill_level: number | null;
    max_skill_level: number | null;
    slots_available: number;
    total_price: number | null;
}
