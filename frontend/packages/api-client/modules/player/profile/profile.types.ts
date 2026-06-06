import type { UUID } from "../common";
import type {
    BookingType,
    BookingStatus,
    PlayerRole,
    InviteStatus,
    PaymentStatus,
} from "../../share/booking/booking.types";

export type { UUID };
export type { BookingType, BookingStatus, PlayerRole, InviteStatus, PaymentStatus };

export type TenantUserRole = "player";

export type NotificationChannel = "push" | "email" | "sms" | "in_app";

export interface UserResponse {
    id: UUID;
    email: string;
    full_name: string;
    role: TenantUserRole;
    phone: string | null;
    photo_url: string | null;
    skill_level: number | null;
    preferred_notification_channel: NotificationChannel;
    is_active: boolean;
}

export interface UserProfileUpdate {
    full_name?: string | null;
    phone?: string | null;
    photo_url?: string | null;
    preferred_notification_channel?: NotificationChannel | null;
}

export interface PlayerBookingItem {
    booking_id: UUID;
    club_id: UUID;
    club_name: string;
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

export interface PlayerBookingsResponse {
    upcoming: PlayerBookingItem[];
    past: PlayerBookingItem[];
}
