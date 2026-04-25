export type {
    Booking,
    BookingInput,
    BookingUpdateInput,
    BookingListFilters,
    BookingType,
    BookingStatus,
    BookingPlayer,
    CalendarView,
    CalendarViewFilters,
    CalendarDay,
    CalendarCourtColumn,
    CalendarBookingItem,
    CalendarBlockItem,
    CalendarSlot,
    OpenGame,
    OpenGameFilters,
    InvitePlayerInput,
    PlayerRole,
    PaymentStatus,
    InviteStatus,
    TimeSlot,
    RecurringBookingInput,
    RecurringBookingResult,
} from "@repo/staff-domain/models";

// ─── Feature-specific types ────────────────────────────────────────────────

export type BookingsTab = "list" | "calendar";

export const BOOKINGS_TABS: { id: BookingsTab; label: string }[] = [
    { id: "list", label: "List" },
    { id: "calendar", label: "Calendar" },
];

export const BOOKING_TYPE_LABELS: Record<string, string> = {
    regular: "Regular",
    lesson_individual: "Individual Lesson",
    lesson_group: "Group Lesson",
    corporate_event: "Corporate Event",
    tournament: "Tournament",
};

export const BOOKING_STATUS_LABELS: Record<string, string> = {
    pending: "Pending",
    confirmed: "Confirmed",
    cancelled: "Cancelled",
    completed: "Completed",
};

export const BOOKING_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    pending: { bg: "bg-warning/15", text: "text-warning" },
    confirmed: { bg: "bg-success/15", text: "text-success" },
    cancelled: { bg: "bg-destructive/15", text: "text-destructive" },
    completed: { bg: "bg-info/15", text: "text-info" },
};

export const BOOKING_TYPE_OPTIONS: { value: string; label: string }[] = [
    { value: "", label: "All types" },
    { value: "regular", label: "Regular" },
    { value: "lesson_individual", label: "Individual Lesson" },
    { value: "lesson_group", label: "Group Lesson" },
    { value: "corporate_event", label: "Corporate Event" },
    { value: "tournament", label: "Tournament" },
];

export const BOOKING_STATUS_OPTIONS: { value: string; label: string }[] = [
    { value: "", label: "All statuses" },
    { value: "pending", label: "Pending" },
    { value: "confirmed", label: "Confirmed" },
    { value: "cancelled", label: "Cancelled" },
    { value: "completed", label: "Completed" },
];

export interface BookingsListFilters {
    dateFrom: string;
    dateTo: string;
    bookingType: string;
    bookingStatus: string;
    courtId: string;
    playerSearch: string;
}
