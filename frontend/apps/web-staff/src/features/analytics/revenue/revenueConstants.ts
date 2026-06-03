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

/** Colour tokens for each revenue type — uses hsl() values per spec. */
export const REVENUE_TYPE_COLORS: Record<string, string> = {
    regular: "hsl(213 94% 52%)", // vivid blue
    court_booking: "hsl(213 94% 52%)", // vivid blue (alias)
    lesson_group: "hsl(157 69% 42%)", // teal green
    lesson_individual: "hsl(27 96% 55%)", // warm orange
    coaching: "hsl(199 89% 48%)", // sky blue
    tournament: "hsl(262 52% 56%)", // soft violet
    membership: "hsl(38 92% 50%)", // amber
    private_event: "hsl(338 82% 55%)", // rose pink
    equipment: "hsl(173 60% 40%)", // dark teal
};

/** Palette of professional colors assigned dynamically to unknown types. */
const DYNAMIC_PALETTE = [
    "hsl(213 94% 52%)",
    "hsl(157 69% 42%)",
    "hsl(27 96% 55%)",
    "hsl(262 52% 56%)",
    "hsl(38 92% 50%)",
    "hsl(338 82% 55%)",
    "hsl(199 89% 48%)",
    "hsl(173 60% 40%)",
    "hsl(48 96% 48%)",
    "hsl(4 86% 58%)",
];

const _dynamicColorMap: Record<string, string> = {};
let _dynamicColorIdx = 0;

export const REVENUE_TYPE_LABELS: Record<string, string> = {
    regular: "Regular",
    court_booking: "Court Booking",
    lesson_group: "Lesson Group",
    lesson_individual: "Lesson Individual",
    coaching: "Coaching",
    tournament: "Tournament",
    membership: "Membership",
    private_event: "Private Event",
    equipment: "Equipment",
};

/** Fallback colour for unknown revenue types — assigns from palette so each type gets a unique color. */
export function fallbackColor(type: string): string {
    if (!_dynamicColorMap[type]) {
        _dynamicColorMap[type] =
            DYNAMIC_PALETTE[_dynamicColorIdx % DYNAMIC_PALETTE.length] ?? "hsl(215 14% 55%)";
        _dynamicColorIdx++;
    }
    return _dynamicColorMap[type]!;
}

export function revenueTypeColor(type: string): string {
    return REVENUE_TYPE_COLORS[type] ?? fallbackColor(type);
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
