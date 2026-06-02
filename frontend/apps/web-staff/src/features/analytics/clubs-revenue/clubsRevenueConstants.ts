import { MONTHS_SHORT } from "@repo/ui";

/** "2026-05-25" → "25 May" (no timezone shift — parses the string parts directly). */
export function formatShortDate(snapshotDate: string): string {
    const [, month = "1", day = "1"] = snapshotDate.split("-");
    const monthIdx = parseInt(month, 10) - 1;
    return `${parseInt(day, 10)} ${MONTHS_SHORT[monthIdx] ?? ""}`.trim();
}

/**
 * Ordered colour ramp for clubs in the bar / donut charts. Index-based so a club's
 * colour stays stable for a given rank within the response. hsl(var-free) HSL literals
 * per the analytics charting rule.
 */
export const CLUB_COLORS: string[] = [
    "hsl(221 70% 55%)", // indigo blue
    "hsl(173 58% 45%)", // teal
    "hsl(248 53% 64%)", // soft violet
    "hsl(199 75% 52%)", // sky
    "hsl(38 80% 56%)", // amber
    "hsl(152 47% 47%)", // emerald
    "hsl(330 62% 62%)", // rose
    "hsl(28 75% 58%)", // terracotta
];

/** Muted fallback for clubs beyond the ramp length (and zero-revenue clubs). */
export const CLUB_FALLBACK_COLOR = "hsl(var(--muted-foreground) / 0.55)";

export function clubColor(index: number): string {
    return CLUB_COLORS[index] ?? CLUB_FALLBACK_COLOR;
}

// Shared Tailwind class strings for this sub-feature.
export const panelCls =
    "rounded-2xl border border-border/70 bg-card p-5 shadow-sm ring-1 ring-black/[0.02]";
export const panelTitleCls = "text-base font-semibold tracking-tight text-foreground";
