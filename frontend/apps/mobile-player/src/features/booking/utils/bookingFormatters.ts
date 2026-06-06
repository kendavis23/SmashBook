import { formatUTCDate, formatUTCTime, formatCurrency, datetimeLocalToApi } from "../../../lib";

export function formatBookingDate(iso: string): string {
    return formatUTCDate(iso);
}

export function formatBookingTime(iso: string): string {
    return formatUTCTime(iso);
}

export function formatBookingTimeRange(start: string, end: string): string {
    return `${formatUTCTime(start)} – ${formatUTCTime(end)}`;
}

export function formatAmount(amount: number | string | null | undefined): string {
    if (amount == null || amount === "") return "£0.00";
    const n = typeof amount === "string" ? parseFloat(amount) : amount;
    if (!Number.isFinite(n)) return "£0.00";
    return formatCurrency(n) === "—" ? "£0.00" : formatCurrency(n);
}

export function formatBookingType(type: string): string {
    return type
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
}

/** Converts "HH:MM" (24h) to "h:MM AM/PM" (12h clock). */
export function formatSlotTime(time: string): string {
    const [hStr, mStr] = time.split(":");
    const h = parseInt(hStr ?? "0", 10);
    const m = mStr ?? "00";
    const period = h < 12 ? "AM" : "PM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${m} ${period}`;
}

export function getInitials(name: string): string {
    return (
        name
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase() || "P"
    );
}

/**
 * Builds an ISO UTC string from a date string ("YYYY-MM-DD") and a time string ("HH:MM")
 * without shifting by the device's local timezone.
 */
export function buildBookingDatetime(date: string, time: string): string {
    return datetimeLocalToApi(`${date}T${time}`);
}
