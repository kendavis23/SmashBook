import type { PricingRule } from "../../types";
import type { BookingType } from "../../types";
import type { SelectOption } from "@repo/ui";

export const DAY_NAMES = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
];

export const DAY_NAMES_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const PAGE_SIZE = 10;

// ---------------------------------------------------------------------------
// Session types — pricing is set per session type. "regular" is the default.
// ---------------------------------------------------------------------------

export const SESSION_TYPES: BookingType[] = [
    "regular",
    "lesson_individual",
    "lesson_group",
    "train_and_play",
    "corporate_event",
    "tournament",
];

export const SESSION_TYPE_LABELS: Record<BookingType, string> = {
    regular: "Regular Play",
    lesson_individual: "Individual Lesson",
    lesson_group: "Group Lesson",
    train_and_play: "Train & Play",
    corporate_event: "Corporate Event",
    tournament: "Tournament",
};

export const SESSION_TYPE_OPTIONS: SelectOption[] = SESSION_TYPES.map((value) => ({
    value,
    label: SESSION_TYPE_LABELS[value],
}));

export const DEFAULT_SESSION_TYPE: BookingType = "regular";

export function sessionTypeOf(rule: PricingRule): BookingType {
    return rule.session_type ?? DEFAULT_SESSION_TYPE;
}

// ---------------------------------------------------------------------------
// Pricing label — fixed enum, rendered as a dropdown.
// ---------------------------------------------------------------------------

export const PRICING_LABEL_OPTIONS: SelectOption[] = [
    { value: "off_peak", label: "Off-Peak" },
    { value: "standard", label: "Standard" },
    { value: "peak", label: "Peak" },
];

export const PRICING_LABEL_NAMES: Record<string, string> = {
    off_peak: "Off-Peak",
    standard: "Standard",
    peak: "Peak",
};

// Each label gets a fixed dot colour for the timeline / row marker.
export const PRICING_LABEL_DOT: Record<string, string> = {
    off_peak: "bg-success",
    standard: "bg-info",
    peak: "bg-warning",
};

export const EMPTY_RULE: PricingRule = {
    session_type: DEFAULT_SESSION_TYPE,
    label: "standard",
    day_of_week: 0,
    start_time: "08:00",
    end_time: "22:00",
    valid_from: undefined,
    valid_until: undefined,
    is_active: true,
    price_per_slot: 0,
    surge_trigger_pct: undefined,
    surge_max_pct: undefined,
    low_demand_trigger_pct: undefined,
    low_demand_min_pct: undefined,
    incentive_price: undefined,
    incentive_label: undefined,
    incentive_expires_at: undefined,
};

export type FormState = PricingRule & { _editIndex?: number };

export const fieldCls =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta-ring/30";

export const labelCls = "mb-1 block text-sm font-medium text-foreground";

export const fieldWrapperCls = "flex flex-col gap-1.5";

export function formatPrice(value: string | number | undefined, currency: string): string {
    if (value === undefined || value === "") {
        return "—";
    }
    return `${currency} ${value}`;
}

// ---------------------------------------------------------------------------
// Coverage helpers — compare rule time ranges against operating hours so the
// user can see at a glance whether all open hours are priced.
// ---------------------------------------------------------------------------

/** "HH:MM" → minutes since midnight. Returns 0 on malformed input. */
export function timeToMinutes(time: string): number {
    const [h = "0", m = "0"] = (time ?? "").split(":");
    const hours = Number(h);
    const minutes = Number(m);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0;
    return hours * 60 + minutes;
}

export type Interval = { start: number; end: number };

/** Merge overlapping/adjacent intervals into a sorted, non-overlapping set. */
export function mergeIntervals(intervals: Interval[]): Interval[] {
    const sorted = [...intervals].filter((i) => i.end > i.start).sort((a, b) => a.start - b.start);
    const merged: Interval[] = [];
    for (const cur of sorted) {
        const last = merged[merged.length - 1];
        if (last && cur.start <= last.end) {
            last.end = Math.max(last.end, cur.end);
        } else {
            merged.push({ ...cur });
        }
    }
    return merged;
}

export type Coverage = {
    /** true when there are open hours and every minute of them is covered. */
    fullyCovered: boolean;
    /** Uncovered open-hour gaps (in minutes since midnight). */
    gaps: Interval[];
    /** true when no operating hours are defined for the day. */
    noOpenHours: boolean;
};

/**
 * Given the active rules for a day/session and the day's open window, return
 * which open-hour gaps are not priced.
 */
export function computeCoverage(ruleRanges: Interval[], openWindow: Interval | null): Coverage {
    if (!openWindow || openWindow.end <= openWindow.start) {
        return { fullyCovered: false, gaps: [], noOpenHours: true };
    }
    const covered = mergeIntervals(ruleRanges);
    const gaps: Interval[] = [];
    let cursor = openWindow.start;
    for (const seg of covered) {
        if (seg.end <= openWindow.start || seg.start >= openWindow.end) continue;
        const segStart = Math.max(seg.start, openWindow.start);
        const segEnd = Math.min(seg.end, openWindow.end);
        if (segStart > cursor) gaps.push({ start: cursor, end: segStart });
        cursor = Math.max(cursor, segEnd);
    }
    if (cursor < openWindow.end) gaps.push({ start: cursor, end: openWindow.end });
    return { fullyCovered: gaps.length === 0, gaps, noOpenHours: false };
}
