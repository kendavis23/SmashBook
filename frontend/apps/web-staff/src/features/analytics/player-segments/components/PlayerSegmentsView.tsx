import type { JSX } from "react";
import { useMemo } from "react";
import { PieChart, RefreshCw } from "lucide-react";
import { formatCurrency, NumberInput, SelectInput } from "@repo/ui";
import type { GroupDimension } from "../../types";
import { GroupedBarChart } from "../../club-utilisation/components/GroupedBarChart";
import type { GroupedSeries } from "../../club-utilisation/components/GroupedBarChart";
import type { SegmentSummary } from "../playerSegmentsSummary";
import {
    DIMENSION_OPTIONS,
    DIMENSION_LABEL,
    MAX_INACTIVE_DAYS,
    MIN_INACTIVE_DAYS,
    segmentColor,
    panelCls,
    panelTitleCls,
} from "../playerSegmentsConstants";
import { SegmentKpiCards } from "./SegmentKpiCards";
import { SegmentDonutChart } from "./SegmentDonutChart";
import { SegmentTable } from "./SegmentTable";

type Props = {
    summary: SegmentSummary;
    dimension: GroupDimension;
    inactiveDays: number;
    isLoading: boolean;
    error: Error | null;
    onDimensionChange: (dimension: GroupDimension) => void;
    onInactiveDaysChange: (days: number) => void;
    onRefresh: () => void;
};

export default function PlayerSegmentsView({
    summary,
    dimension,
    inactiveDays,
    isLoading,
    error,
    onDimensionChange,
    onInactiveDaysChange,
    onRefresh,
}: Props): JSX.Element {
    const dimensionLabel = DIMENSION_LABEL[dimension];

    // One Total-Lifetime-Spend bar per segment, coloured to match the donut.
    const spendSeries = useMemo<GroupedSeries[]>(
        () => [
            {
                key: "spend",
                label: "Total Lifetime Spend",
                color: segmentColor(0),
                colors: summary.rows.map((_, idx) => segmentColor(idx)),
                values: summary.rows.map((r) => r.totalLifetimeSpend),
                display: summary.rows.map((r) => formatCurrency(r.totalLifetimeSpend)),
            },
        ],
        [summary.rows]
    );
    const spendGroups = useMemo(() => summary.rows.map((r) => r.groupLabel), [summary.rows]);

    return (
        <div className="w-full space-y-5">
            {/* Header */}
            <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-secondary-foreground shadow-xs">
                            <PieChart size={15} />
                        </div>
                        <h1 className="text-lg font-semibold tracking-tight text-foreground">
                            Player Segments
                        </h1>
                    </div>
                    <p className="mt-0.5 text-sm leading-5 text-muted-foreground">
                        Players, paid members, lifetime spend and bookings broken down by{" "}
                        {dimensionLabel.toLowerCase()}.
                    </p>
                </div>

                {/* Controls */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="w-44">
                        <SelectInput
                            name="dimension"
                            value={dimension}
                            options={DIMENSION_OPTIONS}
                            onValueChange={(v) => onDimensionChange(v as GroupDimension)}
                            placeholder="Group by"
                            aria-label="Group players by"
                        />
                    </div>
                    {dimension === "activity_status" ? (
                        <div className="w-36">
                            <NumberInput
                                name="inactive_days"
                                value={inactiveDays}
                                min={MIN_INACTIVE_DAYS}
                                max={MAX_INACTIVE_DAYS}
                                step={1}
                                onChange={(e) => onInactiveDaysChange(Number(e.target.value))}
                                className="input-base h-9 w-full"
                                aria-label="Inactivity threshold"
                            />
                        </div>
                    ) : null}
                    <button
                        onClick={onRefresh}
                        className="btn-outline h-9 px-3.5 text-sm"
                        aria-label="Refresh analytics"
                    >
                        <RefreshCw size={14} /> Refresh
                    </button>
                </div>
            </header>

            {/* State branches */}
            {error ? (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive">
                    Failed to load player segments. {error.message}
                </div>
            ) : isLoading ? (
                <div className="flex items-center justify-center gap-3 py-32">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-cta" />
                    <span className="text-sm text-muted-foreground">Loading player segments…</span>
                </div>
            ) : summary.isEmpty ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card py-24 text-center">
                    <PieChart size={28} className="text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">No segment data yet</p>
                    <p className="text-sm text-muted-foreground">
                        Once players start booking, their {dimensionLabel.toLowerCase()} breakdown
                        will appear here.
                    </p>
                </div>
            ) : (
                <>
                    <SegmentKpiCards summary={summary} />

                    {/* Charts row — donut + spend bar chart */}
                    <div className="grid grid-cols-1 gap-5 min-[1100px]:grid-cols-2">
                        <section className={panelCls}>
                            <h2 className={`${panelTitleCls} mb-4`}>Players by {dimensionLabel}</h2>
                            <SegmentDonutChart
                                rows={summary.rows}
                                totalPlayers={summary.totalPlayers}
                            />
                        </section>

                        <section className={panelCls}>
                            <h2 className={`${panelTitleCls} mb-4`}>
                                Total Lifetime Spend by {dimensionLabel}
                            </h2>
                            <GroupedBarChart
                                groups={spendGroups}
                                series={spendSeries}
                                formatTick={(v) => formatCurrency(v)}
                            />
                        </section>
                    </div>

                    {/* Performance table */}
                    <section className={`${panelCls} p-0`}>
                        <div className="border-b border-border px-5 py-4">
                            <h2 className={panelTitleCls}>Performance by {dimensionLabel}</h2>
                            <p className="mt-0.5 text-sm text-muted-foreground">
                                Showing {summary.rows.length}{" "}
                                {summary.rows.length === 1 ? "segment" : "segments"}
                                {summary.currency ? ` · Currency: ${summary.currency}` : ""}
                            </p>
                        </div>
                        <SegmentTable rows={summary.rows} dimensionLabel={dimensionLabel} />
                    </section>
                </>
            )}
        </div>
    );
}
