import type { DailyUtilisationPoint } from "../types";
import { formatShortDate, MONTHS_SHORT } from "./utilisationConstants";

/** Time granularity for the grouped bar charts. */
export type Granularity = "daily" | "weekly" | "monthly";

/** One aggregated bar group (a day, an ISO-ish week, or a calendar month). */
export type UtilisationBucket = {
    /** Stable key for the bucket (e.g. "2026-04-01", "2026-W14", "2026-04"). */
    key: string;
    /** Human axis label (e.g. "1 Apr", "31 Mar – 6 Apr", "Apr"). */
    label: string;
    totalSlots: number;
    bookedSlots: number;
    revenueActual: number;
    revenuePotential: number;
};

export const GRANULARITY_LABELS: Record<Granularity, string> = {
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
};

const DAILY_MAX = 7; // ≤ 7 days reads fine day-by-day
const WEEKLY_MAX = 30; // ≤ 30 days reads fine week-by-week, beyond that go monthly

/** The granularity we default to for a given number of snapshot days. */
export function defaultGranularity(dayCount: number): Granularity {
    if (dayCount <= DAILY_MAX) return "daily";
    if (dayCount <= WEEKLY_MAX) return "weekly";
    return "monthly";
}

/**
 * Granularities worth offering for a given span. A single snapshot day offers
 * nothing to switch (everything renders one bar). Beyond that we offer the full
 * daily → weekly → monthly set so the user can both keep the readable default
 * and coarsen further; the chart still defaults to {@link defaultGranularity}.
 */
export function availableGranularities(dayCount: number): Granularity[] {
    if (dayCount <= 1) return ["daily"];
    return ["daily", "weekly", "monthly"];
}

/** Parses a "YYYY-MM-DD" snapshot date into a UTC Date (no timezone shift). */
function parseUTC(snapshotDate: string): Date {
    const [year = "1970", month = "1", day = "1"] = snapshotDate.split("-");
    return new Date(Date.UTC(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10)));
}

/** Monday-anchored week start for a UTC date. */
function weekStartUTC(date: Date): Date {
    const day = date.getUTCDay(); // 0 = Sunday … 6 = Saturday
    const offsetToMonday = (day + 6) % 7;
    const start = new Date(date);
    start.setUTCDate(date.getUTCDate() - offsetToMonday);
    return start;
}

function isoDate(date: Date): string {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
        date.getUTCDate()
    ).padStart(2, "0")}`;
}

/** Bucket grouping key + label for one snapshot date at a granularity. */
function bucketOf(snapshotDate: string, granularity: Granularity): { key: string; label: string } {
    if (granularity === "daily") {
        return { key: snapshotDate, label: formatShortDate(snapshotDate) };
    }
    const date = parseUTC(snapshotDate);
    if (granularity === "weekly") {
        const start = weekStartUTC(date);
        const end = new Date(start);
        end.setUTCDate(start.getUTCDate() + 6);
        const startIso = isoDate(start);
        return {
            key: `w:${startIso}`,
            label: `${formatShortDate(startIso)} – ${formatShortDate(isoDate(end))}`,
        };
    }
    // monthly
    const year = date.getUTCFullYear();
    const monthIdx = date.getUTCMonth();
    return { key: `m:${year}-${monthIdx}`, label: MONTHS_SHORT[monthIdx] ?? "" };
}

/**
 * Aggregates daily snapshot points into buckets at the requested granularity.
 * Slots and revenue are summed; buckets come back in chronological order.
 * `daily` is a pass-through (one bucket per point) so callers can use one path.
 */
export function bucketPoints(
    points: DailyUtilisationPoint[],
    granularity: Granularity
): UtilisationBucket[] {
    const byKey = new Map<string, UtilisationBucket>();
    const order: string[] = [];

    for (const point of points) {
        const { key, label } = bucketOf(point.snapshot_date, granularity);
        let bucket = byKey.get(key);
        if (bucket === undefined) {
            bucket = {
                key,
                label,
                totalSlots: 0,
                bookedSlots: 0,
                revenueActual: 0,
                revenuePotential: 0,
            };
            byKey.set(key, bucket);
            order.push(key);
        }
        bucket.totalSlots += num(point.total_slots);
        bucket.bookedSlots += num(point.booked_slots);
        bucket.revenueActual += num(point.revenue_actual);
        bucket.revenuePotential += num(point.revenue_potential);
    }

    return order.map((key) => byKey.get(key) as UtilisationBucket);
}

// API returns decimal fields as strings; coerce and drop non-finite values.
function num(value: number | string): number {
    const v = Number(value);
    return Number.isFinite(v) ? v : 0;
}
