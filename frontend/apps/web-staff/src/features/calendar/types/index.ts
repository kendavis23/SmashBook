export type {
    CalendarView,
    CalendarViewFilters,
    CalendarDay,
    CalendarCourtColumn,
    CalendarBooking,
    BookingType,
    BookingStatus,
    BookingPlayer,
    PlayerRole,
    PaymentStatus,
    InviteStatus,
} from "@repo/staff-domain/models";

// ─── Feature-specific types ────────────────────────────────────────────────

export type CalendarViewMode = "day" | "week";

export const CALENDAR_VIEW_MODES: { id: CalendarViewMode; label: string }[] = [
    { id: "day", label: "Day" },
    { id: "week", label: "Week" },
];

export const BOOKING_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    regular: { bg: "bg-cta/10", text: "text-cta", border: "border-cta/30" },
    lesson_individual: { bg: "bg-success/10", text: "text-success", border: "border-success/30" },
    lesson_group: { bg: "bg-success/10", text: "text-success", border: "border-success/30" },
    corporate_event: { bg: "bg-warning/10", text: "text-warning", border: "border-warning/30" },
    tournament: { bg: "bg-info/10", text: "text-info", border: "border-info/30" },
};

export const BOOKING_TYPE_LABELS: Record<string, string> = {
    regular: "Regular",
    lesson_individual: "Individual Lesson",
    lesson_group: "Group Lesson",
    corporate_event: "Corporate Event",
    tournament: "Tournament",
};

export const BOOKING_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    pending: { bg: "bg-warning/15", text: "text-warning" },
    confirmed: { bg: "bg-success/15", text: "text-success" },
    cancelled: { bg: "bg-destructive/15", text: "text-destructive" },
    completed: { bg: "bg-info/15", text: "text-info" },
};

export const BOOKING_STATUS_LABELS: Record<string, string> = {
    pending: "Pending",
    confirmed: "Confirmed",
    cancelled: "Cancelled",
    completed: "Completed",
};

/** Returns "YYYY-MM-DD" for today */
export function todayIso(): string {
    return new Date().toISOString().slice(0, 10);
}

/** Formats ISO datetime to "HH:MM" */
export function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

/** Formats "YYYY-MM-DD" to a human-readable short date */
export function formatShortDate(dateStr: string): string {
    return new Date(dateStr + "T00:00:00").toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
    });
}

/** Formats currency from a numeric value or null */
export function formatCurrency(amount: number | null | string): string {
    if (amount == null) return "—";
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    if (isNaN(num)) return "—";
    return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 2,
    }).format(num);
}

function toLocalIso(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

/** Returns the Monday of the week containing the given "YYYY-MM-DD" */
export function getWeekStart(dateStr: string): string {
    const d = new Date(dateStr + "T00:00:00");
    const day = d.getDay(); // 0=Sun … 6=Sat
    const diff = day === 0 ? -6 : 1 - day; // shift to Monday
    d.setDate(d.getDate() + diff);
    return toLocalIso(d);
}

/** Returns the Sunday of the week containing the given "YYYY-MM-DD" */
export function getWeekEnd(dateStr: string): string {
    const start = getWeekStart(dateStr);
    const d = new Date(start + "T00:00:00");
    d.setDate(d.getDate() + 6);
    return toLocalIso(d);
}

/** Adds `days` to a "YYYY-MM-DD" string */
export function addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr + "T00:00:00");
    d.setDate(d.getDate() + days);
    return toLocalIso(d);
}

// ─── Calendar layout constants ─────────────────────────────────────────────

export const CALENDAR_TIME_RAIL_WIDTH = 72;
export const CALENDAR_COURT_LANE_MIN_WIDTH = 180;
export const CALENDAR_SLOT_ROW_HEIGHT = 84;

export interface CalendarTimeSlot {
    start_time: string;
    end_time: string;
}

/** 30-minute slots from 08:00 to 22:00 */
export const CALENDAR_TIME_SLOTS: CalendarTimeSlot[] = Array.from({ length: 28 }, (_, i) => {
    const totalMinutes = 8 * 60 + i * 30;
    const startH = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
    const startM = String(totalMinutes % 60).padStart(2, "0");
    const endTotal = totalMinutes + 30;
    const endH = String(Math.floor(endTotal / 60)).padStart(2, "0");
    const endM = String(endTotal % 60).padStart(2, "0");
    return { start_time: `${startH}:${startM}`, end_time: `${endH}:${endM}` };
});

// ─── Calendar utility functions ────────────────────────────────────────────

/** Formats "HH:MM" to a short time label */
export function formatSlotTime(time: string): string {
    const [h, m] = time.split(":").map(Number);
    const date = new Date();
    date.setHours(h ?? 0, m ?? 0, 0, 0);
    return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

/** Formats "YYYY-MM-DD" to a long date like "Monday, 7 April 2026" */
export function formatLongDate(dateStr: string): string {
    return new Date(dateStr + "T00:00:00").toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

/** Formats "YYYY-MM-DD" to a short weekday like "Mon" */
export function formatWeekday(dateStr: string): string {
    return new Date(dateStr + "T00:00:00").toLocaleDateString(undefined, { weekday: "long" });
}

/** Converts "HH:MM" to total minutes since midnight */
export function getMinutesFromTime(time: string): number {
    const [h, m] = time.split(":").map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
}

/** Converts an ISO datetime string to total minutes since midnight (local time) */
export function getMinutesFromIso(iso: string): number {
    const d = new Date(iso);
    return d.getHours() * 60 + d.getMinutes();
}

/** Clamps a number between min and max */
export function clampNumber(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}
