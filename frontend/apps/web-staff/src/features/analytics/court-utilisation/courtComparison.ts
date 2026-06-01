import type { CourtUtilisationSummary } from "@repo/staff-domain/models";

/** How the comparison table / chart is ordered. */
export type CourtSortKey = "utilisation" | "revenue" | "opportunity";

/** A court row enriched with the derived figures the View renders. */
export type CourtComparisonRow = {
    courtId: string;
    courtName: string;
    totalSlots: number;
    bookedSlots: number;
    /** Booked / total × 100, slot-derived (never NaN). */
    utilisationPct: number;
    revenueActual: number;
    revenuePotential: number;
    /** potential − actual, clamped ≥ 0 — recoverable revenue for this court. */
    revenueOpportunity: number;
};

/** Aggregate figures across every court plus the ranked rows. */
export type CourtComparisonSummary = {
    courtCount: number;
    totalSlots: number;
    bookedSlots: number;
    /** Slot-weighted across all courts, 0 when no slots exist. */
    avgUtilisationPct: number;
    revenueActual: number;
    revenuePotential: number;
    revenueOpportunity: number;
    /** Opportunity as a percentage of actual revenue, 0 when actual is 0. */
    revenueOpportunityPct: number;
    /** Rows sorted by the requested key, best first. Empty when no courts. */
    rows: CourtComparisonRow[];
    /** Highest / lowest utilisation court — the decision callouts. Null when empty. */
    best: CourtComparisonRow | null;
    worst: CourtComparisonRow | null;
};

/**
 * Builds the court-comparison summary from the raw per-court figures.
 *
 * Utilisation is derived per court from booked/total slots and, for the
 * all-courts headline, from the summed slots (not by averaging the per-court
 * percentages) so larger courts count proportionally. Every divisor is guarded:
 * a court with no slots reports 0% rather than NaN.
 */
export function computeCourtComparison(
    courts: CourtUtilisationSummary[],
    sortKey: CourtSortKey = "utilisation"
): CourtComparisonSummary {
    const rows: CourtComparisonRow[] = courts.map((c) => {
        const totalSlots = num(c.total_slots);
        const bookedSlots = num(c.booked_slots);
        const revenueActual = num(c.revenue_actual);
        const revenuePotential = num(c.revenue_potential);
        return {
            courtId: c.court_id,
            courtName: c.court_name,
            totalSlots,
            bookedSlots,
            utilisationPct: totalSlots > 0 ? (bookedSlots / totalSlots) * 100 : 0,
            revenueActual,
            revenuePotential,
            revenueOpportunity: Math.max(revenuePotential - revenueActual, 0),
        };
    });

    const totalSlots = sumBy(rows, (r) => r.totalSlots);
    const bookedSlots = sumBy(rows, (r) => r.bookedSlots);
    const revenueActual = sumBy(rows, (r) => r.revenueActual);
    const revenuePotential = sumBy(rows, (r) => r.revenuePotential);
    const revenueOpportunity = Math.max(revenuePotential - revenueActual, 0);

    // Best/worst are always ranked by utilisation, independent of the table sort,
    // because the callouts answer "which court performs best", not "current sort".
    const byUtilisation = [...rows].sort((a, b) => b.utilisationPct - a.utilisationPct);

    return {
        courtCount: rows.length,
        totalSlots,
        bookedSlots,
        avgUtilisationPct: totalSlots > 0 ? (bookedSlots / totalSlots) * 100 : 0,
        revenueActual,
        revenuePotential,
        revenueOpportunity,
        revenueOpportunityPct: revenueActual > 0 ? (revenueOpportunity / revenueActual) * 100 : 0,
        rows: sortRows(rows, sortKey),
        best: byUtilisation[0] ?? null,
        worst: byUtilisation.length > 1 ? (byUtilisation.at(-1) ?? null) : null,
    };
}

/** Returns a new array sorted best-first by the given key. */
function sortRows(rows: CourtComparisonRow[], sortKey: CourtSortKey): CourtComparisonRow[] {
    const pick: Record<CourtSortKey, (r: CourtComparisonRow) => number> = {
        utilisation: (r) => r.utilisationPct,
        revenue: (r) => r.revenueActual,
        opportunity: (r) => r.revenueOpportunity,
    };
    return [...rows].sort((a, b) => pick[sortKey](b) - pick[sortKey](a));
}

function sumBy(rows: CourtComparisonRow[], pick: (r: CourtComparisonRow) => number): number {
    return rows.reduce((acc, r) => acc + pick(r), 0);
}

/** Coerces the API's string-decimal fields to a finite number, defaulting to 0. */
function num(value: number | string): number {
    const v = Number(value);
    return Number.isFinite(v) ? v : 0;
}
