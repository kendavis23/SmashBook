import type { JSX } from "react";
import { formatCurrency } from "@repo/ui";
import type { SegmentStats } from "../playerSegmentsSummary";
import { segmentColor, thBase, tdBase } from "../playerSegmentsConstants";

type Props = {
    rows: SegmentStats[];
    dimensionLabel: string;
};

export function SegmentTable({ rows, dimensionLabel }: Props): JSX.Element {
    if (rows.length === 0) {
        return (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                No segments to display.
            </p>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse">
                <thead>
                    <tr className="border-b border-border bg-muted/30">
                        <th className={`${thBase} text-left`}>{dimensionLabel}</th>
                        <th className={`${thBase} text-right`}>Players</th>
                        <th className={`${thBase} text-right`}>Paid Members</th>
                        <th className={`${thBase} text-right`}>Total Lifetime Spend</th>
                        <th className={`${thBase} text-right`}>Avg Lifetime Spend</th>
                        <th className={`${thBase} text-right`}>Total Lifetime Refunds</th>
                        <th className={`${thBase} text-right`}>Total Bookings Played</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r, idx) => (
                        <tr
                            key={r.groupKey}
                            className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/20"
                        >
                            <td className={`${tdBase} text-left`}>
                                <span className="flex items-center gap-2.5">
                                    <span
                                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                                        style={{ backgroundColor: segmentColor(idx) }}
                                    />
                                    <span className="font-medium text-foreground">
                                        {r.groupLabel}
                                    </span>
                                </span>
                            </td>
                            <td className={`${tdBase} text-right`}>{r.players.toLocaleString()}</td>
                            <td className={`${tdBase} text-right`}>
                                {r.paidMembers.toLocaleString()}
                            </td>
                            <td className={`${tdBase} text-right`}>
                                {formatCurrency(r.totalLifetimeSpend)}
                            </td>
                            <td className={`${tdBase} text-right`}>
                                {formatCurrency(r.avgLifetimeSpend)}
                            </td>
                            <td className={`${tdBase} text-right`}>
                                <span
                                    className={
                                        r.totalLifetimeRefunds > 0 ? "text-destructive" : undefined
                                    }
                                >
                                    {formatCurrency(r.totalLifetimeRefunds)}
                                </span>
                            </td>
                            <td className={`${tdBase} text-right`}>
                                {r.totalBookingsPlayed.toLocaleString()}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
