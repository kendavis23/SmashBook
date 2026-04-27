export type {
    CalendarView,
    CalendarViewFilters,
    CalendarDay,
    CalendarCourtColumn,
    CalendarBookingItem,
    CalendarBlockItem,
    CalendarSlot,
    CalendarTimeSlot,
    CalendarTimeSlotStatus,
    BookingType,
    BookingStatus,
    BookingPlayer,
    PlayerRole,
    PaymentStatus,
    InviteStatus,
} from "@repo/staff-domain/models";

// ─── Calendar block layout constants ──────────────────────────────────────

export const BLOCK_VERTICAL_GAP = 4;
export const MIN_BLOCK_HEIGHT = 36;

// ─── Feature-specific types ────────────────────────────────────────────────

export type CalendarViewMode = "day" | "week";

/** Payload passed when staff clicks an available time slot to open the New Booking/Reservation modal. */
export interface NewSlotContext {
    courtId: string;
    courtName: string;
    date: string;
    startTime: string;
    endTime: string;
}

export type NewCalendarModalTab = "booking" | "reservation";

export const CALENDAR_VIEW_MODES: { id: CalendarViewMode; label: string }[] = [
    { id: "day", label: "Day" },
    { id: "week", label: "Week" },
];

// Color groups: regular=blue, lessons=amber, corporate+tournament=purple
export const BOOKING_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    regular: {
        bg: "bg-[hsl(214,80%,98%)]",
        text: "text-[hsl(214,70%,50%)]",
        border: "border-[hsl(214,70%,80%)]",
    },
    lesson_individual: {
        bg: "bg-[hsl(38,90%,97%)]",
        text: "text-[hsl(38,70%,40%)]",
        border: "border-[hsl(38,70%,75%)]",
    },
    lesson_group: {
        bg: "bg-[hsl(38,90%,97%)]",
        text: "text-[hsl(38,70%,40%)]",
        border: "border-[hsl(38,70%,75%)]",
    },
    corporate_event: {
        bg: "bg-[hsl(270,60%,97%)]",
        text: "text-[hsl(270,50%,45%)]",
        border: "border-[hsl(270,50%,78%)]",
    },
    tournament: {
        bg: "bg-[hsl(270,60%,97%)]",
        text: "text-[hsl(270,50%,45%)]",
        border: "border-[hsl(270,50%,78%)]",
    },
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

export const RESERVATION_TYPE_STYLE: Record<
    string,
    { bg: string; border: string; label: string; text: string; time: string }
> = {
    maintenance: {
        bg: "bg-[hsl(220,20%,96%)]",
        border: "border border-dashed border-[hsl(220,15%,65%)]",
        label: "Maintenance",
        text: "text-[hsl(220,25%,25%)] font-semibold",
        time: "text-[hsl(220,15%,40%)]",
    },
    training_block: {
        bg: "bg-[hsl(220,20%,96%)]",
        border: "border border-[hsl(220,15%,65%)]",
        label: "Training",
        text: "text-[hsl(220,25%,25%)] font-semibold",
        time: "text-[hsl(220,15%,40%)]",
    },
    private_hire: {
        bg: "bg-[hsl(220,20%,96%)]",
        border: "border border-[hsl(220,15%,65%)]",
        label: "Private Hire",
        text: "text-[hsl(220,25%,25%)] font-semibold",
        time: "text-[hsl(220,15%,40%)]",
    },
    tournament_hold: {
        bg: "bg-[hsl(220,20%,96%)]",
        border: "border border-[hsl(220,15%,65%)]",
        label: "Tournament",
        text: "text-[hsl(220,25%,25%)] font-semibold",
        time: "text-[hsl(220,15%,40%)]",
    },
};

export const RESERVATION_TYPE_STYLE_FALLBACK = RESERVATION_TYPE_STYLE[
    "training_block"
] as NonNullable<(typeof RESERVATION_TYPE_STYLE)[string]>;

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

export { formatUTCDateTime, formatUTCDate, formatUTCTime } from "@repo/ui";
export { formatUTCTime as formatTime } from "@repo/ui";

const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS_SHORT = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
] as const;
const WEEKDAYS_LONG = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
] as const;
const MONTHS_LONG = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
] as const;

function parseDateStr(dateStr: string): { y: number; m: number; d: number; dow: number } {
    const [y, m, d] = dateStr.split("-").map(Number);
    // Zeller's formula for day-of-week (0=Sun) — no Date object needed
    const yr = (m ?? 0) <= 2 ? (y ?? 0) - 1 : (y ?? 0);
    const mo = (m ?? 0) <= 2 ? (m ?? 0) + 12 : (m ?? 0);
    const k = yr % 100;
    const j = Math.floor(yr / 100);
    const dow =
        ((d ?? 0) +
            Math.floor((13 * (mo + 1)) / 5) +
            k +
            Math.floor(k / 4) +
            Math.floor(j / 4) -
            2 * j +
            6) %
        7;
    return { y: y ?? 0, m: m ?? 0, d: d ?? 0, dow };
}

