import type { LucideIcon } from "lucide-react";
import {
    CalendarClock,
    GraduationCap,
    Trophy,
    UserRound,
    Users,
    Dumbbell,
    Coins,
} from "lucide-react";
import { MONTHS_SHORT } from "@repo/ui";

export { MONTHS_SHORT } from "@repo/ui";

/** "2026-05-25" → "25 May" (no timezone shift). */
export function formatShortDate(snapshotDate: string): string {
    const [, month = "1", day = "1"] = snapshotDate.split("-");
    const monthIdx = parseInt(month, 10) - 1;
    return `${parseInt(day, 10)} ${MONTHS_SHORT[monthIdx] ?? ""}`.trim();
}

/** "2026-05-25" → "May 2026" for month-level labels. */
export function formatMonthLabel(snapshotDate: string): string {
    const [year = "1970", month = "1"] = snapshotDate.split("-");
    const monthIdx = parseInt(month, 10) - 1;
    return `${MONTHS_SHORT[monthIdx] ?? ""} ${year}`;
}

/** Colour tokens for each revenue type — uses hsl(var(--token)) per spec. */
export const REVENUE_TYPE_COLORS: Record<string, string> = {
    regular: "hsl(210 90% 56%)",
    court_booking: "hsl(210 90% 56%)",
    coaching: "hsl(199 89% 48%)",
    tournament: "hsl(160 84% 39%)",
    membership: "hsl(38 92% 50%)",
    private_event: "hsl(262 83% 58%)",
    equipment: "hsl(346 77% 54%)",
};

export const REVENUE_TYPE_LABELS: Record<string, string> = {
    regular: "regular",
    court_booking: "Court Booking",
    coaching: "Coaching",
    tournament: "Tournament",
    membership: "Membership",
    private_event: "Private Event",
    equipment: "Equipment",
};

/** Fallback colour for unknown revenue types. */
export const FALLBACK_COLOR = "hsl(var(--muted-foreground))";

export function revenueTypeColor(type: string): string {
    return REVENUE_TYPE_COLORS[type] ?? FALLBACK_COLOR;
}

export function revenueTypeLabel(type: string): string {
    return REVENUE_TYPE_LABELS[type] ?? type.replace(/_/g, " ");
}

/** Per-type icon, mirroring the legend/table glyphs in the design. */
export const REVENUE_TYPE_ICONS: Record<string, LucideIcon> = {
    court_booking: CalendarClock,
    coaching: GraduationCap,
    tournament: Trophy,
    membership: UserRound,
    private_event: Users,
    equipment: Dumbbell,
};

export function revenueTypeIcon(type: string): LucideIcon {
    return REVENUE_TYPE_ICONS[type] ?? Coins;
}

// Shared Tailwind class strings for this sub-feature.
export const panelCls =
    "rounded-2xl border border-border/70 bg-card p-5 shadow-sm ring-1 ring-black/[0.02]";
export const panelTitleCls = "text-base font-semibold tracking-tight text-foreground";
export const sectionNumberCls =
    "flex h-6 w-6 items-center justify-center rounded-full bg-cta text-[11px] font-bold text-white";
