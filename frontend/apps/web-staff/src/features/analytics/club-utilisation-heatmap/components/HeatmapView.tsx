import { useMemo, useState, type JSX } from "react";
import { CalendarDays, LayoutGrid, RefreshCw } from "lucide-react";
import type { HeatmapCell } from "@repo/staff-domain/models";
import type { DateRange } from "../../types";
import { panelCls, panelTitleCls } from "../../club-utilisation/utilisationConstants";
import {
    computeOverallAvg,
    computePeakDays,
    computePeakHours,
    computeTotals,
    computeTimeBands,
} from "../heatmapUtils";
import { DateRangeControl } from "../../club-utilisation/components/DateRangeControl";
import { HeatmapGrid } from "./HeatmapGrid";
import { HeatmapKpiCards } from "./HeatmapKpiCards";
import { HeatmapLegend } from "./HeatmapLegend";
import { PeakHoursPanel } from "./PeakHoursPanel";
import { DayUtilisationBar } from "./DayUtilisationBar";
import { GaugeCard } from "./GaugeCard";

type Props = {
    range: DateRange;
    rangeLabel: string;
    cells: HeatmapCell[];
    isLoading: boolean;
    error: Error | null;
    onRangeChange: (next: DateRange) => void;
    onCurrentMonth: () => void;
    onRefresh: () => void;
};

export default function HeatmapView({
    range,
    rangeLabel,
    cells,
    isLoading,
    error,
    onRangeChange,
    onCurrentMonth,
    onRefresh,
}: Props): JSX.Element {
    const [showPct, setShowPct] = useState(true);
    const [showSlots, setShowSlots] = useState(false);

    const overallAvgPct = useMemo(() => computeOverallAvg(cells), [cells]);
    const peakHours = useMemo(() => computePeakHours(cells, 3), [cells]);
    const peakDays = useMemo(() => computePeakDays(cells), [cells]);
    const totals = useMemo(() => computeTotals(cells), [cells]);
    const timeBands = useMemo(() => computeTimeBands(cells), [cells]);
    const peakHour = peakHours[0];
    const peakDay = peakDays[0];

    const hasData = cells.length > 0;

    return (
        <div className="w-full space-y-5">
            {/* Header */}
            <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-secondary-foreground shadow-xs">
                            <LayoutGrid size={15} />
                        </div>
                        <h1 className="text-lg font-semibold tracking-tight text-foreground">
                            Club Utilisation Heatmap
                        </h1>
                    </div>
                    <p className="mt-0.5 text-sm leading-5 text-muted-foreground">
                        See when your courts are busiest — by day and hour.
                    </p>
                </div>

                <div className="flex flex-wrap items-end gap-2.5">
                    <DateRangeControl range={range} onChange={onRangeChange} />
                    <button
                        onClick={onCurrentMonth}
                        className="btn-outline min-h-9 px-3.5 text-sm"
                        aria-label="Show current month analytics"
                    >
                        <CalendarDays size={14} /> Current month
                    </button>
                    <button
                        onClick={onRefresh}
                        className="btn-outline min-h-9 px-3.5 text-sm"
                        aria-label="Refresh analytics"
                    >
                        <RefreshCw size={14} /> Refresh
                    </button>
                </div>
            </header>

            {/* Async state branches */}
            {error ? (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive">
                    Failed to load heatmap data. {error.message}
                </div>
            ) : isLoading ? (
                <div className="flex items-center justify-center gap-3 py-32">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-cta" />
                    <span className="text-sm text-muted-foreground">Loading heatmap…</span>
                </div>
            ) : !hasData ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card py-24 text-center">
                    <LayoutGrid size={28} className="text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">No data for this period</p>
                    <p className="text-sm text-muted-foreground">
                        There are no utilisation snapshots between {rangeLabel}.
                    </p>
                </div>
            ) : (
                <>
                    {/* KPI row */}
                    <HeatmapKpiCards
                        overallAvgPct={overallAvgPct}
                        peakHour={peakHour}
                        peakDay={peakDay}
                        rangeLabel={rangeLabel}
                    />

                    {/* Peak hours + day bars side by side */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <PeakHoursPanel peakHours={peakHours} />
                        <DayUtilisationBar days={peakDays} />
                    </div>

                    {/* Main heatmap panel + gauge side by side */}
                    <div className="grid max-w-fit grid-cols-1 gap-4 lg:grid-cols-[minmax(0,58rem)_minmax(16rem,18rem)] lg:items-stretch xl:grid-cols-[minmax(0,58rem)_minmax(20rem,22rem)]">
                        {/* Heatmap */}
                        <section className={`${panelCls} min-w-0 max-w-full`}>
                            <div className="mb-4 flex flex-col gap-3">
                                <div className="min-w-0">
                                    <h2 className={panelTitleCls}>Utilisation Heatmap</h2>
                                </div>
                                <div className="flex w-fit max-w-full flex-wrap items-center gap-3 rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
                                    <HeatmapLegend />
                                    <div className="h-6 w-px bg-border" />
                                    <div className="flex items-center gap-1.5">
                                        <span className="mr-1 whitespace-nowrap text-[11px] font-semibold text-muted-foreground">
                                            Cell labels
                                        </span>
                                        <label
                                            className={`flex h-7 cursor-pointer select-none items-center rounded-md px-2.5 text-xs font-semibold transition ${
                                                showPct
                                                    ? "bg-cta text-white shadow-sm"
                                                    : "bg-background text-muted-foreground hover:text-foreground"
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                className="sr-only"
                                                checked={showPct}
                                                onChange={(e) => {
                                                    setShowPct(e.target.checked);
                                                    if (e.target.checked) setShowSlots(false);
                                                }}
                                                aria-label="Show percentage values in cells"
                                            />
                                            Util %
                                        </label>
                                        <label
                                            className={`flex h-7 cursor-pointer select-none items-center rounded-md px-2.5 text-xs font-semibold transition ${
                                                showSlots
                                                    ? "bg-cta text-white shadow-sm"
                                                    : "bg-background text-muted-foreground hover:text-foreground"
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                className="sr-only"
                                                checked={showSlots}
                                                onChange={(e) => {
                                                    setShowSlots(e.target.checked);
                                                    if (e.target.checked) setShowPct(false);
                                                }}
                                                aria-label="Show booked slots in cells"
                                            />
                                            Slots
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <HeatmapGrid cells={cells} showPct={showPct} showSlots={showSlots} />
                        </section>

                        {/* Gauge card */}
                        <div className="min-w-0">
                            <GaugeCard
                                avgPct={overallAvgPct}
                                bookedSlots={totals.bookedSlots}
                                totalSlots={totals.totalSlots}
                                timeBands={timeBands}
                            />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
