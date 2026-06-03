import type { JSX } from "react";
import { Activity, RefreshCw } from "lucide-react";
import { SelectInput } from "@repo/ui";
import type { SelectOption } from "@repo/ui";
import type {
    ActivePlayersTimeseries,
    SignupsTimeseries,
    FlowGranularity,
    DateRange,
} from "../../types";
import { DateRangeControl } from "../../components/DateRangeControl";
import type { PlayerActivitySummary } from "../playerActivitySummary";
import {
    GRANULARITY_OPTIONS,
    panelCls,
    panelTitleCls,
    panelHintCls,
    formatPeriodLabel,
    granularityNoun,
} from "../playerActivityConstants";
import { PlayerActivityKpiCards } from "./PlayerActivityKpiCards";
import { ActivePlayersLineChart } from "./ActivePlayersLineChart";
import { GroupedBarChart } from "../../club-utilisation/components/GroupedBarChart";

type Props = {
    range: DateRange;
    granularity: FlowGranularity;
    summary: PlayerActivitySummary;
    activeSeries: ActivePlayersTimeseries | undefined;
    signupsSeries: SignupsTimeseries | undefined;
    isLoading: boolean;
    error: Error | null;
    onRangeChange: (next: DateRange) => void;
    onGranularityChange: (next: FlowGranularity) => void;
    onRefresh: () => void;
};

const GRANULARITY_SELECT_OPTIONS: SelectOption[] = GRANULARITY_OPTIONS.map((o) => ({
    value: o.value,
    label: o.label,
}));

export default function PlayerActivityView({
    range,
    granularity,
    summary,
    activeSeries,
    signupsSeries,
    isLoading,
    error,
    onRangeChange,
    onGranularityChange,
    onRefresh,
}: Props): JSX.Element {
    const activePoints = activeSeries?.points ?? [];
    const signupPoints = signupsSeries?.points ?? [];
    const noun = granularityNoun(granularity);
    const latestActivePlayers = Number(
        activePoints[activePoints.length - 1]?.active_players ?? summary.activePlayers
    );

    return (
        <div className="w-full space-y-5">
            {/* Header */}
            <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-secondary-foreground shadow-xs">
                            <Activity size={15} />
                        </div>
                        <h1 className="text-lg font-semibold tracking-tight text-foreground">
                            Player Activity &amp; Growth
                        </h1>
                    </div>
                    <p className="mt-0.5 text-sm leading-5 text-muted-foreground">
                        Active players and new signups over time, for the selected range.
                    </p>
                </div>

                <div className="flex flex-wrap items-end gap-3">
                    <DateRangeControl range={range} onChange={onRangeChange} />
                    <label className="flex flex-col gap-0.5">
                        <span className="text-[11px] font-semibold leading-4 text-muted-foreground">
                            Granularity
                        </span>
                        <SelectInput
                            name="granularity"
                            value={granularity}
                            options={GRANULARITY_SELECT_OPTIONS}
                            onValueChange={(v) => onGranularityChange(v as FlowGranularity)}
                            aria-label="Timeseries granularity"
                            className="input-base h-9 w-[8rem]"
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
                    Failed to load player activity. {error.message}
                </div>
            ) : isLoading ? (
                <div className="flex items-center justify-center gap-3 py-32">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-cta" />
                    <span className="text-sm text-muted-foreground">Loading player activity…</span>
                </div>
            ) : summary.isEmpty ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card py-24 text-center">
                    <Activity size={28} className="text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">
                        No activity for this period
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Once players start booking and signing up, their activity will appear here.
                    </p>
                </div>
            ) : (
                <>
                    {/* KPI cards */}
                    <PlayerActivityKpiCards summary={summary} />

                    {/* Active players over time */}
                    <section className={panelCls}>
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <h2 className={panelTitleCls}>Active Players Over Time</h2>
                                <p className={panelHintCls}>
                                    Distinct players who played, per {noun}.
                                </p>
                            </div>
                            <div className="flex shrink-0 flex-wrap justify-end gap-2">
                                <span className="rounded-full bg-cta/10 px-2.5 py-1 text-xs font-semibold text-cta">
                                    Peak {summary.peakActivePlayers.toLocaleString()}
                                </span>
                                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                                    Lowest {summary.troughActivePlayers.toLocaleString()}
                                </span>
                                <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
                                    Latest {latestActivePlayers.toLocaleString()}
                                </span>
                            </div>
                        </div>
                        <ActivePlayersLineChart points={activePoints} granularity={granularity} />
                    </section>

                    {/* New signups over time */}
                    <section className={panelCls}>
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <h2 className={panelTitleCls}>New Signups Over Time</h2>
                                <p className={panelHintCls}>
                                    Players who joined the club, per {noun}.
                                </p>
                            </div>
                            <span className="shrink-0 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
                                {summary.totalSignups.toLocaleString()} total
                            </span>
                        </div>
                        {signupPoints.length === 0 ? (
                            <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
                                No signups in this period.
                            </div>
                        ) : (
                            <GroupedBarChart
                                groups={signupPoints.map((p) =>
                                    formatPeriodLabel(p.period_start, granularity)
                                )}
                                series={[
                                    {
                                        key: "signups",
                                        label: "New signups",
                                        color: "hsl(var(--success))",
                                        values: signupPoints.map((p) => Number(p.signups) || 0),
                                        display: signupPoints.map((p) =>
                                            (Number(p.signups) || 0).toLocaleString()
                                        ),
                                    },
                                ]}
                            />
                        )}
                    </section>
                </>
            )}
        </div>
    );
}