/** Formats "YYYY-MM-DD" to a human-readable short date */
export function formatShortDate(dateStr: string): string {
    const { m, d, dow } = parseDateStr(dateStr);
    return `${WEEKDAYS_SHORT[dow]}, ${MONTHS_SHORT[m - 1]} ${d}`;
}

function toDateStr(y: number, m: number, d: number): string {
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function isLeapYear(y: number): boolean {
    return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

function daysInMonth(y: number, m: number): number {
    const days = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return m === 2 && isLeapYear(y) ? 29 : (days[m] ?? 30);
}

/** Adds `n` days to a "YYYY-MM-DD" string without timezone conversion */
export function addDays(dateStr: string, n: number): string {
    let { y, m, d } = parseDateStr(dateStr);
    d += n;
    while (d > daysInMonth(y, m)) {
        d -= daysInMonth(y, m);
        m++;
        if (m > 12) {
            m = 1;
            y++;
        }
    }
    while (d < 1) {
        m--;
        if (m < 1) {
            m = 12;
            y--;
        }
        d += daysInMonth(y, m);
    }
    return toDateStr(y, m, d);
}

/** Returns the Monday of the week containing the given "YYYY-MM-DD" */
export function getWeekStart(dateStr: string): string {
    const { dow } = parseDateStr(dateStr);
    const diff = dow === 0 ? -6 : 1 - dow;
    return addDays(dateStr, diff);
}

/** Returns the Sunday of the week containing the given "YYYY-MM-DD" */
export function getWeekEnd(dateStr: string): string {
    return addDays(getWeekStart(dateStr), 6);
}

// ─── Calendar layout constants ─────────────────────────────────────────────

export const CALENDAR_TIME_RAIL_WIDTH = 88;
export const CALENDAR_COURT_LANE_MIN_WIDTH = 180;
export const CALENDAR_SLOT_ROW_HEIGHT = 56;

export interface CalendarTimeRailSlot {
    start_time: string;
    end_time: string;
}

/** 1-hour slots from 06:00 to 01:00 next day (19 slots). end_time uses 25:00 for post-midnight. */
export const CALENDAR_TIME_SLOTS: CalendarTimeRailSlot[] = Array.from({ length: 19 }, (_, i) => {
    const totalMinutes = 6 * 60 + i * 60;
    const startH = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
    const endTotal = totalMinutes + 60;
    const endH = String(Math.floor(endTotal / 60)).padStart(2, "0");
    return { start_time: `${startH}:00`, end_time: `${endH}:00` };
});

// ─── Calendar utility functions ────────────────────────────────────────────

/** Formats "HH:MM" to a short time label. Supports hours >= 24 (post-midnight). */
export function formatSlotTime(time: string): string {
    const [hRaw] = time.split(":").map(Number);
    const h = (hRaw ?? 0) % 24;
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12} ${ampm}`;
}

/** Formats "YYYY-MM-DD" to a long date like "Monday, 7 April 2026" */
export function formatLongDate(dateStr: string): string {
    const { y, m, d, dow } = parseDateStr(dateStr);
    return `${WEEKDAYS_LONG[dow]}, ${d} ${MONTHS_LONG[m - 1]} ${y}`;
}

/** Formats "YYYY-MM-DD" to a full weekday like "Monday" */
export function formatWeekday(dateStr: string): string {
    const { dow } = parseDateStr(dateStr);
    return WEEKDAYS_LONG[dow] ?? "";
}

/** Converts "HH:MM" to minutes since midnight. Supports hours >= 24 for post-midnight slots. */
export function getMinutesFromTime(time: string): number {
    const [h, m] = time.split(":").map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
}

/** Converts an ISO datetime string to minutes since midnight (UTC, no timezone conversion).
 *  Post-midnight hours (0–5) are treated as 24+h to stay within the 06:00–25:00 board range. */
export function getMinutesFromIso(iso: string): number {
    const timePart = iso.includes("T") ? iso.split("T")[1] : iso;
    const [hStr, mStr] = (timePart ?? "").split(":");
    const h = parseInt(hStr ?? "0", 10);
    const m = parseInt(mStr ?? "0", 10);
    const adjusted = h < 6 ? (h + 24) * 60 + m : h * 60 + m;
    return adjusted;
}

/** Clamps a number between min and max */
export function clampNumber(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}
