import type { JSX } from "react";
import { GraduationCap, RefreshCw } from "lucide-react";
import { SelectInput } from "@repo/ui";
import type { SelectOption } from "@repo/ui";
import type { CoachPopularityLeaderboard, CoachSort } from "../../types";
import type { CoachPopularitySummary } from "../coachPopularitySummary";
import {
    COACH_SORT_OPTIONS,
    COACH_SORT_TABLE_LABEL,
    TABLE_PAGE_SIZE,
    formatReturnRate,
    panelCls,
    panelTitleCls,
} from "../coachPopularityConstants";
import { CoachPopularityKpiCards } from "./CoachPopularityKpiCards";
import { CoachPopularityTable } from "./CoachPopularityTable";
import { CoachBarChart } from "./CoachBarChart";

type Props = {
    summary: CoachPopularitySummary;
    value: CoachPopularityLeaderboard | undefined;
    topSessions: CoachPopularityLeaderboard | undefined;
    topReturnRate: CoachPopularityLeaderboard | undefined;
    sort: CoachSort;
    page: number;
    totalPages: number;
    totalItems: number;
    isLoading: boolean;
    error: Error | null;
    onSortChange: (sort: CoachSort) => void;
    onPageChange: (page: number) => void;
    onRefresh: () => void;
};

export default function CoachPopularityView({
    summary,
    value,
    topSessions,
    topReturnRate,
    sort,
    page,
    totalPages,
    totalItems,
    isLoading,
    error,
    onSortChange,
    onPageChange,
    onRefresh,
}: Props): JSX.Element {
    const tableRows = value?.rows ?? [];

    return (
        <div className="w-full space-y-4">
            {/* Header */}
            <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-secondary-foreground shadow-xs">
                            <GraduationCap size={15} />
                        </div>
                        <h1 className="text-lg font-semibold tracking-tight text-foreground">
                            Coach Popularity
                        </h1>
                    </div>
                    <p className="mt-0.5 text-sm leading-5 text-muted-foreground">
                        Sessions, player reach and repeat bookings across your coaches.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
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
                    Failed to load coach analytics. {error.message}
                </div>
            ) : isLoading ? (
                <div className="flex items-center justify-center gap-3 py-32">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-cta" />
                    <span className="text-sm text-muted-foreground">Loading coach analytics…</span>
                </div>
            ) : summary.isEmpty ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card py-24 text-center">
                    <GraduationCap size={28} className="text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">No coach data yet</p>
                    <p className="text-sm text-muted-foreground">
                        Once coaches run sessions, their popularity will appear here.
                    </p>
                </div>
            ) : (
                <>
                    <CoachPopularityKpiCards summary={summary} />

                    {/* Bar charts */}
                    <div className="grid grid-cols-1 gap-4 min-[1100px]:grid-cols-2">
                        <CoachBarChart
                            title="Sessions by Coach (Top 5)"
                            hint="Coaches with the most all-time sessions delivered."
                            xAxisLabel="Sessions"
                            rows={topSessions?.rows ?? []}
                            metricOf={(row) => ({
                                value: row.sessions,
                                display: row.sessions.toLocaleString(),
                            })}
                            barClassName="bg-[hsl(213_94%_52%)]"
                        />
                        <CoachBarChart
                            title="Return Rate by Coach (Top 5)"
                            hint="Share of a coach's players who booked them more than once."
                            xAxisLabel="Return Rate (%)"
                            rows={topReturnRate?.rows ?? []}
                            metricOf={(row) => ({
                                value: Number(row.return_rate) || 0,
                                display: formatReturnRate(row.return_rate),
                            })}
                            maxValue={1}
                            tickFormatter={(value) => `${Math.round(value * 100)}%`}
                            barClassName="bg-[hsl(157_69%_42%)]"
                        />
                    </div>

                    {/* Detail table */}
                    <section className={`${panelCls} p-0`}>
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
                            <h2 className={panelTitleCls}>{COACH_SORT_TABLE_LABEL[sort]}</h2>
                            <label className="flex items-center gap-2">
                                <span className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    Sort by
                                </span>
                                <SelectInput
                                    aria-label="Coach leaderboard sort"
                                    className="h-9 w-[11rem] rounded-lg border-border/80 bg-card px-3 py-0 shadow-sm shadow-black/5 hover:border-cta/45 hover:bg-background"
                                    value={sort}
                                    options={COACH_SORT_OPTIONS as SelectOption[]}
                                    onValueChange={(next) => onSortChange(next as CoachSort)}
                                />
                            </label>
                        </div>
                        <div className="p-4">
                            <CoachPopularityTable
                                rows={tableRows}
                                page={page}
                                totalPages={totalPages}
                                totalItems={totalItems}
                                pageSize={TABLE_PAGE_SIZE}
                                onPageChange={onPageChange}
                            />
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}
