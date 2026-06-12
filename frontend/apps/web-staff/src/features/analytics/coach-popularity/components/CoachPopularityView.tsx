import type { JSX } from "react";
import { GraduationCap, RefreshCw } from "lucide-react";
import { formatCurrency, SelectInput } from "@repo/ui";
import type { SelectOption } from "@repo/ui";
import type { CoachPopularityLeaderboard, CoachSort } from "../../types";
import type { CoachPopularitySummary } from "../coachPopularitySummary";
import {
    COACH_SORT_OPTIONS,
    COACH_SORT_TABLE_LABEL,
    TABLE_PAGE_SIZE,
    formatReturnRate,
    formatSessionDate,
    panelCls,
    panelTitleCls,
} from "../coachPopularityConstants";
import { CoachPopularityKpiCards } from "./CoachPopularityKpiCards";
import { CoachLeaderboardPanel } from "./CoachLeaderboardPanel";
import { CoachPopularityTable } from "./CoachPopularityTable";

type Props = {
    summary: CoachPopularitySummary;
    value: CoachPopularityLeaderboard | undefined;
    topSessions: CoachPopularityLeaderboard | undefined;
    topReturnRate: CoachPopularityLeaderboard | undefined;
    topRecentlyActive: CoachPopularityLeaderboard | undefined;
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
    topRecentlyActive,
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

                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                        <CoachLeaderboardPanel
                            title="Top 5 by Sessions"
                            hint="Coaches with the most all-time sessions delivered."
                            metricLabel="Sessions"
                            rows={topSessions?.rows ?? []}
                            metricOf={(row) => ({
                                display: row.sessions.toLocaleString(),
                                value: row.sessions,
                            })}
                            active={sort === "sessions"}
                            onViewAll={() => onSortChange("sessions")}
                        />
                        <CoachLeaderboardPanel
                            title="Top 5 by Return Rate"
                            hint="Share of a coach's players who booked them more than once."
                            metricLabel="Return Rate"
                            rows={topReturnRate?.rows ?? []}
                            metricOf={(row) => ({
                                display: formatReturnRate(row.return_rate),
                                value: Number(row.return_rate) || 0,
                            })}
                            active={sort === "return_rate"}
                            onViewAll={() => onSortChange("return_rate")}
                        />
                        <CoachLeaderboardPanel
                            title="Top 5 Recently Active"
                            hint="Coaches ordered by their latest session."
                            metricLabel="Last Session"
                            rows={topRecentlyActive?.rows ?? []}
                            metricOf={(row) => ({
                                display: formatSessionDate(row.last_session_at),
                                value: row.sessions,
                            })}
                            active={sort === "last_session_at"}
                            onViewAll={() => onSortChange("last_session_at")}
                        />
                    </div>

                    {/* Detail table */}
                    <section className={`${panelCls} p-0`}>
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
                            <h2 className={panelTitleCls}>{COACH_SORT_TABLE_LABEL[sort]}</h2>
                            <label className="flex items-center gap-2">
                                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
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

                    {/* Footnote — surface the only formatter the table doesn't render inline */}
                    <p className="px-1 text-xs text-muted-foreground">
                        Lesson revenue across all coaches:{" "}
                        {formatCurrency(summary.totalLessonRevenue)}.
                    </p>
                </>
            )}
        </div>
    );
}
