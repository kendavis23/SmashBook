const MONTHS = [
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
    return `${MONTHS[month - 1]} ${day}, ${year}, ${hour12}:${minute} ${ampm}`;
}

/** Formats ISO datetime as date only (no timezone conversion): "Apr 17, 2026" */
export function formatUTCDate(iso: string): string {
    const { year, month, day } = parseIso(iso);
    return `${MONTHS[month - 1]} ${day}, ${year}`;
}

/** Formats ISO datetime as time only (no timezone conversion): "10:00 AM" */
export function formatUTCTime(iso: string): string {
    const { hour, minute } = parseIso(iso);
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
