import type { JSX } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { formatCurrency } from "@repo/ui";
import type { CourtComparisonRow } from "../courtComparison";

type Props = {
    best: CourtComparisonRow | null;
    worst: CourtComparisonRow | null;
};

/**
 * Two decision-shortcut cards: the top performer and the court needing attention.
 * Renders nothing when there is only one court (best === worst is uninformative).
 */
export function CourtCallouts({ best, worst }: Props): JSX.Element | null {
    if (!best || !worst) return null;

    return (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="flex items-center gap-3 rounded-2xl border border-success/30 bg-success/[0.08] px-4 py-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success text-success-foreground">
                    <ArrowUpRight size={20} />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-success">
                        Top performer
                    </p>
                    <p className="truncate text-base font-semibold text-foreground">
                        {best.courtName} — {best.utilisationPct.toFixed(0)}% utilised
                    </p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-success">
                    {formatCurrency(best.revenueActual)} earned
                </span>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/[0.07] px-4 py-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
                    <ArrowDownRight size={20} />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-destructive">
                        Needs attention
                    </p>
                    <p className="truncate text-base font-semibold text-foreground">
                        {worst.courtName} — {worst.utilisationPct.toFixed(0)}% utilised
                    </p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-destructive">
                    {formatCurrency(worst.revenueOpportunity)} on the table
                </span>
            </div>
        </div>
    );
}
