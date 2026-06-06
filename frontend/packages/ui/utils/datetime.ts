/** Three-letter month abbreviations, Jan–Dec (index 0 = Jan). */
export const MONTHS_SHORT = [
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

/** Three-letter weekday abbreviations, Sun–Sat (index 0 = Sun, matches Date.getUTCDay()). */
export const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function parseIso(iso: string): {
    year: string;
    month: number;
    day: number;
    hour: number;
    minute: string;
} {
    const stripped = iso.replace("Z", "").replace(/[+-]\d{2}:\d{2}$/, "");
    const [datePart = "", timePart = "00:00"] = stripped.split("T");
    const [year = "1970", month = "1", day = "1"] = datePart.split("-");
    const [hourStr = "0", minute = "00"] = timePart.split(":");
    return {
        year,
        month: parseInt(month, 10),
        day: parseInt(day, 10),
        hour: parseInt(hourStr, 10),
        minute,
    };
}

/** Formats ISO datetime as-is (no timezone conversion): "Apr 17, 2026, 10:00 AM" */
export function formatUTCDateTime(iso: string): string {
    const { year, month, day, hour, minute } = parseIso(iso);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${MONTHS_SHORT[month - 1]} ${day}, ${year}, ${hour12}:${minute} ${ampm}`;
}

/** Formats ISO datetime as date only (no timezone conversion): "Apr 17, 2026" */
export function formatUTCDate(iso: string): string {
    const { year, month, day } = parseIso(iso);
    return `${MONTHS_SHORT[month - 1]} ${day}, ${year}`;
}

/** Formats ISO datetime as time only (no timezone conversion): "10:00 AM" */
export function formatUTCTime(iso: string): string {
    const { hour, minute } = parseIso(iso);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minute} ${ampm}`;
}

/** Formats a plain time string ("HH:MM" or "HH:MM:SS") as "10:00 AM" */
export function formatPlainTime(t: string): string {
    const [hourStr = "0", minute = "00"] = t.split(":");
    const hour = parseInt(hourStr, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minute} ${ampm}`;
}

/**
 * Converts a datetime-local input value ("YYYY-MM-DDTHH:mm") to a UTC ISO string
 * ("YYYY-MM-DDTHH:mm:00Z") without any timezone conversion.
 * Use this instead of `new Date(value).toISOString()` which would shift by local offset.
 */
export function datetimeLocalToUTC(value: string): string {
    const stripped = value.replace("Z", "").replace(/[+-]\d{2}:\d{2}$/, "");
    const base = stripped.length === 16 ? stripped : stripped.slice(0, 16);
    return `${base}:00Z`;
}

/**
 * Extracts { year, month, day } from any ISO date/datetime string without using
 * `new Date()`. Safe to call with "YYYY-MM-DD", "YYYY-MM-DDTHH:mm:ssZ", etc.
 */
export function isoDateParts(iso: string): { year: number; month: number; day: number } {
    const datePart = iso.split("T")[0] ?? iso.slice(0, 10);
    const [y = "1970", m = "1", d = "1"] = datePart.split("-");
    return { year: parseInt(y, 10), month: parseInt(m, 10), day: parseInt(d, 10) };
}

/**
 * Returns a short weekday name ("Sun"–"Sat") for a "YYYY-MM-DD" date string without
 * using `new Date()` (which would apply the browser's local timezone offset).
 * Uses Tomohiko Sakamoto's day-of-week algorithm (no Date constructor).
 */
export function isoDateToWeekdayShort(iso: string): string {
    const { year: y, month: m, day: d } = isoDateParts(iso);
    // Sakamoto: treat Jan/Feb as months 13/14 of the previous year
    const adjY = m < 3 ? y - 1 : y;
    const adjM = m < 3 ? m + 10 : m - 2;
    const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
    const dow =
        (adjY +
            Math.floor(adjY / 4) -
            Math.floor(adjY / 100) +
            Math.floor(adjY / 400) +
            (t[adjM - 1] ?? 0) +
            d) %
        7;
    return WEEKDAYS_SHORT[dow] ?? "Sun";
}
