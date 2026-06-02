import type { JSX } from "react";
import { BarChart3, Info, RefreshCw, TrendingUp } from "lucide-react";
import { SelectInput } from "@repo/ui";
import type { SelectOption } from "@repo/ui";
import type {
    ClubRevenueByType,
    ClubRevenueSummary,
    ClubRevenueTimeseries,
    Granularity,
    RevenueBasis,
} from "@repo/staff-domain/models";
import type { DateRange } from "../../types";
import { computeRevenueSummaryStats, computeRevenueBreakdown } from "../revenueSummary";
import { computeRevenueTrend } from "../revenueTrend";
import { panelCls, panelTitleCls } from "../revenueConstants";
import { DateRangeControl } from "../../club-utilisation/components/DateRangeControl";
import { RevenueKpiCards } from "./RevenueKpiCards";
import { RevenueTimeseriesChart } from "./RevenueTimeseriesChart";
import { RevenueTrendStrip } from "./RevenueTrendStrip";
import { SegmentedControl } from "./SegmentedControl";
import { RevenueDonutChart } from "./RevenueDonutChart";
import { RevenueByTypeTable } from "./RevenueByTypeTable";

const GRANULARITY_OPTIONS = [
    { value: "day" as const, label: "Day" },
    { value: "week" as const, label: "Week" },
    { value: "month" as const, label: "Month" },
];

const BASIS_OPTIONS = [
    { value: "service", label: "Service" },
    { value: "cash", label: "Cash" },
] satisfies SelectOption[];

type Props = {
    range: DateRange;
    summaryData: ClubRevenueSummary | undefined;
    timeseriesData: ClubRevenueTimeseries | undefined;
    byTypeData: ClubRevenueByType | undefined;
    granularity: Granularity;
    disabledGranularities: Granularity[];
    basis: RevenueBasis;
    isSummaryLoading: boolean;
    isTimeseriesLoading: boolean;
    isByTypeLoading: boolean;
    summaryError: Error | null;
    timeseriesError: Error | null;
    byTypeError: Error | null;
    onRangeChange: (next: DateRange) => void;
    onGranularityChange: (next: Granularity) => void;
    onBasisChange: (next: RevenueBasis) => void;
    onRefresh: () => void;
};

/** Small card header with an optional info tooltip, matching the design. */
function CardHeading({ title, hint }: { title: string; hint: string }): JSX.Element {
    return (
        <div className="mb-4 flex items-center gap-1.5">
            <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>
            <span title={hint} aria-label={hint} className="inline-flex text-muted-foreground/70">
                <Info size={14} aria-hidden />
            </span>
        </div>
    );
}

export default function RevenueView({
    range,
    summaryData,
    timeseriesData,
    byTypeData,
    granularity,
    disabledGranularities,
    basis,
    isSummaryLoading,
    isTimeseriesLoading,
    isByTypeLoading,
    summaryError,
    timeseriesError,
    byTypeError,
    onRangeChange,
    onGranularityChange,
    onBasisChange,
    onRefresh,
}: Props): JSX.Element {
    const stats = computeRevenueSummaryStats(summaryData);
    const breakdown = computeRevenueBreakdown(byTypeData?.rows ?? []);
    const points = timeseriesData?.points ?? [];
    const trend = computeRevenueTrend(points);
    const currencyCode = byTypeData?.currency ?? summaryData?.currency ?? null;

    const isLoading = isSummaryLoading || isTimeseriesLoading || isByTypeLoading;
    const error = summaryError ?? timeseriesError ?? byTypeError;
    const hasData = !stats.isEmpty || points.length > 0 || breakdown.rows.length > 0;

    return (
        <div className="w-full space-y-5">
            {/* Header */}
            <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-secondary-foreground shadow-xs">
                            <TrendingUp size={15} />
                        </div>
                        <h1 className="text-lg font-semibold tracking-tight text-foreground">
                            Revenue Performance
                        </h1>
                    </div>
                    <p className="mt-0.5 text-sm leading-5 text-muted-foreground">
                        Gross, net and refund breakdown across all revenue streams.
                    </p>
                </div>

                <div className="flex flex-wrap items-end gap-2.5">
                    <DateRangeControl range={range} onChange={onRangeChange} />
                    <label className="flex flex-col gap-0.5">
                        <span className="text-[11px] font-semibold leading-4 text-muted-foreground">
                            Basis
                        </span>
                        <SelectInput
                            aria-label="Revenue basis"
                            className="h-9 w-[7rem] rounded-lg border-border/80 bg-card px-3 py-0 shadow-sm shadow-black/5 hover:border-cta/45 hover:bg-background"
                            value={basis}
                            options={BASIS_OPTIONS}
                            onValueChange={(next) => onBasisChange(next as RevenueBasis)}
                        />
                    </label>
                    <button
                        onClick={onRefresh}
                        className="btn-outline h-9 px-3.5 text-sm"
                        aria-label="Refresh analytics"
                    >
                        <RefreshCw size={14} /> Refresh
                    </button>
                </div>
            </header>

            {/* Error */}
            {error ? (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive">
                    Failed to load revenue data. {error.message}
                </div>
            ) : isLoading ? (
                <div className="flex items-center justify-center gap-3 py-32">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-cta" />
                    <span className="text-sm text-muted-foreground">Loading revenue data…</span>
                </div>
            ) : !hasData ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card py-24 text-center">
                    <BarChart3 size={28} className="text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">No data for this period</p>
                    <p className="text-sm text-muted-foreground">
                        There are no revenue records for the selected date range.
                    </p>
                </div>
            ) : (
                <>
                    {/* Section 1 — Summary KPIs */}
                    <RevenueKpiCards stats={stats} />

                    {/* Revenue over time */}
                    <section className={panelCls}>
                        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                                <h2 className={panelTitleCls}>Revenue Over Time</h2>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    Net, gross and refund amounts over time.
                                </p>
                            </div>
                            <SegmentedControl
                                ariaLabel="Chart granularity"
                                value={granularity}
                                options={GRANULARITY_OPTIONS}
                                disabled={disabledGranularities}
                                onChange={onGranularityChange}
                            />
                        </div>

                        {points.length === 0 ? (
                            <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
                                No timeseries data available for this period.
                            </div>
                        ) : (
                            <>
                                <RevenueTrendStrip trend={trend} granularity={granularity} />
                                <RevenueTimeseriesChart points={points} />
                            </>
                        )}
                    </section>

                    {/* Revenue by type */}
                    {breakdown.rows.length > 0 ? (
                        <div className="grid grid-cols-1 gap-5 min-[1200px]:grid-cols-[minmax(22rem,35fr)_minmax(42rem,65fr)]">
                            <section className={panelCls}>
                                <CardHeading
                                    title="Net Revenue by Type (Share)"
                                    hint="Each revenue stream's share of total net revenue."
                                />
                                <RevenueDonutChart
                                    rows={breakdown.rows}
                                    totalNet={breakdown.totalNet}
                                />
                            </section>
                            <section className={panelCls}>
                                <CardHeading
                                    title="Revenue by Type Details"
                                    hint="Gross, refund, net and transaction totals by revenue stream."
                                />
                                <RevenueByTypeTable
                                    breakdown={breakdown}
                                    currencyCode={currencyCode}
                                />
                            </section>
                        </div>
                    ) : null}
                </>
            )}
        </div>
    );
}
