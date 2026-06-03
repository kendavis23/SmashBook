import type { JSX } from "react";
import { Users, RefreshCw } from "lucide-react";
import { formatCurrency, Toggle } from "@repo/ui";
import type { PlayerSort, PlayerValueLeaderboard } from "../../types";
import type { PlayerValueSummary } from "../playerValueSummary";
import type { PlayerTab } from "../playerValueConstants";
import {
    PLAYER_SORT_TAB_LABEL,
    PLAYER_TABS,
    TABLE_PAGE_SIZE,
    daysSince,
    formatPlayedDate,
    panelCls,
} from "../playerValueConstants";
import { PlayerAnalyticsDetailTable } from "../../components/PlayerAnalyticsDetailTable";
import { LeaderboardPanel } from "./LeaderboardPanel";

type Props = {
    summary: PlayerValueSummary;
    value: PlayerValueLeaderboard | undefined;
    topLifetimeSpend: PlayerValueLeaderboard | undefined;
    topBookingsPlayed: PlayerValueLeaderboard | undefined;
    topRecentlyPlayed: PlayerValueLeaderboard | undefined;
    tab: PlayerTab;
    membersOnly: boolean;
    sort: PlayerSort;
    page: number;
    totalPages: number;
    totalItems: number;
    isLoading: boolean;
    error: Error | null;
    onTabChange: (tab: PlayerTab) => void;
    onMembersOnlyChange: (membersOnly: boolean) => void;
    onSortChange: (sort: PlayerSort) => void;
    onPageChange: (page: number) => void;
    onRefresh: () => void;
};

export default function PlayerValueView({
    summary,
    value,
    topLifetimeSpend,
    topBookingsPlayed,
    topRecentlyPlayed,
    tab,
    membersOnly,
    sort,
    page,
    totalPages,
    totalItems,
    isLoading,
    error,
    onTabChange,
    onMembersOnlyChange,
    onSortChange,
    onPageChange,
    onRefresh,
}: Props): JSX.Element {
    const tabRows = value?.rows ?? [];
    const activeTabLabel = PLAYER_SORT_TAB_LABEL[sort];

    return (
        <div className="w-full space-y-4">
            {/* Header */}
            <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-secondary-foreground shadow-xs">
                            <Users size={15} />
                        </div>
                        <h1 className="text-lg font-semibold tracking-tight text-foreground">
                            Player Value
                        </h1>
                    </div>
                    <p className="mt-0.5 text-sm leading-5 text-muted-foreground">
                        Lifetime spend and booking history across your top players.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm text-foreground">
                        <Toggle checked={membersOnly} onChange={onMembersOnlyChange} />
                        Members only
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
                    Failed to load player analytics. {error.message}
                </div>
            ) : isLoading ? (
                <div className="flex items-center justify-center gap-3 py-32">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-cta" />
                    <span className="text-sm text-muted-foreground">Loading player analytics…</span>
                </div>
            ) : summary.isEmpty ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card py-24 text-center">
                    <Users size={28} className="text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">No player data yet</p>
                    <p className="text-sm text-muted-foreground">
                        Once players start booking, their value will appear here.
                    </p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                        <LeaderboardPanel
                            title="Top 5 Lifetime Spend"
                            hint="Highest net lifetime spend after refunds."
                            metricLabel="Lifetime Spend"
                            rows={topLifetimeSpend?.rows ?? []}
                            metricOf={(row) => ({
                                display: formatCurrency(row.lifetime_spend),
                                value: Number(row.lifetime_spend) || 0,
                            })}
                            active={sort === "lifetime_spend"}
                            onViewAll={() => onSortChange("lifetime_spend")}
                        />
                        <LeaderboardPanel
                            title="Top 5 Bookings Played"
                            hint="Players with the highest all-time played bookings."
                            metricLabel="Bookings"
                            rows={topBookingsPlayed?.rows ?? []}
                            metricOf={(row) => ({
                                display: row.bookings_played.toLocaleString(),
                                value: row.bookings_played,
                            })}
                            active={sort === "bookings_played"}
                            onViewAll={() => onSortChange("bookings_played")}
                        />
                        <LeaderboardPanel
                            title="Top 5 Recently Played"
                            hint="Players ordered by their latest played booking."
                            metricLabel="Last Played"
                            rows={topRecentlyPlayed?.rows ?? []}
                            metricOf={(row) => {
                                const days = daysSince(row.last_played_at);
                                return {
                                    display:
                                        row.last_played_at === null
                                            ? "—"
                                            : formatPlayedDate(row.last_played_at),
                                    value: days === null ? 0 : Math.max(1, 100 - days),
                                };
                            }}
                            active={sort === "last_played_at"}
                            onViewAll={() => onSortChange("last_played_at")}
                        />
                    </div>

                    {/* Detail table */}
                    <section className={`${panelCls} p-0`}>
                        <div
                            role="tablist"
                            aria-label="Player report"
                            className="flex flex-wrap gap-1 border-b border-border px-3 pt-3"
                        >
                            {PLAYER_TABS.map((t) => {
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
                                        {active ? activeTabLabel : t.label}
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
                                onPageChange={onPageChange}
                            />
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}
