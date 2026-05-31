import type { DailyUtilisationPoint, UtilisationSummary } from "../types";

/**
 * Aggregates daily utilisation points into a single summary.
 *
 * Utilisation is derived from total/booked slots (not by averaging the per-day
 * percentages) so that days with more slots count proportionally. When no slots
 * exist across the range, utilisation is reported as 0 rather than dividing by zero.
 */
export function computeUtilisationSummary(points: DailyUtilisationPoint[]): UtilisationSummary {
    const totalSlots = sumBy(points, (p) => p.total_slots);
    const bookedSlots = sumBy(points, (p) => p.booked_slots);
    const revenueActual = sumBy(points, (p) => p.revenue_actual);
    const revenuePotential = sumBy(points, (p) => p.revenue_potential);

    const avgUtilisationPct = totalSlots > 0 ? (bookedSlots / totalSlots) * 100 : 0;
    const revenueOpportunity = Math.max(revenuePotential - revenueActual, 0);
    const revenueOpportunityPct =
        revenueActual > 0 ? (revenueOpportunity / revenueActual) * 100 : 0;

    return {
        totalSlots,
        bookedSlots,
        avgUtilisationPct,
        revenueActual,
        revenuePotential,
        revenueOpportunity,
        revenueOpportunityPct,
        isSingleDay: points.length === 1,
        dayCount: points.length,
    };
}

function sumBy(
    points: DailyUtilisationPoint[],
    pick: (p: DailyUtilisationPoint) => number | string
): number {
    return points.reduce((acc, p) => {
        const v = Number(pick(p));
        return acc + (Number.isFinite(v) ? v : 0);
    }, 0);
}
