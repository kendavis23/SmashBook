import type { JSX } from "react";
import { useEffect, useMemo, useState } from "react";
import { Activity, RefreshCw } from "lucide-react";
import type { PlayerActivityLeaderboard, InactiveMembersReport } from "../../types";
import type { PlayerEngagementSummary } from "../playerEngagementSummary";
import type { EngagementTab, EngagementWindowDays } from "../playerEngagementConstants";
import { ENGAGEMENT_TABS, panelCls, daysSince } from "../playerEngagementConstants";
import { PlayerAnalyticsDetailTable } from "../../components/PlayerAnalyticsDetailTable";
import { EngagementKpiCards } from "./EngagementKpiCards";
import { EngagementLeaderboardPanel } from "./EngagementLeaderboardPanel";

type Props = {
    summary: PlayerEngagementSummary;
    mostActive: PlayerActivityLeaderboard | undefined;
    inactive: InactiveMembersReport | undefined;
    tab: EngagementTab;
    windowDays: EngagementWindowDays;
    isLoading: boolean;
    error: Error | null;
    onTabChange: (tab: EngagementTab) => void;
    onWindowDaysChange: (windowDays: EngagementWindowDays) => void;
    onRefresh: () => void;
};

const TABLE_PAGE_SIZE = 10;

export default function PlayerEngagementView({
    summary,
    mostActive,
    inactive,
    tab,
    windowDays,
    isLoading,
    error,
    onTabChange,
    onWindowDaysChange,
    onRefresh,
}: Props): JSX.Element {
    const [page, setPage] = useState(0);
    const tabRows = tab === "most-active" ? (mostActive?.rows ?? []) : (inactive?.rows ?? []);
    const totalItems = tabRows.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / TABLE_PAGE_SIZE));
    const tabLabels = useMemo(
        () =>
            ENGAGEMENT_TABS.map((t) => ({
                ...t,
                label:
                    t.id === "most-active"
                        ? `Most Active (Last ${windowDays} Days)`
                        : `Inactive Members (${windowDays}+ Days)`,
            })),
        [windowDays]
    );

    useEffect(() => {
        setPage(0);
    }, [tab, windowDays]);

    return (
        <div className="w-full space-y-5">
            {/* Header */}
            <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-secondary-foreground shadow-xs">
                            <Activity size={15} />
                        </div>
                        <h1 className="text-lg font-semibold tracking-tight text-foreground">
                            Player Engagement
                        </h1>
                    </div>
                    <p className="mt-0.5 text-sm leading-5 text-muted-foreground">
                        Recent activity and at-risk members across your club.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex h-9 items-center gap-1 rounded-lg border border-border bg-background p-1 text-sm text-foreground">
                        <span className="px-2 text-muted-foreground">Window</span>
                        {([30, 90] as const).map((days) => {
                            const active = days === windowDays;
                            return (
                                <button
                                    key={days}
                                    type="button"
                                    onClick={() => onWindowDaysChange(days)}
                                    className={
                                        "h-7 rounded-md px-2.5 text-sm font-medium transition-colors " +
                                        (active
                                            ? "bg-muted text-foreground shadow-xs"
                                            : "text-muted-foreground hover:text-foreground")
                                    }
                                >
                                    {days}d
                                </button>
                            );
                        })}
                    </div>
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
                    Failed to load engagement analytics. {error.message}
                </div>
            ) : isLoading ? (
                <div className="flex items-center justify-center gap-3 py-32">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-cta" />
                    <span className="text-sm text-muted-foreground">
                        Loading engagement analytics…
                    </span>
                </div>
            ) : summary.isEmpty ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card py-24 text-center">
                    <Activity size={28} className="text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">No engagement data yet</p>
                    <p className="text-sm text-muted-foreground">
                        Once players start booking, their activity will appear here.
                    </p>
                </div>
            ) : (
                <>
                    {/* KPI cards */}
                    <EngagementKpiCards summary={summary} windowDays={windowDays} />

                    {/* Two leaderboard mini-panels */}
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <EngagementLeaderboardPanel
                            title={`Top 5 Active Players (Last ${windowDays} Days)`}
                            hint={`Bookings played in the last ${windowDays} days.`}
                            metricLabel="Bookings"
                            rows={(mostActive?.rows ?? []).slice(0, 5)}
                            metricOf={(row) => {
                                const bookings =
                                    windowDays === 90 ? row.played_last_90d : row.played_last_30d;
                                return {
                                    display: bookings.toLocaleString(),
                                    value: bookings,
                                };
                            }}
                            active={tab === "most-active"}
                            onViewAll={() => onTabChange("most-active")}
                        />
                        <EngagementLeaderboardPanel
                            title={`Inactive Members (${windowDays}+ Days)`}
                            hint={`Paid members who have not played in ${windowDays}+ days.`}
                            metricLabel="Inactive For"
                            rows={(inactive?.rows ?? []).slice(0, 5)}
                            metricOf={(row) => {
                                const days = daysSince(row.last_played_at) ?? 0;
                                return { display: `${days} days`, value: days };
                            }}
                            active={tab === "inactive"}
                            onViewAll={() => onTabChange("inactive")}
                        />
                    </div>

                    {/* Tabbed detail table */}
                    <section className={`${panelCls} p-0`}>
                        <div
                            role="tablist"
                            aria-label="Engagement report"
                            className="flex flex-wrap gap-1 border-b border-border px-3 pt-3"
                        >
                            {tabLabels.map((t) => {
                                const active = t.id === tab;
                                return (
                                    <button
                                        key={t.id}
                                        role="tab"
                                        aria-selected={active}
                                        onClick={() => onTabChange(t.id)}
                                        className={
                                            "rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition-colors " +
                                            (active
                                                ? "border-cta text-cta"
                                                : "border-transparent text-muted-foreground hover:text-foreground")
                                        }
                                    >
                                        {t.label}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="p-4">
                            <PlayerAnalyticsDetailTable
                                rows={tabRows}
                                page={page}
                                totalPages={totalPages}
                                totalItems={totalItems}
                                pageSize={TABLE_PAGE_SIZE}
                                paginateRows
                                onPageChange={setPage}
                            />
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}
