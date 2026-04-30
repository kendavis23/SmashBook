import {
    CalendarDays,
    TrendingUp,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    ArrowRight,
} from "lucide-react";
import type { JSX } from "react";
import { useEffect, useState } from "react";
import { formatUTCDate, SkillLineChart } from "@repo/ui";
import type { SkillDataPoint } from "@repo/ui";
import { useGetSkillHistory } from "@repo/staff-domain/hooks";
import type { PlayerSearchResult } from "../../hooks";

const PAGE_SIZE = 5;
const GRAPH_ENTRIES = 12;

type Props = {
    selectedPlayer: PlayerSearchResult | null;
    refreshSignal?: number;
    onUpdateClick: (player: PlayerSearchResult) => void;
};

function ChangeCell({ previous, next }: { previous: number | null; next: number }): JSX.Element {
    const isUp = previous == null || next > previous;
    const isDown = previous != null && next < previous;
    return (
        <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground/60">{previous ?? "—"}</span>
            <ArrowRight
                size={11}
                className={
                    isUp && previous != null
                        ? "text-success"
                        : isDown
                          ? "text-destructive"
                          : "text-muted-foreground/50"
                }
            />
            <span
                className={`text-xs font-bold ${
                    isUp && previous != null
                        ? "text-success"
                        : isDown
                          ? "text-destructive"
                          : "text-foreground"
                }`}
            >
                {next}
            </span>
            {previous != null && next !== previous ? (
                <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${
                        isUp ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                    }`}
                >
                    {isUp ? "+" : ""}
                    {(next - (previous ?? 0)).toFixed(1)}
                </span>
            ) : null}
        </div>
    );
}

function formatChartDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return formatUTCDate(value);
    return new Intl.DateTimeFormat("en", {
        day: "2-digit",
        month: "short",
        timeZone: "UTC",
    }).format(date);
}

function formatDelta(value: number): string {
    if (value > 0) return `+${value.toFixed(1)}`;
    if (value < 0) return value.toFixed(1);
    return "0.0";
}


function PlayerSkillOverview({
    player,
    chartData,
    onUpdateClick,
    onRefetch,
    historyCount,
    totalDelta,
    latestDate,
}: {
    player: PlayerSearchResult;
    chartData: SkillDataPoint[];
    onUpdateClick: () => void;
    onRefetch: () => void;
    historyCount: number;
    totalDelta: number | null;
    latestDate: string | null;
}): JSX.Element {
    const initials = player.full_name
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase();

    const deltaTone =
        totalDelta == null || totalDelta === 0
            ? "text-muted-foreground"
            : totalDelta > 0
              ? "text-success"
              : "text-destructive";

    return (
        <div className="space-y-4 border-b border-border/70 bg-background px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-secondary to-muted text-sm font-bold text-foreground ring-1 ring-border shadow-sm">
                        {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold leading-tight text-foreground">
                            {player.full_name}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                            <span className="text-xs text-muted-foreground">
                                Level{" "}
                                <span className="font-bold text-foreground">
                                    {player.skill_level ?? "—"}
                                </span>
                            </span>
                            <span className="text-muted-foreground/30">·</span>
                            <span className={`text-xs font-semibold ${deltaTone}`}>
                                {totalDelta == null ? "—" : formatDelta(totalDelta)}
                            </span>
                            <span className="text-muted-foreground/30">·</span>
                            <span className="text-xs text-muted-foreground">
                                {historyCount} update{historyCount !== 1 ? "s" : ""}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <button
                        type="button"
                        onClick={onRefetch}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition hover:border-cta/40 hover:bg-cta/5 hover:text-cta"
                        aria-label="Refresh skill history"
                    >
                        <RefreshCw size={13} />
                    </button>
                    <button
                        type="button"
                        onClick={onUpdateClick}
                        className="btn-cta min-h-8 px-3 text-xs font-semibold shadow-sm shadow-cta/20"
                    >
                        Update Skill
                    </button>
                </div>
            </div>

            <div className="rounded-xl border border-border/80 bg-gradient-to-b from-muted/20 to-background p-4 shadow-sm">
                <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="text-sm font-semibold text-foreground">Skill progression</h3>
                        <p className="text-xs text-muted-foreground">
                            Last {Math.min(chartData.length, GRAPH_ENTRIES)} recorded updates with
                            dates on the x-axis
                        </p>
                    </div>
                    {latestDate ? (
                        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                            <CalendarDays size={13} />
                            <span>Latest {latestDate}</span>
                        </div>
                    ) : null}
                </div>
                {chartData.length > 0 ? (
                    <div className="h-[260px] w-full">
                        <SkillLineChart data={chartData} />
                    </div>
                ) : (
                    <div className="flex h-[260px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 text-xs text-muted-foreground">
                        No progression data yet
                    </div>
                )}
            </div>
        </div>
    );
}

export default function SkillHistoryPanel({
    selectedPlayer,
    refreshSignal = 0,
    onUpdateClick,
}: Props): JSX.Element {
    const {
        data: history = [],
        isLoading,
        error,
        refetch,
    } = useGetSkillHistory(selectedPlayer?.id ?? "");
    const [page, setPage] = useState(0);

    useEffect(() => {
        setPage(0);
    }, [selectedPlayer?.id]);

    useEffect(() => {
        if (selectedPlayer) {
            void refetch();
        }
    }, [refetch, refreshSignal, selectedPlayer]);

    const totalPages = Math.ceil(history.length / PAGE_SIZE);
    const pageItems = history.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    const chartItems = history.slice(0, GRAPH_ENTRIES).reverse();
    const chartData: SkillDataPoint[] = chartItems.map((item) => ({
        label: formatChartDate(item.created_at),
        value: item.new_level,
    }));
    const latestHistoryItem = history[0] ?? null;
    const secondLatestHistoryItem = history[1] ?? null;
    const totalDelta =
        latestHistoryItem && secondLatestHistoryItem
            ? latestHistoryItem.new_level - secondLatestHistoryItem.new_level
            : null;

    if (!selectedPlayer) {
        return (
            <div className="flex min-h-[24rem] flex-col items-center justify-center p-8">
                <div className="w-full max-w-xs rounded-2xl border border-dashed border-border/80 bg-background/60 px-6 py-10 text-center shadow-inner">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-muted to-muted/40 shadow-sm ring-1 ring-border/50">
                        <TrendingUp size={20} className="text-muted-foreground/60" />
                    </div>
                    <h2 className="text-sm font-semibold text-foreground">Player Profile</h2>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        Search and select a player above to view their profile.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col">
            {/* Profile + graph */}
            {isLoading ? (
                <div className="flex items-center justify-center gap-2.5 py-12">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-cta" />
                    <span className="text-xs text-muted-foreground">Loading…</span>
                </div>
            ) : error ? (
                <div className="m-5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive">
                    {(error as Error).message}
                </div>
            ) : (
                <>
                    <PlayerSkillOverview
                        player={selectedPlayer}
                        chartData={chartData}
                        onUpdateClick={() => onUpdateClick(selectedPlayer)}
                        onRefetch={() => void refetch()}
                        historyCount={history.length}
                        totalDelta={totalDelta}
                        latestDate={
                            latestHistoryItem ? formatUTCDate(latestHistoryItem.created_at) : null
                        }
                    />

                    {/* History table */}
                    <div className="flex flex-1 flex-col overflow-hidden">
                        {history.length === 0 ? (
                            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/60">
                                    <TrendingUp size={18} className="text-muted-foreground/30" />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    No skill history recorded yet
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="flex-1 overflow-y-auto">
                                    <table className="w-full border-collapse">
                                        <thead className="sticky top-0 z-10">
                                            <tr className="border-b border-border/80 bg-muted/40 backdrop-blur-sm">
                                                <th className="w-px whitespace-nowrap px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                                                    Date
                                                </th>
                                                <th className="w-px whitespace-nowrap px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                                                    Change
                                                </th>
                                                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                                                    Reason
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/50">
                                            {pageItems.map((item) => (
                                                <tr
                                                    key={item.id}
                                                    className="group transition-colors duration-100 hover:bg-muted/25"
                                                >
                                                    <td className="w-px whitespace-nowrap px-5 py-3.5">
                                                        <span className="text-xs font-medium text-muted-foreground">
                                                            {formatUTCDate(item.created_at)}
                                                        </span>
                                                    </td>
                                                    <td className="w-px whitespace-nowrap px-4 py-3.5">
                                                        <ChangeCell
                                                            previous={item.previous_level ?? null}
                                                            next={item.new_level}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3.5 text-xs text-muted-foreground">
                                                        {item.reason ? (
                                                            <span className="break-words">
                                                                {item.reason}
                                                            </span>
                                                        ) : (
                                                            <span className="text-muted-foreground/30">
                                                                —
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                {totalPages > 1 ? (
                                    <div className="flex items-center justify-between border-t border-border/60 bg-muted/10 px-5 py-2.5">
                                        <span className="text-[11px] text-muted-foreground">
                                            {page * PAGE_SIZE + 1}–
                                            {Math.min((page + 1) * PAGE_SIZE, history.length)} of{" "}
                                            {history.length}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                disabled={page === 0}
                                                onClick={() => setPage((p) => p - 1)}
                                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition hover:border-cta/40 hover:text-cta disabled:cursor-not-allowed disabled:opacity-40"
                                                aria-label="Previous page"
                                            >
                                                <ChevronLeft size={13} />
                                            </button>
                                            {Array.from({ length: totalPages }, (_, i) => (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    onClick={() => setPage(i)}
                                                    className={`flex h-7 w-7 items-center justify-center rounded-lg border text-[11px] font-semibold transition ${
                                                        i === page
                                                            ? "border-cta bg-cta text-cta-foreground shadow-sm shadow-cta/20"
                                                            : "border-border bg-background text-muted-foreground hover:border-cta/40 hover:text-cta"
                                                    }`}
                                                >
                                                    {i + 1}
                                                </button>
                                            ))}
                                            <button
                                                type="button"
                                                disabled={page === totalPages - 1}
                                                onClick={() => setPage((p) => p + 1)}
                                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition hover:border-cta/40 hover:text-cta disabled:cursor-not-allowed disabled:opacity-40"
                                                aria-label="Next page"
                                            >
                                                <ChevronRight size={13} />
                                            </button>
                                        </div>
                                    </div>
                                ) : null}
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
