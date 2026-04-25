export type { OpenGame, OpenGameFilters, Booking } from "@repo/staff-domain/models";

export interface OpenMatchListFilters {
    date: string;
    minSkill: string;
    maxSkill: string;
}

export const BOOKING_TYPE_LABELS: Record<string, string> = {
    regular: "Regular",
    lesson: "Lesson",
    tournament: "Tournament",
    corporate: "Corporate",
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
