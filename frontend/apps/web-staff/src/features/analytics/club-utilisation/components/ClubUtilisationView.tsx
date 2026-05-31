import { useMemo, useState, type JSX } from "react";
import { BarChart3, RefreshCw, TrendingUp } from "lucide-react";
import { formatCurrency, SelectInput } from "@repo/ui";
import type { DateRange, DailyUtilisationPoint, UtilisationSummary } from "../../types";
import { panelCls, panelTitleCls } from "../utilisationConstants";
import {
    availableGranularities,
    bucketPoints,
    defaultGranularity,
    GRANULARITY_LABELS,
    type Granularity,
} from "../utilisationBuckets";
import { DateRangeControl } from "./DateRangeControl";
import { UtilisationKpiCards } from "./UtilisationKpiCards";
import { UtilisationLineChart } from "./UtilisationLineChart";
import { GroupedBarChart, type GroupedSeries } from "./GroupedBarChart";
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

    // `null` granularity = follow the range-length default; a value = user override.
    const [revenueGranularity, setRevenueGranularity] = useState<Granularity | null>(null);
    const [slotsGranularity, setSlotsGranularity] = useState<Granularity | null>(null);

    const autoGranularity = defaultGranularity(points.length);
    const granularityOptions = useMemo(
        () =>
            availableGranularities(points.length).map((g) => ({
                value: g,
                label: GRANULARITY_LABELS[g],
            })),
        [points.length]
    );

    const revenueG = revenueGranularity ?? autoGranularity;
    const slotsG = slotsGranularity ?? autoGranularity;

    const revenueBuckets = useMemo(() => bucketPoints(points, revenueG), [points, revenueG]);
    const slotBuckets = useMemo(() => bucketPoints(points, slotsG), [points, slotsG]);
    const actualRevenueColor = "hsl(226 70% 55%)";
    const potentialRevenueColor = "hsl(222 84% 86%)";

    const slotUtilisation = useMemo(() => {
        const totalSlots = slotBuckets.reduce((sum, b) => sum + b.totalSlots, 0);
        const bookedSlots = slotBuckets.reduce((sum, b) => sum + b.bookedSlots, 0);
        const availableSlots = Math.max(totalSlots - bookedSlots, 0);
        const pct = totalSlots > 0 ? (bookedSlots / totalSlots) * 100 : 0;
        return { totalSlots, bookedSlots, availableSlots, pct };
    }, [slotBuckets]);

    const revenueGroups = revenueBuckets.map((b) => b.label);
    const revenueSeries: GroupedSeries[] = [
        {
            key: "actual",
            label: "Actual Revenue",
            color: actualRevenueColor,
            values: revenueBuckets.map((b) => b.revenueActual),
            display: revenueBuckets.map((b) => formatCurrency(b.revenueActual)),
        },
        {
            key: "potential",
            label: "Potential Revenue",
            color: potentialRevenueColor,
            values: revenueBuckets.map((b) => b.revenuePotential),
            display: revenueBuckets.map((b) => formatCurrency(b.revenuePotential)),
        },
    ];

    const slotGroups = slotBuckets.map((b) => b.label);
    const slotSeries: GroupedSeries[] = [
        {
            key: "booked",
            label: "Booked Slots",
            color: actualRevenueColor,
            values: slotBuckets.map((b) => b.bookedSlots),
            display: slotBuckets.map((b) => b.bookedSlots.toLocaleString()),
        },
        {
            key: "total",
            label: "Total Slots",
            color: potentialRevenueColor,
            values: slotBuckets.map((b) => b.totalSlots),
            display: slotBuckets.map((b) => b.totalSlots.toLocaleString()),
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

                    {/* Daily utilisation — full width */}
                    <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm ring-1 ring-black/[0.02]">
                        <div className="mb-2 flex items-center justify-between">
                            <h2 className={panelTitleCls}>Daily Utilisation (%)</h2>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-cta/10 px-2.5 py-1 text-[11px] font-semibold text-cta">
                                <span className="h-2 w-2 rounded-full bg-cta" />
                                Utilisation
                            </span>
                        </div>
                        <UtilisationLineChart points={points} />
                    </section>

                    {/* Charts row — Revenue + Slots side by side */}
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                        <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm ring-1 ring-black/[0.02]">
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <h2 className={`${panelTitleCls} whitespace-nowrap`}>
                                    Actual vs Potential Revenue
                                </h2>
                                {granularityOptions.length > 1 ? (
                                    <div className="w-28 flex-shrink-0">
                                        <SelectInput
                                            value={revenueG}
                                            onValueChange={(v) =>
                                                setRevenueGranularity(v as Granularity)
                                            }
                                            options={granularityOptions}
                                            aria-label="Revenue chart granularity"
                                            className="h-8 py-1 text-xs"
                                        />
                                    </div>
                                ) : (
                                    <span className="text-xs text-muted-foreground">
                                        {summary.isSingleDay ? "Selected day" : "Range total"}
                                    </span>
                                )}
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

                        <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm ring-1 ring-black/[0.02]">
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <h2 className={`${panelTitleCls} whitespace-nowrap`}>
                                    Booked vs Total Slots
                                </h2>
                                {granularityOptions.length > 1 ? (
                                    <div className="w-28 flex-shrink-0">
                                        <SelectInput
                                            value={slotsG}
                                            onValueChange={(v) =>
                                                setSlotsGranularity(v as Granularity)
                                            }
                                            options={granularityOptions}
                                            aria-label="Slots chart granularity"
                                            className="h-8 py-1 text-xs"
                                        />
                                    </div>
                                ) : (
                                    <span className="text-xs text-muted-foreground">
                                        {rangeLabel}
                                    </span>
                                )}
                            </div>
                            <GroupedBarChart groups={slotGroups} series={slotSeries} showLegend />
                            <SlotUtilisationBar
                                bookedSlots={slotUtilisation.bookedSlots}
                                availableSlots={slotUtilisation.availableSlots}
                                totalSlots={slotUtilisation.totalSlots}
                                pct={slotUtilisation.pct}
                            />
                        </section>
                    </div>

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

type SlotUtilisationBarProps = {
    bookedSlots: number;
    availableSlots: number;
    totalSlots: number;
    pct: number;
};

/** Booked-vs-available progress strip shown under the Total vs Booked chart. */
function SlotUtilisationBar({
    bookedSlots,
    availableSlots,
    totalSlots,
    pct,
}: SlotUtilisationBarProps): JSX.Element {
    return (
        <div className="mt-2 rounded-xl border border-success/20 bg-success/[0.07] px-3 py-2">
            <div className="flex items-center gap-3">
                <div className="min-w-[4.5rem] text-left">
                    <p className="text-[11px] font-medium text-muted-foreground">Booked Slots</p>
                    <p className="text-xl font-bold leading-tight text-success">
                        {bookedSlots.toLocaleString()}
                    </p>
                </div>
                <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
                        <span className="font-semibold text-success">
                            {pct.toFixed(0)}% Utilised
                        </span>
                        <span className="text-muted-foreground">
                            Total: {totalSlots.toLocaleString()}
                        </span>
                    </div>
                    <div
                        className="h-2.5 overflow-hidden rounded-full bg-success/15"
                        role="meter"
                        aria-label="Slot utilisation"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(Math.min(pct, 100))}
                    >
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-success/80 to-success transition-all"
                            style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                    </div>
                </div>
                <div className="min-w-[4.8rem] text-right">
                    <p className="text-[11px] font-medium text-muted-foreground">Available Slots</p>
                    <p className="text-xl font-bold leading-tight text-foreground">
                        {availableSlots.toLocaleString()}
                    </p>
                </div>
            </div>
        </div>
    );
}
