import type { GroupDimension } from "../types";
import type { SelectOption } from "@repo/ui";

/** Default grouping dimension for the report. */
export const DEFAULT_DIMENSION: GroupDimension = "membership_tier";

/** Default inactivity threshold (days) used to classify the activity_status dimension. */
export const DEFAULT_INACTIVE_DAYS = 30;

export const MIN_INACTIVE_DAYS = 1;

export const MAX_INACTIVE_DAYS = 365;

/** The dimensions the user can group players by. */
export const DIMENSION_OPTIONS: SelectOption[] = [
    { value: "membership_tier", label: "Membership Tier" },
    { value: "member_status", label: "Member Status" },
    { value: "activity_status", label: "Activity Status" },
];

/** Short human label for a dimension, used in headings and copy. */
export const DIMENSION_LABEL: Record<GroupDimension, string> = {
    membership_tier: "Membership Tier",
    member_status: "Member Status",
    activity_status: "Activity Status",
};

/**
 * Categorical colour ramp for segment slices/bars. HSL tokens only — no hex.
 * Index-keyed so the donut, the bar chart and the table all agree on a colour
 * per segment row.
 */
export const SEGMENT_COLORS: string[] = [
    "hsl(221 70% 55%)", // indigo blue
    "hsl(152 47% 47%)", // emerald
    "hsl(38 80% 56%)", // amber
    "hsl(248 53% 64%)", // soft violet
    "hsl(173 58% 45%)", // teal
    "hsl(330 62% 62%)", // rose
    "hsl(199 75% 52%)", // sky
    "hsl(28 75% 58%)", // terracotta
];

/** Muted fallback for segments beyond the ramp length. */
export const SEGMENT_FALLBACK_COLOR = "hsl(var(--muted-foreground) / 0.55)";

export function segmentColor(index: number): string {
    return SEGMENT_COLORS[index] ?? SEGMENT_FALLBACK_COLOR;
}

/** Shared Tailwind class strings for this sub-feature's panels and table cells. */
export const panelCls =
    "rounded-2xl border border-border/60 bg-card p-5 shadow-sm ring-1 ring-black/[0.02]";

export const panelTitleCls = "text-base font-semibold tracking-tight text-foreground";

export const thBase =
    "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground";

export const tdBase = "px-4 py-3 text-sm tabular-nums text-foreground";

/** Paid-member percentage of a segment, guarded against divide-by-zero. */
export function paidMemberPct(paidMembers: number, players: number): number {
    return players > 0 ? (paidMembers / players) * 100 : 0;
}

/** Formats a percentage as "72.4%", clamped to one decimal. */
export function formatPct(pct: number): string {
    return `${pct.toFixed(1)}%`;
}
