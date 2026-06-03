import type { JSX } from "react";
import { BarChart3, Building2, Info, RefreshCw } from "lucide-react";
import { SelectInput } from "@repo/ui";
import type { SelectOption } from "@repo/ui";
import type { RevenueBasis, TenantRevenueComparison } from "../../types";
import type { DateRange } from "../../types";
import { computeClubsRevenueSummary } from "../clubsRevenueSummary";
import { panelCls, panelTitleCls } from "../clubsRevenueConstants";
import { DateRangeControl } from "../../components/DateRangeControl";
import { ClubsRevenueKpiCards } from "./ClubsRevenueKpiCards";
import { ClubsRevenueHighlights } from "./ClubsRevenueHighlights";
import { NetRevenueBarChart } from "./NetRevenueBarChart";
import { NetRevenueDonutChart } from "./NetRevenueDonutChart";
import { ClubsRevenueTable } from "./ClubsRevenueTable";

const BASIS_OPTIONS = [
    { value: "service", label: "Service" },
    { value: "cash", label: "Cash" },
] satisfies SelectOption[];

type Props = {
    range: DateRange;
    data: TenantRevenueComparison | undefined;
    basis: RevenueBasis;
    isLoading: boolean;
    error: Error | null;
    onRangeChange: (next: DateRange) => void;
    onBasisChange: (next: RevenueBasis) => void;
    onRefresh: () => void;
};

/** Card header with an info tooltip, matching the design. */
function CardHeading({ title, hint }: { title: string; hint: string }): JSX.Element {
    return (
        <div className="mb-4 flex items-center gap-1.5">
            <h3 className={panelTitleCls}>{title}</h3>
            <span title={hint} aria-label={hint} className="inline-flex text-muted-foreground/70">
                <Info size={14} aria-hidden />
            </span>
        </div>
    );
}

export default function ClubsRevenueView({
    range,
    data,
    basis,
    isLoading,
    error,
    onRangeChange,
    onBasisChange,
    onRefresh,
}: Props): JSX.Element {
    const summary = computeClubsRevenueSummary(data);

    return (
        <div className="w-full space-y-5">
            {/* Header */}
            <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-secondary-foreground shadow-xs">
                            <Building2 size={15} />
                        </div>
                        <h1 className="text-lg font-semibold tracking-tight text-foreground">
                            Clubs Revenue Overview
                        </h1>
                    </div>
                    <p className="mt-0.5 text-sm leading-5 text-muted-foreground">
                        Tenant-wide revenue comparison across all clubs.
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

            {/* State branches */}
            {error ? (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive">
                    Failed to load clubs revenue. {error.message}
                </div>
            ) : isLoading ? (
                <div className="flex items-center justify-center gap-3 py-32">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-cta" />
                    <span className="text-sm text-muted-foreground">Loading clubs revenue…</span>
                </div>
            ) : summary.isEmpty ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card py-24 text-center">
                    <BarChart3 size={28} className="text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">No data for this period</p>
                    <p className="text-sm text-muted-foreground">
                        There are no clubs with revenue records for the selected date range.
                    </p>
                </div>
            ) : (
                <>
                    {/* KPIs */}
                    <ClubsRevenueKpiCards summary={summary} />

                    {/* Top performer / needs-attention callout */}
                    <ClubsRevenueHighlights summary={summary} />

                    {/* Zero-revenue banner — clubs exist but no net revenue at all */}
                    {summary.totalNet === 0 ? (
                        <div className="rounded-2xl border border-warning/30 bg-warning/10 px-5 py-3.5 text-sm text-foreground">
                            No net revenue was recorded across any club in this period, so share
                            percentages are not meaningful.
                        </div>
                    ) : null}

                    {/* Charts row — bar + donut */}
                    <div className="grid grid-cols-1 gap-5 min-[1200px]:grid-cols-2">
                        <section className={panelCls}>
                            <CardHeading
                                title="Net Revenue by Club"
                                hint="Net revenue per club, ranked highest to lowest."
                            />
                            <NetRevenueBarChart rows={summary.rows} />
                        </section>
                        <section className={panelCls}>
                            <CardHeading
                                title="Net Revenue Share by Club"
                                hint="Each club's share of total tenant net revenue."
                            />
                            <NetRevenueDonutChart rows={summary.rows} totalNet={summary.totalNet} />
                        </section>
                    </div>

                    {/* Comparison table */}
                    <section className={panelCls}>
                        <ClubsRevenueTable summary={summary} />
                    </section>
                </>
            )}
        </div>
    );
}
