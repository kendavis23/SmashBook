export type {
    Trainer,
    TrainerAvailability,
    TrainerAvailabilityInput,
    TrainerAvailabilityUpdateInput,
    TrainerBookingItem,
    BookingType,
    BookingStatus,
} from "@repo/staff-domain/models";

export type TrainerTab = "availability" | "bookings";

export const TRAINER_TABS: { id: TrainerTab; label: string }[] = [
    { id: "availability", label: "Availability" },
    { id: "bookings", label: "Bookings" },
];

export const DAY_LABELS: Record<number, string> = {
    0: "Monday",
    1: "Tuesday",
    2: "Wednesday",
    3: "Thursday",
    4: "Friday",
    5: "Saturday",
    6: "Sunday",
};

export const DAY_OPTIONS: { value: string; label: string }[] = [
    { value: "0", label: "Monday" },
    { value: "1", label: "Tuesday" },
    { value: "2", label: "Wednesday" },
    { value: "3", label: "Thursday" },
    { value: "4", label: "Friday" },
    { value: "5", label: "Saturday" },
    { value: "6", label: "Sunday" },
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

export interface AvailabilityFormState {
    day_of_week: string;
    start_time: string;
    end_time: string;
    effective_from: string;
    effective_until: string;
    notes: string;
}

export function createDefaultAvailabilityForm(): AvailabilityFormState {
    return {
        day_of_week: "0",
        start_time: "",
        end_time: "",
        effective_from: new Date().toISOString().slice(0, 10),
        effective_until: "",
        notes: "",
    };
}
