export type {
    PlayerBookingItem,
    PlayerBookings,
    Booking,
    BookingPlayer,
    BookingType,
    BookingStatus,
    PlayerRole,
    InviteStatus,
    PaymentStatus,
} from "@repo/player-domain/models";

export type BookingTab = "upcoming" | "past";

export const BOOKING_TABS: { id: BookingTab; label: string }[] = [
    { id: "upcoming", label: "Upcoming" },
    { id: "past", label: "Past" },
];
