import { MONTHS_SHORT, WEEKDAYS_SHORT } from "@repo/ui";

export { MONTHS_SHORT } from "@repo/ui";

/** "2026-05-25" → "25 May" (no timezone shift). */
export function formatShortDate(snapshotDate: string): string {
    const [, month = "1", day = "1"] = snapshotDate.split("-");
    const monthIdx = parseInt(month, 10) - 1;
    return `${parseInt(day, 10)} ${MONTHS_SHORT[monthIdx] ?? ""}`.trim();
}

/** "2026-05-25" → "Sun". Uses a UTC date so the weekday never shifts locally. */
export function formatWeekday(snapshotDate: string): string {
    const [year = "1970", month = "1", day = "1"] = snapshotDate.split("-");
    const d = new Date(Date.UTC(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10)));
    return WEEKDAYS_SHORT[d.getUTCDay()] ?? "";
}

/** Buckets a utilisation percentage for badge colouring. */
export function utilisationTone(pct: number): "success" | "warning" | "muted" {
    if (pct >= 60) return "success";
    if (pct >= 40) return "warning";
    return "muted";
}

// Shared Tailwind class strings for this sub-feature.
export const cardCls = "card-surface overflow-hidden";
export const panelCls = "rounded-2xl border border-border bg-card p-5 sm:p-6";
export const panelTitleCls = "text-base font-semibold tracking-tight text-foreground";
