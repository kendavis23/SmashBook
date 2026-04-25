export type UUID = string;

export type NotificationChannel = "push" | "email" | "sms" | "in_app";

export type BookingType =
    | "regular"
    | "lesson_individual"
    | "lesson_group"
    | "corporate_event"
    | "tournament";

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";

export type PlayerRole = "organiser" | "player";

export type InviteStatus = "pending" | "accepted" | "declined";

export type PaymentStatus = "pending" | "paid" | "refunded";

export interface UserProfile {
    id: UUID;
    email: string;
    full_name: string;
    phone: string | null;
    photo_url: string | null;
    skill_level: number | null;
    preferred_notification_channel: NotificationChannel;
    is_active: boolean;
}

export interface UserProfileUpdateInput {
    full_name?: string | null;
    phone?: string | null;
    photo_url?: string | null;
    preferred_notification_channel?: NotificationChannel | null;
}

export interface PlayerBookingItem {
    booking_id: UUID;
    club_id: UUID;
    court_id: UUID;
    court_name: string;
    booking_type: BookingType;
    status: BookingStatus;
    start_datetime: string;
    end_datetime: string;
    role: PlayerRole;
    invite_status: InviteStatus;
    payment_status: PaymentStatus;
    amount_due: number;
}

export interface PlayerBookings {
    upcoming: PlayerBookingItem[];
    past: PlayerBookingItem[];
}
