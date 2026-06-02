import type { JSX } from "react";
import { formatCurrency } from "@repo/ui";
import type { ClubsRevenueSummary } from "../clubsRevenueSummary";
import { clubColor } from "../clubsRevenueConstants";

type Props = {
    summary: ClubsRevenueSummary;
};

const thBase = "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground";
const tdBase = "px-4 py-3 text-sm tabular-nums text-foreground";

export function ClubsRevenueTable({ summary }: Props): JSX.Element {
    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] border-collapse">
                <thead>
                    <tr className="border-b border-border/70">
                        <th className={`${thBase} text-left`}>#</th>
                        <th className={`${thBase} text-left`}>Club Name</th>
                        <th className={`${thBase} text-left`}>Currency</th>
                        <th className={`${thBase} text-right`}>Gross Revenue</th>
                        <th className={`${thBase} text-right`}>Refunds</th>
                        <th className={`${thBase} text-right`}>Net Revenue</th>
                        <th className={`${thBase} text-right`}>Transactions</th>
                        <th className={`${thBase} text-right`}>Avg. / Transaction</th>
                    </tr>
                </thead>
                <tbody>
                    {summary.rows.map((row, idx) => (
                        <tr
                            key={row.clubId}
                            className="border-b border-border/40 transition-colors hover:bg-muted/30"
                        >
                            <td className={`${tdBase} text-muted-foreground`}>{row.rank}</td>
                            <td className={`${tdBase} text-left`}>
                                <span className="flex items-center gap-2.5">
                                    <span
                                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                                        style={{ backgroundColor: clubColor(idx) }}
                                    />
                                    <span className="font-medium">{row.clubName}</span>
                                </span>
                            </td>
                            <td className={`${tdBase} text-left text-muted-foreground`}>
                                {row.currency ?? "—"}
                            </td>
                            <td className={`${tdBase} text-right`}>
                                {formatCurrency(row.grossAmount)}
                            </td>
                            <td className={`${tdBase} text-right text-destructive`}>
                                {formatCurrency(row.refundAmount)}
                            </td>
                            <td className={`${tdBase} text-right font-semibold text-success`}>
                                {formatCurrency(row.netAmount)}
                            </td>
                            <td className={`${tdBase} text-right`}>
                                {row.transactionCount.toLocaleString()}
                            </td>
                            <td className={`${tdBase} text-right`}>
                                {formatCurrency(row.avgPerTransaction)}
                            </td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="border-t-2 border-border bg-muted/40 font-semibold">
                        <td className={`${tdBase}`} colSpan={3}>
                            Total
                        </td>
                        <td className={`${tdBase} text-right`}>
                            {formatCurrency(summary.totalGross)}
                        </td>
                        <td className={`${tdBase} text-right text-destructive`}>
                            {formatCurrency(summary.totalRefund)}
                        </td>
                        <td className={`${tdBase} text-right text-success`}>
                            {formatCurrency(summary.totalNet)}
                        </td>
                        <td className={`${tdBase} text-right`}>
                            {summary.totalTransactions.toLocaleString()}
                        </td>
                        <td className={`${tdBase} text-right`}>
                            {formatCurrency(summary.avgPerTransaction)}
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}
