import type { JSX } from "react";
import { BarChart3, RefreshCw, TrendingUp } from "lucide-react";
import { formatCurrency } from "@repo/ui";
import type { DateRange, DailyUtilisationPoint, UtilisationSummary } from "../../types";
import { panelCls, panelTitleCls } from "../utilisationConstants";
import { DateRangeControl } from "./DateRangeControl";
import { UtilisationKpiCards } from "./UtilisationKpiCards";
import { UtilisationLineChart } from "./UtilisationLineChart";
import { ComparisonBarChart, type ComparisonBar } from "./ComparisonBarChart";
import { UtilisationOverviewBar } from "./UtilisationOverviewBar";
import { DailySummaryTable } from "./DailySummaryTable";

type Props = {
    range: DateRange;
    rangeLabel: string;
    points: DailyUtilisationPoint[];
    summary: UtilisationSummary;
    isLoading: boolean;
    error: Error | null;
    onRangeChange: (next: DateRange) => void;
    onRefresh: () => void;
};

export default function ClubUtilisationView({
    range,
    rangeLabel,
    points,
    summary,
    isLoading,
    error,
    onRangeChange,
    onRefresh,
}: Props): JSX.Element {
    const hasData = points.length > 0;
    const hasSlots = summary.totalSlots > 0;

    const revenueBars: ComparisonBar[] = [
        {
            label: "Actual Revenue",
            value: summary.revenueActual,
            color: "hsl(var(--cta))",
            display: formatCurrency(summary.revenueActual),
        },
        {
            label: "Potential Revenue",
            value: summary.revenuePotential,
            color: "hsl(var(--muted-foreground) / 0.45)",
            display: formatCurrency(summary.revenuePotential),
        },
    ];

    return (
        <div className="w-full space-y-5">
            {/* Header */}
            <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-secondary-foreground shadow-xs">
                            <BarChart3 size={15} />
                        </div>
                        <h1 className="text-lg font-semibold tracking-tight text-foreground">
                            Club Utilisation Analytics
                        </h1>
                    </div>
                    <p className="mt-0.5 text-sm leading-5 text-muted-foreground">
                        Track your club&apos;s court utilisation and revenue performance.
                    </p>
                </div>

                <div className="flex flex-wrap items-end gap-2.5">
                    <DateRangeControl range={range} onChange={onRangeChange} />
                    <button
                        onClick={onRefresh}
                        className="btn-outline min-h-9 px-3.5 text-sm"
                        aria-label="Refresh analytics"
                    >
                        <RefreshCw size={14} /> Refresh
                    </button>
                </div>
            </header>

            {error ? (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive">
                    Failed to load utilisation data. {error.message}
                </div>
            ) : isLoading ? (
                <div className="flex items-center justify-center gap-3 py-32">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-cta" />
                    <span className="text-sm text-muted-foreground">Loading analytics…</span>
                </div>
            ) : !hasData ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card py-24 text-center">
                    <BarChart3 size={28} className="text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">No data for this period</p>
                    <p className="text-sm text-muted-foreground">
                        There are no utilisation snapshots between {rangeLabel}.
                    </p>
                </div>
            ) : (
                <>
                    <UtilisationKpiCards summary={summary} />

                    {!hasSlots ? (
                        <div className="rounded-2xl border border-warning/30 bg-warning/10 px-5 py-4 text-sm text-warning">
                            No bookable slots were available in this period, so utilisation and
                            revenue percentages can&apos;t be calculated. Slot counts below are
                            shown for reference.
                        </div>
                    ) : null}

                    {/* Charts row */}
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                        <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
                            <div className="mb-2 flex items-center justify-between">
                                <h2 className={panelTitleCls}>Daily Utilisation (%)</h2>
                                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <span className="h-2 w-2 rounded-full bg-cta" />
                                    Utilisation
                                </span>
                            </div>
                            <UtilisationLineChart points={points} />
                        </section>

                        <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
                            <div className="mb-2 flex items-center justify-between">
                                <h2 className={panelTitleCls}>Actual vs Potential Revenue</h2>
                                <span className="text-xs text-muted-foreground">
                                    {summary.isSingleDay ? "Selected day" : "Range total"}
                                </span>
                            </div>
                            <ComparisonBarChart
                                bars={revenueBars}
                                formatTick={(v) => formatCurrency(v)}
                                showLegend
                            />
                            {summary.revenueOpportunity > 0 ? (
                                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-warning/10 px-3 py-2">
                                    <div className="flex items-center gap-2">
                                        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-warning/20 text-warning">
                                            <TrendingUp size={14} />
                                        </span>
                                        <div>
                                            <p className="text-xs font-semibold text-foreground">
                                                Revenue Opportunity
                                            </p>
                                            <p className="text-[11px] text-muted-foreground">
                                                You could earn{" "}
                                                {formatCurrency(summary.revenueOpportunity)} more.
                                            </p>
                                        </div>
                                    </div>
                                    <span className="rounded-full bg-warning/20 px-2 py-0.5 text-[11px] font-semibold text-warning">
                                        {summary.revenueOpportunityPct.toFixed(1)}% more
                                    </span>
                                </div>
                            ) : null}
                        </section>
                    </div>

                    {/* Utilisation overview — booked vs available slots */}
                    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className={panelTitleCls}>Utilisation Overview</h2>
                            <span className="text-xs text-muted-foreground">{rangeLabel}</span>
                        </div>
                        <UtilisationOverviewBar summary={summary} />
                    </section>

                    {/* Daily summary */}
                    <section className={panelCls}>
                        <h2 className={`${panelTitleCls} mb-4`}>
                            {summary.isSingleDay ? "Day Summary" : "Daily Summary"}{" "}
                            <span className="text-sm font-normal text-muted-foreground">
                                ({rangeLabel})
                            </span>
                        </h2>
                        <DailySummaryTable points={points} summary={summary} />
                    </section>
                </>
            )}
        </div>
    );
}
