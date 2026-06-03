import type { JSX } from "react";
import { BarChart3, CalendarDays, LayoutGrid, RefreshCw, TrendingUp } from "lucide-react";
import { formatCurrency } from "@repo/ui";
import type { DateRange } from "../../types";
import { DateRangeControl } from "../../components/DateRangeControl";
import { utilisationTone } from "../../club-utilisation/utilisationConstants";
import {
    GroupedBarChart,
    type GroupedSeries,
} from "../../club-utilisation/components/GroupedBarChart";
import type { CourtComparisonSummary, CourtSortKey } from "../courtComparison";
import { CourtKpiCards } from "./CourtKpiCards";
import { CourtCallouts } from "./CourtCallouts";
import { RankedBarChart, type RankedBar } from "./RankedBarChart";
import { CourtComparisonTable } from "./CourtComparisonTable";

type Props = {
    range: DateRange;
    rangeLabel: string;
    summary: CourtComparisonSummary;
    sortKey: CourtSortKey;
    courtCount: number;
    isLoading: boolean;
    error: Error | null;
    onRangeChange: (next: DateRange) => void;
    onSortChange: (next: CourtSortKey) => void;
    onCurrentMonth: () => void;
    onRefresh: () => void;
};

const panelCls =
    "rounded-2xl border border-border/70 bg-card p-4 shadow-sm ring-1 ring-black/[0.02]";
const panelTitleCls = "text-base font-semibold tracking-tight text-foreground";

// Utilisation badge tones, reused as the ranked-bar fills.
const toneColor: Record<ReturnType<typeof utilisationTone>, string> = {
    success: "hsl(var(--success))",
    warning: "hsl(var(--warning))",
    muted: "hsl(var(--muted-foreground) / 0.55)",
};

const actualRevenueColor = "hsl(226 70% 55%)";
const potentialRevenueColor = "hsl(222 84% 86%)";

export default function CourtUtilisationView({
    range,
    rangeLabel,
    summary,
    sortKey,
    courtCount,
    isLoading,
    error,
    onRangeChange,
    onSortChange,
    onCurrentMonth,
    onRefresh,
}: Props): JSX.Element {
    const hasData = courtCount > 0;
    const hasSlots = summary.totalSlots > 0;

    const rankedBars: RankedBar[] = summary.rows.map((r) => ({
        key: r.courtId,
        label: r.courtName,
        value: r.utilisationPct,
        display: `${r.utilisationPct.toFixed(0)}%`,
        color: toneColor[utilisationTone(r.utilisationPct)],
    }));

    const revenueGroups = summary.rows.map((r) => r.courtName);
    const revenueSeries: GroupedSeries[] = [
        {
            key: "actual",
            label: "Actual",
            color: actualRevenueColor,
            values: summary.rows.map((r) => r.revenueActual),
            display: summary.rows.map((r) => formatCurrency(r.revenueActual)),
        },
        {
            key: "potential",
            label: "Potential",
            color: potentialRevenueColor,
            values: summary.rows.map((r) => r.revenuePotential),
            display: summary.rows.map((r) => formatCurrency(r.revenuePotential)),
        },
    ];

    return (
        <div className="w-full space-y-5">
            <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-secondary-foreground shadow-xs">
                            <LayoutGrid size={15} />
                        </div>
                        <h1 className="text-lg font-semibold tracking-tight text-foreground">
                            Court Utilisation
                        </h1>
                    </div>
                    <p className="mt-0.5 text-sm leading-5 text-muted-foreground">
                        Compare court performance and spot revenue opportunities.
                    </p>
                </div>

                <div className="flex flex-wrap items-end gap-2.5">
                    <DateRangeControl range={range} onChange={onRangeChange} />
                    <button
                        onClick={onCurrentMonth}
                        className="btn-outline h-9 px-3.5 text-sm"
                        aria-label="Show current month analytics"
                    >
                        <CalendarDays size={14} /> Current month
                    </button>
                    <button
                        onClick={onRefresh}
                        className="btn-outline h-9 px-3.5 text-sm"
                        aria-label="Refresh analytics"
                    >
                        <RefreshCw size={14} /> Refresh
                    </button>
                </div>
            </header>

            {error ? (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive">
                    Failed to load court utilisation data. {error.message}
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
                        There are no court utilisation snapshots between {rangeLabel}.
                    </p>
                </div>
            ) : (
                <>
                    <CourtKpiCards summary={summary} />

                    {!hasSlots ? (
                        <div className="rounded-2xl border border-warning/30 bg-warning/10 px-5 py-4 text-sm text-warning">
                            No bookable slots were available for these courts in this period, so
                            utilisation percentages can&apos;t be calculated. Slot counts below are
                            shown for reference.
                        </div>
                    ) : (
                        <CourtCallouts best={summary.best} worst={summary.worst} />
                    )}

                    {/* Row 1 — utilisation + comparison side by side; stacks below 1200px */}
                    <div className="flex flex-col gap-4 [@media(min-width:1200px)]:flex-row">
                        <section className={`${panelCls} [@media(min-width:1200px)]:w-2/5`}>
                            <div className="mb-3">
                                <h2 className={panelTitleCls}>Utilisation by Court</h2>
                                <p className="text-xs text-muted-foreground">
                                    Ranked best to worst · booked ÷ total slots
                                </p>
                            </div>
                            <RankedBarChart bars={rankedBars} />
                        </section>

                        <section className={`${panelCls} [@media(min-width:1200px)]:w-3/5`}>
                            <div className="mb-3 flex items-center justify-between gap-2">
                                <h2 className={panelTitleCls}>
                                    Court Comparison{" "}
                                    <span className="text-sm font-normal text-muted-foreground">
                                        ({rangeLabel})
                                    </span>
                                </h2>
                                <span className="text-xs text-muted-foreground">
                                    Click a header to sort
                                </span>
                            </div>
                            <CourtComparisonTable
                                summary={summary}
                                sortKey={sortKey}
                                onSortChange={onSortChange}
                            />
                        </section>
                    </div>

                    {/* Row 3 — revenue actual vs potential */}
                    <section className={panelCls}>
                        <div className="mb-3">
                            <h2 className={panelTitleCls}>Revenue: Actual vs Potential</h2>
                            <p className="text-xs text-muted-foreground">
                                The gap is recoverable revenue
                            </p>
                        </div>
                        <GroupedBarChart
                            groups={revenueGroups}
                            series={revenueSeries}
                            formatTick={(v) => formatCurrency(v)}
                            showLegend
                        />
                        {summary.revenueOpportunity > 0 ? (
                            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-warning/20 bg-warning/[0.07] px-3 py-2">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-warning/20 text-warning">
                                        <TrendingUp size={14} />
                                    </span>
                                    <div>
                                        <p className="text-xs font-semibold text-foreground">
                                            Revenue Opportunity
                                        </p>
                                        <p className="text-[11px] text-muted-foreground">
                                            {formatCurrency(summary.revenueOpportunity)} recoverable
                                            across all courts.
                                        </p>
                                    </div>
                                </div>
                                <span className="rounded-full bg-warning/20 px-2 py-0.5 text-[11px] font-semibold text-warning">
                                    {summary.revenueOpportunityPct.toFixed(1)}% more
                                </span>
                            </div>
                        ) : null}
                    </section>
                </>
            )}
        </div>
    );
}
