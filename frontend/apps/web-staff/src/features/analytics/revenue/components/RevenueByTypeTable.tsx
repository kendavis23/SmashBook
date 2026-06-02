import type { JSX } from "react";
import { formatCurrency } from "@repo/ui";
import type { RevenueBreakdown } from "../revenueSummary";
import { revenueTypeColor, revenueTypeLabel } from "../revenueConstants";

type Props = {
    breakdown: RevenueBreakdown;
    /** Currency code shown in money column headers, e.g. "USD". */
    currencyCode?: string | null;
};

const headCls =
    "px-3 py-2 text-[11px] font-semibold uppercase leading-4 tracking-wide text-muted-foreground";

function MoneyHead({
    label,
    currencyCode,
}: {
    label: string;
    currencyCode?: string | null;
}): JSX.Element {
    return (
        <span className="inline-flex flex-col items-end">
            <span>{label}</span>
            {currencyCode ? <span>({currencyCode})</span> : null}
        </span>
    );
}

export function RevenueByTypeTable({ breakdown, currencyCode }: Props): JSX.Element {
    const { rows, totalGross, totalRefund, totalNet, totalTransactions } = breakdown;
    return (
        <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[680px] border-collapse text-sm">
                <thead>
                    <tr className="border-b border-border bg-muted/30">
                        <th className={`${headCls} text-left`}>Revenue Type</th>
                        <th className={`${headCls} text-right`}>
                            <MoneyHead label="Gross Amount" currencyCode={currencyCode} />
                        </th>
                        <th className={`${headCls} text-right`}>
                            <MoneyHead label="Refund Amount" currencyCode={currencyCode} />
                        </th>
                        <th className={`${headCls} text-right`}>
                            <MoneyHead label="Net Amount" currencyCode={currencyCode} />
                        </th>
                        <th className={`${headCls} text-right`}>Transactions</th>
                        <th className={`${headCls} text-right`}>Share</th>
                    </tr>
                </thead>
                <tbody className="text-foreground">
                    {rows.map((r) => {
                        const color = revenueTypeColor(r.revenueType);
                        return (
                            <tr
                                key={r.revenueType}
                                className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/20"
                            >
                                <td className="px-3 py-1.5">
                                    <span className="flex items-center gap-2.5">
                                        <span
                                            className="h-2 w-2 shrink-0 rounded-full"
                                            style={{ backgroundColor: color }}
                                        />
                                        <span className="font-medium text-foreground">
                                            {revenueTypeLabel(r.revenueType)}
                                        </span>
                                    </span>
                                </td>
                                <td className="px-3 py-1.5 text-right tabular-nums">
                                    {formatCurrency(r.grossAmount)}
                                </td>
                                <td className="px-3 py-1.5 text-right tabular-nums">
                                    {formatCurrency(r.refundAmount)}
                                </td>
                                <td className="px-3 py-1.5 text-right tabular-nums font-semibold">
                                    {formatCurrency(r.netAmount)}
                                </td>
                                <td className="px-3 py-1.5 text-right tabular-nums">
                                    {r.transactionCount.toLocaleString()}
                                </td>
                                <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">
                                    {r.sharePct.toFixed(1)}%
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
                <tfoot>
                    <tr className="border-t border-border bg-cta/5 text-cta">
                        <td className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide">
                            Total
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold">
                            {formatCurrency(totalGross)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold">
                            {formatCurrency(totalRefund)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold">
                            {formatCurrency(totalNet)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold">
                            {totalTransactions.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold">100%</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}
