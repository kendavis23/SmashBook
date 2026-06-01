import type { JSX } from "react";
import { ChevronDown } from "lucide-react";
import { formatCurrency } from "@repo/ui";
import { utilisationTone } from "../../club-utilisation/utilisationConstants";
import type { CourtComparisonRow, CourtComparisonSummary, CourtSortKey } from "../courtComparison";

type Props = {
    summary: CourtComparisonSummary;
    sortKey: CourtSortKey;
    onSortChange: (next: CourtSortKey) => void;
};

const toneBadgeCls: Record<ReturnType<typeof utilisationTone>, string> = {
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    muted: "bg-muted text-muted-foreground",
};

type SortableHeadProps = {
    label: string;
    sortKey: CourtSortKey;
    active: CourtSortKey;
    onSortChange: (next: CourtSortKey) => void;
};

function SortableHead({ label, sortKey, active, onSortChange }: SortableHeadProps): JSX.Element {
    const isActive = active === sortKey;
    return (
        <button
            type="button"
            onClick={() => onSortChange(sortKey)}
            aria-label={`Sort by ${label}`}
            className={`inline-flex items-center justify-end gap-1 ${
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
        >
            {label}
            <ChevronDown size={13} className={isActive ? "opacity-100" : "opacity-0"} />
        </button>
    );
}

/** Sortable per-court table with a utilisation badge, opportunity, and a totals row. */
export function CourtComparisonTable({ summary, sortKey, onSortChange }: Props): JSX.Element {
    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
                <thead>
                    <tr className="border-b border-border text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <th className="px-2 py-2 text-left">Court</th>
                        <th className="px-2 py-2 text-right">Slots</th>
                        <th className="px-2 py-2 text-right">Booked</th>
                        <th className="px-2 py-2 text-right">
                            <SortableHead
                                label="Util%"
                                sortKey="utilisation"
                                active={sortKey}
                                onSortChange={onSortChange}
                            />
                        </th>
                        <th className="px-2 py-2 text-right">
                            <SortableHead
                                label="Revenue"
                                sortKey="revenue"
                                active={sortKey}
                                onSortChange={onSortChange}
                            />
                        </th>
                        <th className="px-2 py-2 text-right">
                            <SortableHead
                                label="Opportunity"
                                sortKey="opportunity"
                                active={sortKey}
                                onSortChange={onSortChange}
                            />
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {summary.rows.map((row) => (
                        <CourtRow key={row.courtId} row={row} />
                    ))}
                </tbody>
                <tfoot>
                    <tr className="border-t-2 border-border bg-muted/30 font-semibold text-foreground">
                        <td className="px-2 py-2 text-left">All courts</td>
                        <td className="px-2 py-2 text-right">
                            {summary.totalSlots.toLocaleString()}
                        </td>
                        <td className="px-2 py-2 text-right">
                            {summary.bookedSlots.toLocaleString()}
                        </td>
                        <td className="px-2 py-2 text-right text-success">
                            {summary.totalSlots > 0
                                ? `${summary.avgUtilisationPct.toFixed(1)}%`
                                : "—"}
                        </td>
                        <td className="px-2 py-2 text-right">
                            {formatCurrency(summary.revenueActual)}
                        </td>
                        <td className="px-2 py-2 text-right text-warning">
                            {formatCurrency(summary.revenueOpportunity)}
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}

function CourtRow({ row }: { row: CourtComparisonRow }): JSX.Element {
    const tone = utilisationTone(row.utilisationPct);
    const hasSlots = row.totalSlots > 0;
    return (
        <tr className="border-b border-border/60 transition hover:bg-muted/30">
            <td className="px-2 py-2 text-left font-semibold text-foreground">{row.courtName}</td>
            <td className="px-2 py-2 text-right text-muted-foreground">
                {row.totalSlots.toLocaleString()}
            </td>
            <td className="px-2 py-2 text-right text-muted-foreground">
                {row.bookedSlots.toLocaleString()}
            </td>
            <td className="px-2 py-2">
                <div className="flex items-center justify-end">
                    <span
                        className={`inline-flex min-w-[2.5rem] justify-center rounded-full px-2 py-0.5 text-xs font-bold ${toneBadgeCls[tone]}`}
                    >
                        {hasSlots ? `${row.utilisationPct.toFixed(0)}%` : "—"}
                    </span>
                </div>
            </td>
            <td className="px-2 py-2 text-right text-foreground">
                {formatCurrency(row.revenueActual)}
            </td>
            <td
                className={`px-2 py-2 text-right ${
                    row.revenueOpportunity > 0
                        ? "font-semibold text-warning"
                        : "text-muted-foreground"
                }`}
            >
                {formatCurrency(row.revenueOpportunity)}
            </td>
        </tr>
    );
}
