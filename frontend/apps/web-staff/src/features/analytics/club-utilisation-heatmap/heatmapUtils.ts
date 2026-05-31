import type { HeatmapCell } from "@repo/staff-domain/models";

export const HOUR_LABELS = [
    "12am",
    "1am",
    "2am",
    "3am",
    "4am",
    "5am",
    "6am",
    "7am",
    "8am",
    "9am",
    "10am",
    "11am",
    "12pm",
    "1pm",
    "2pm",
    "3pm",
    "4pm",
    "5pm",
    "6pm",
    "7pm",
    "8pm",
    "9pm",
    "10pm",
    "11pm",
] as const;

export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** Looks up a cell for the given day/hour; returns undefined when the API returned no data. */
export function getCell(
    cells: HeatmapCell[],
    dayOfWeek: number,
    hourOfDay: number
): HeatmapCell | undefined {
    return cells.find((c) => c.day_of_week === dayOfWeek && c.hour_of_day === hourOfDay);
}

/**
 * Maps utilisation % to an HSL fill. Uses the design token hue range:
 * low → muted-foreground tint; high → cta blue / success green.
 * Returns an rgba string so it can be used directly in SVG fill.
 */
export function heatTone(pct: number): string {
    if (pct <= 0) return "hsl(var(--muted) / 0.35)";
    if (pct < 25) return "hsl(221 83% 53% / 0.15)";
    if (pct < 50) return "hsl(221 83% 53% / 0.35)";
    if (pct < 70) return "hsl(221 83% 53% / 0.60)";
    if (pct < 85) return "hsl(221 83% 53% / 0.80)";
    return "hsl(221 83% 53% / 1)";
}

/** Text colour on top of a heat cell — white for dark fills, muted for light. */
export function heatTextTone(pct: number): string {
    return pct >= 50 ? "white" : "hsl(var(--muted-foreground))";
}

export type PeakHour = {
    hour: number;
    label: string;
    avgPct: number;
    totalSlots: number;
    bookedSlots: number;
};

/** Top N peak hours by average utilisation across all days. */
export function computePeakHours(cells: HeatmapCell[], topN = 3): PeakHour[] {
    const byHour = new Map<number, { sum: number; count: number; slots: number; booked: number }>();
    for (const c of cells) {
        const entry = byHour.get(c.hour_of_day) ?? { sum: 0, count: 0, slots: 0, booked: 0 };
        entry.sum += Number(c.avg_utilisation_pct);
        entry.count += 1;
        entry.slots += Number(c.total_slots);
        entry.booked += Number(c.booked_slots);
        byHour.set(c.hour_of_day, entry);
    }
    return [...byHour.entries()]
        .map(([hour, { sum, count, slots, booked }]) => ({
            hour,
            label: HOUR_LABELS[hour] ?? `${hour}:00`,
            avgPct: count > 0 ? sum / count : 0,
            totalSlots: slots,
            bookedSlots: booked,
        }))
        .sort((a, b) => b.avgPct - a.avgPct)
        .slice(0, topN);
}

export type PeakDay = {
    dayOfWeek: number;
    label: string;
    avgPct: number;
};

/** Busiest days of the week by average utilisation across all hours. */
export function computePeakDays(cells: HeatmapCell[]): PeakDay[] {
    const byDay = new Map<number, { sum: number; count: number }>();
    for (const c of cells) {
        const entry = byDay.get(c.day_of_week) ?? { sum: 0, count: 0 };
        entry.sum += Number(c.avg_utilisation_pct);
        entry.count += 1;
        byDay.set(c.day_of_week, entry);
    }
    return [...byDay.entries()]
        .map(([dayOfWeek, { sum, count }]) => ({
            dayOfWeek,
            label: DAY_LABELS[dayOfWeek] ?? `Day ${dayOfWeek}`,
            avgPct: count > 0 ? sum / count : 0,
        }))
        .sort((a, b) => b.avgPct - a.avgPct);
}

/** Overall average utilisation across all cells that have data. */
export function computeOverallAvg(cells: HeatmapCell[]): number {
    if (cells.length === 0) return 0;
    const sum = cells.reduce((acc, c) => acc + Number(c.avg_utilisation_pct), 0);
    return sum / cells.length;
}

/** Sum of booked and total slots across all cells. */
export function computeTotals(cells: HeatmapCell[]): { bookedSlots: number; totalSlots: number } {
    let bookedSlots = 0;
    let totalSlots = 0;
    for (const c of cells) {
        bookedSlots += Number(c.booked_slots);
        totalSlots += Number(c.total_slots);
    }
    return { bookedSlots, totalSlots };
}

export type TimeBand = {
    label: string;
    range: string;
    hours: number[];
    avgPct: number;
};

const TIME_BANDS: { label: string; range: string; hours: number[] }[] = [
    { label: "Morning", range: "6 AM – 12 PM", hours: [6, 7, 8, 9, 10, 11] },
    { label: "Afternoon", range: "12 PM – 6 PM", hours: [12, 13, 14, 15, 16, 17] },
    { label: "Evening", range: "6 PM – 12 AM", hours: [18, 19, 20, 21, 22, 23] },
    { label: "Night", range: "12 AM – 6 AM", hours: [0, 1, 2, 3, 4, 5] },
];

export function computeTimeBands(cells: HeatmapCell[]): TimeBand[] {
    return TIME_BANDS.map(({ label, range, hours }) => {
        const matching = cells.filter((c) => hours.includes(c.hour_of_day));
        const avgPct =
            matching.length === 0
                ? 0
                : matching.reduce((sum, c) => sum + Number(c.avg_utilisation_pct), 0) /
                  matching.length;
        return { label, range, hours, avgPct };
    });
}

/** Hours that have any bookable data (total_slots > 0). */
export function activeHours(cells: HeatmapCell[]): number[] {
    const hours = new Set<number>();
    for (const c of cells) {
        if (Number(c.total_slots) > 0) hours.add(c.hour_of_day);
    }
    return [...hours].sort((a, b) => a - b);
}
