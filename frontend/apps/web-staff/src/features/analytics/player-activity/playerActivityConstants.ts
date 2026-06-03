import { MONTHS_SHORT } from "@repo/ui";
import type { FlowGranularity } from "../types";

/** Default lookback for the report: the last 30 calendar days ending yesterday. */
export const DEFAULT_RANGE_DAYS = 30 as const;

/** Granularity options offered to the user. Sent to the API as `granularity`. */
export const GRANULARITY_OPTIONS: { value: FlowGranularity; label: string }[] = [
    { value: "day", label: "Daily" },
    { value: "week", label: "Weekly" },
    { value: "month", label: "Monthly" },
];

/** Shared Tailwind class strings for the report's chart panels. */
export const panelCls =
    "rounded-2xl border border-border/60 bg-card p-5 shadow-sm ring-1 ring-black/[0.02]";

export const panelTitleCls = "text-sm font-semibold tracking-tight text-foreground";

export const panelHintCls = "mt-0.5 text-xs text-muted-foreground";

/**
 * Formats a `period_start` value (a bare `YYYY-MM-DD` calendar date, or an ISO
 * timestamp whose date part we use) for a chart axis tick, keyed by granularity:
 *   - day   → "2 Jun"
 *   - week  → "2 Jun" (week-commencing)
 *   - month → "Jun 2026"
 *
 * Parses the date parts directly so the displayed day never shifts by the
 * browser's timezone offset (see the analytics guide on snapshot dates).
 * Returns "—" for null / empty / unparseable input.
 */
export function formatPeriodLabel(value: string, granularity: FlowGranularity): string {
    const datePart = value.slice(0, 10);
    const [y, m, d] = datePart.split("-").map(Number);
    if (!y || !m || !d || m < 1 || m > 12) return "—";
    const month = MONTHS_SHORT[m - 1];
    if (granularity === "month") return `${month} ${y}`;
    return `${d} ${month}`;
}

/** A short human label for the active granularity, used in chart subtitles. */
export function granularityNoun(granularity: FlowGranularity): string {
    if (granularity === "month") return "month";
    if (granularity === "week") return "week";
    return "day";
}
