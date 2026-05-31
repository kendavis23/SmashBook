export type {
    DailyUtilisationPoint,
    ClubDailyUtilisation,
    UtilisationDateRange,
} from "@repo/staff-domain/models";

// Feature-specific types — not in domain

/** Local date range state for the picker. Both fields are "YYYY-MM-DD". */
export type DateRange = {
    from: string;
    to: string;
};

/** Aggregate figures computed across every day in the selected range. */
export type UtilisationSummary = {
    totalSlots: number;
    bookedSlots: number;
    /** Booked / total, expressed 0–100. Average across days weighted by slots. */
    avgUtilisationPct: number;
    revenueActual: number;
    revenuePotential: number;
    /** revenuePotential - revenueActual, never below 0. */
    revenueOpportunity: number;
    /** Opportunity as a percentage of actual revenue, 0 when actual is 0. */
    revenueOpportunityPct: number;
    /** True when the range resolves to exactly one snapshot day. */
    isSingleDay: boolean;
    /** Number of snapshot days with data. */
    dayCount: number;
};
