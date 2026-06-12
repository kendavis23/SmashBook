export type RfvSegment =
    | "Champions"
    | "Loyal Customers"
    | "Potential Loyalists"
    | "At Risk / Lost"
    | "Needs Attention"
    | "Unscored";

interface RfvScores {
    recency_score: number | null;
    frequency_score: number | null;
    value_score: number | null;
    rfv_total: number | null;
}

export function rfvSegment(row: RfvScores): RfvSegment {
    const { recency_score: r, frequency_score: f, value_score: v } = row;
    if (r === null || f === null || v === null) return "Unscored";
    if (r >= 4 && f >= 4 && v >= 4) return "Champions";
    if (r >= 3 && f >= 3 && v >= 3) return "Loyal Customers";
    if (r >= 3 && f >= 2) return "Potential Loyalists";
    if (r <= 2) return "At Risk / Lost";
    return "Needs Attention";
}

/** Semantic token classes for a given segment — background + text only. */
export const SEGMENT_STYLE: Record<RfvSegment, string> = {
    Champions: "bg-success/15 text-success",
    "Loyal Customers": "bg-info/15 text-info",
    "Potential Loyalists": "bg-warning/15 text-warning",
    "At Risk / Lost": "bg-destructive/10 text-destructive",
    "Needs Attention": "bg-muted text-muted-foreground",
    Unscored: "bg-muted text-muted-foreground",
};

/** Score colour: high ≥4 green, mid 3 neutral, low ≤2 red. */
export function scoreColour(score: number | null): string {
    if (score === null) return "text-muted-foreground";
    if (score >= 4) return "text-success";
    if (score <= 2) return "text-destructive";
    return "text-foreground";
}
