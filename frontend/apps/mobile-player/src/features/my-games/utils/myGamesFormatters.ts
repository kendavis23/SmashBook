import { formatUTCDate, formatUTCTime, formatCurrency } from "../../../lib";

export function formatGameDate(iso: string): string {
    return formatUTCDate(iso);
}

export function formatGameTime(iso: string): string {
    return formatUTCTime(iso);
}

export function formatTimeRange(start: string, end: string): string {
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
