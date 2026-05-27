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
    BookingInput,
    TimeSlot,
} from "@repo/player-domain/models";

export type BookingTab = "upcoming" | "past";

export const BOOKING_TABS: { id: BookingTab; label: string }[] = [
    { id: "upcoming", label: "Upcoming" },
    { id: "past", label: "Past" },
];

export const BOOKING_TYPE_OPTIONS: { value: string; label: string }[] = [
    { value: "", label: "All types" },
    { value: "regular", label: "Regular" },
    { value: "lesson_individual", label: "Individual Lesson" },
    { value: "lesson_group", label: "Group Lesson" },
    { value: "corporate_event", label: "Corporate Event" },
    { value: "tournament", label: "Tournament" },
];
