import { useEffect, useMemo, useState, type JSX, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { formatCurrency } from "@repo/ui";
import type { DailyUtilisationPoint, UtilisationSummary } from "../../types";
import { formatShortDate, formatWeekday, utilisationTone } from "../utilisationConstants";

type SortKey = "booked_slots" | "utilisation_pct" | "revenue_actual";
type SortDir = "asc" | "desc";

const SORT_ACCESSORS: Record<SortKey, (p: DailyUtilisationPoint) => number> = {
    booked_slots: (p) => p.booked_slots,
    utilisation_pct: (p) => Number(p.utilisation_pct),
    revenue_actual: (p) => Number(p.revenue_actual),
};

type Props = {
    points: DailyUtilisationPoint[];
    summary: UtilisationSummary;
};

const TONE_BADGE: Record<ReturnType<typeof utilisationTone>, string> = {
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    muted: "bg-muted text-muted-foreground",
};

const PAGE_SIZE = 10;

function UtilisationBadge({ pct, hasSlots }: { pct: number; hasSlots: boolean }): JSX.Element {
    if (!hasSlots) {
        return <span className="text-xs text-muted-foreground">—</span>;
    }
    const tone = utilisationTone(pct);
    return (
        <span
            className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${TONE_BADGE[tone]}`}
        >
            {Math.round(pct)}%
        </span>
    );
}

/** Per-day breakdown table with a compact Total / Avg footer. */
export function DailySummaryTable({ points, summary }: Props): JSX.Element {
    const [page, setPage] = useState(0);
    const [sort, setSort] = useState<{ key: SortKey; dir: SortDir } | null>(null);

    const sortedPoints = useMemo(() => {
        if (!sort) {
            return points;
        }
        const accessor = SORT_ACCESSORS[sort.key];
        const factor = sort.dir === "asc" ? 1 : -1;
        return [...points].sort((a, b) => (accessor(a) - accessor(b)) * factor);
    }, [points, sort]);

    const totalPages = Math.max(1, Math.ceil(sortedPoints.length / PAGE_SIZE));
    const clampedPage = Math.min(page, totalPages - 1);
    const start = clampedPage * PAGE_SIZE;
    const visiblePoints = useMemo(
        () => sortedPoints.slice(start, start + PAGE_SIZE),
        [sortedPoints, start]
    );

    function handleSort(key: SortKey): void {
        setPage(0);
        setSort((current) => {
            if (current?.key !== key) {
                return { key, dir: "desc" };
            }
            return { key, dir: current.dir === "desc" ? "asc" : "desc" };
        });
    }

    useEffect(() => {
        setPage(0);
    }, [points]);

    return (
        <div>
            <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[720px] border-collapse text-sm">
                    <thead>
                        <tr className="border-b border-border bg-muted/30 text-left">
                            <HeaderCell>Date</HeaderCell>
                            <HeaderCell align="right">Total Slots</HeaderCell>
                            <HeaderCell
                                align="right"
                                sortKey="booked_slots"
                                sort={sort}
                                onSort={handleSort}
                            >
                                Booked Slots
                            </HeaderCell>
                            <HeaderCell
                                align="center"
                                sortKey="utilisation_pct"
                                sort={sort}
                                onSort={handleSort}
                            >
                                Utilisation
                            </HeaderCell>
                            <HeaderCell
                                align="right"
                                sortKey="revenue_actual"
                                sort={sort}
                                onSort={handleSort}
                            >
                                Actual Revenue
                            </HeaderCell>
                            <HeaderCell align="right">Potential Revenue</HeaderCell>
                        </tr>
                    </thead>
                    <tbody className="text-foreground">
                        {visiblePoints.map((p) => (
                            <tr
                                key={p.snapshot_date}
                                className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/20"
                            >
                                <td className="px-3 py-1.5 font-medium">
                                    <div className="flex items-center gap-1.5 leading-5">
                                        <span>{formatShortDate(p.snapshot_date)}</span>
                                        <span className="text-[11px] font-normal text-muted-foreground">
                                            {formatWeekday(p.snapshot_date)}
                                        </span>
                                    </div>
                                </td>
                                <Cell align="right">{p.total_slots.toLocaleString()}</Cell>
                                <Cell align="right">{p.booked_slots.toLocaleString()}</Cell>
                                <Cell align="center">
                                    <UtilisationBadge
                                        pct={Number(p.utilisation_pct)}
                                        hasSlots={p.total_slots > 0}
                                    />
                                </Cell>
                                <Cell align="right">{formatCurrency(p.revenue_actual)}</Cell>
                                <Cell align="right">{formatCurrency(p.revenue_potential)}</Cell>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="border-t border-border bg-cta/5">
                            <td className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-cta">
                                Total / Avg
                            </td>
                            <TotalCell>{summary.totalSlots.toLocaleString()}</TotalCell>
                            <TotalCell>{summary.bookedSlots.toLocaleString()}</TotalCell>
                            <td className="px-3 py-2 text-center font-semibold text-cta">
                                {summary.totalSlots > 0
                                    ? `${summary.avgUtilisationPct.toFixed(1)}%`
                                    : "—"}
                            </td>
                            <TotalCell>{formatCurrency(summary.revenueActual)}</TotalCell>
                            <TotalCell>{formatCurrency(summary.revenuePotential)}</TotalCell>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {points.length > PAGE_SIZE ? (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>
                        Showing {start + 1}-{Math.min(start + PAGE_SIZE, points.length)} of{" "}
                        {points.length}
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            className="btn-outline min-h-8 px-2.5 py-1 text-xs disabled:opacity-40"
                            disabled={clampedPage === 0}
                            onClick={() => setPage((current) => Math.max(0, current - 1))}
                        >
                            Previous
                        </button>
                        <span className="font-medium text-foreground">
                            {clampedPage + 1} / {totalPages}
                        </span>
                        <button
                            type="button"
                            className="btn-outline min-h-8 px-2.5 py-1 text-xs disabled:opacity-40"
                            disabled={clampedPage >= totalPages - 1}
                            onClick={() =>
                                setPage((current) => Math.min(totalPages - 1, current + 1))
                            }
                        >
                            Next
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

function HeaderCell({
    children,
    align = "left",
    sortKey,
    sort,
    onSort,
}: {
    children: ReactNode;
    align?: "left" | "center" | "right";
    sortKey?: SortKey;
    sort?: { key: SortKey; dir: SortDir } | null;
    onSort?: (key: SortKey) => void;
}): JSX.Element {
    const alignCls = {
        left: "text-left",
        center: "text-center",
        right: "text-right",
    }[align];

    const baseCls = `px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground ${alignCls}`;

    if (!sortKey || !onSort) {
        return <th className={baseCls}>{children}</th>;
    }

    const isActive = sort?.key === sortKey;
    const justifyCls = {
        left: "justify-start",
        center: "justify-center",
        right: "justify-end",
    }[align];

    return (
        <th className={baseCls}>
            <button
                type="button"
                onClick={() => onSort(sortKey)}
                className={`flex w-full items-center gap-1 uppercase tracking-wide transition-colors hover:text-foreground ${justifyCls} ${
                    isActive ? "text-foreground" : ""
                }`}
            >
                <span>{children}</span>
                {isActive ? (
                    sort?.dir === "asc" ? (
                        <ArrowUp className="h-3 w-3" />
                    ) : (
                        <ArrowDown className="h-3 w-3" />
                    )
                ) : (
                    <ArrowUpDown className="h-3 w-3 opacity-40" />
                )}
            </button>
        </th>
    );
}

function Cell({
    children,
    align = "center",
}: {
    children: ReactNode;
    align?: "center" | "right";
}): JSX.Element {
    const alignCls = align === "right" ? "text-right" : "text-center";
    return <td className={`px-3 py-1.5 ${alignCls}`}>{children}</td>;
}

function TotalCell({ children }: { children: ReactNode }): JSX.Element {
    return <td className="px-3 py-1.5 text-right font-semibold text-cta">{children}</td>;
}
