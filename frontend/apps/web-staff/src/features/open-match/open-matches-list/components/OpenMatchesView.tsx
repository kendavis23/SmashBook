import type { JSX } from "react";
import { useEffect, useMemo, useState } from "react";
import {
    Breadcrumb,
    DatePicker,
    NumberInput,
    formatCurrency,
    formatUTCDateTime,
    formatUTCTime,
} from "@repo/ui";
import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    Search,
    Settings2,
    Swords,
} from "lucide-react";
import type { OpenGame, OpenMatchListFilters } from "../../types";

type Props = {
    openGames: OpenGame[];
    isLoading: boolean;
    error: Error | null;
    filters: OpenMatchListFilters;
    onFiltersChange: (filters: OpenMatchListFilters) => void;
    onSearch: () => void;
    onRefresh: () => void;
    onManageClick: (gameId: string) => void;
    refreshKey: number;
};

const PAGE_SIZE = 10;

type SortKey = "court" | "date" | "start" | "end";
type SortDirection = "asc" | "desc";

const thCls =
    "px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap";
const tdCls = "px-3 py-3 text-sm text-foreground align-top";

function compareText(a: string, b: string): number {
    return a.localeCompare(b, undefined, { sensitivity: "base", numeric: true });
}

type SortHeaderProps = {
    label: string;
    sortKey: SortKey;
    activeSortKey: SortKey | null;
    direction: SortDirection;
    onSort: (sortKey: SortKey) => void;
};

function SortHeader({
    label,
    sortKey,
    activeSortKey,
    direction,
    onSort,
}: SortHeaderProps): JSX.Element {
    const isActive = activeSortKey === sortKey;
    const Icon = isActive ? (direction === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

    return (
        <button
            type="button"
            onClick={() => onSort(sortKey)}
            className="-ml-1 inline-flex items-center gap-1 rounded px-1 py-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label={`Sort by ${label} ${isActive && direction === "asc" ? "descending" : "ascending"}`}
            aria-sort={isActive ? (direction === "asc" ? "ascending" : "descending") : "none"}
        >
            <span>{label}</span>
            <Icon size={12} className={isActive ? "text-foreground" : "text-muted-foreground/60"} />
        </button>
    );
}

export default function OpenMatchesView({
    openGames,
    isLoading,
    error,
    filters,
    onFiltersChange,
    onSearch,
    onRefresh,
    onManageClick,
    refreshKey,
}: Props): JSX.Element {
    const [page, setPage] = useState(0);
    const [sortKey, setSortKey] = useState<SortKey | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

    const sortedGames = useMemo(() => {
        if (sortKey == null) return openGames;

        const direction = sortDirection === "asc" ? 1 : -1;

        return [...openGames].sort((a, b) => {
            let result = 0;

            if (sortKey === "court") {
                result = compareText(a.court_name, b.court_name);
            } else if (sortKey === "date") {
                result = compareText(a.start_datetime.slice(0, 10), b.start_datetime.slice(0, 10));
            } else if (sortKey === "start") {
                result = compareText(a.start_datetime, b.start_datetime);
            } else {
                result = compareText(a.end_datetime, b.end_datetime);
            }

            return result * direction;
        });
    }, [openGames, sortKey, sortDirection]);

    const totalPages = Math.ceil(sortedGames.length / PAGE_SIZE);

    const pageGames = useMemo(
        () => sortedGames.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
        [sortedGames, page]
    );

    // Reset sort to backend order on refresh
    useEffect(() => {
        setPage(0);
        setSortKey(null);
        setSortDirection("asc");
    }, [refreshKey]);

    // Reset page on new search results
    useEffect(() => {
        setPage(0);
    }, [openGames]);

    const handleSort = (nextSortKey: SortKey) => {
        if (nextSortKey === sortKey) {
            setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
        } else {
            setSortKey(nextSortKey);
            setSortDirection("asc");
        }
        setPage(0);
    };

    return (
        <div className="w-full space-y-5">
            <Breadcrumb items={[{ label: "Open Matches" }]} />

            <section className="card-surface overflow-hidden">
                {/* Header */}
                <header className="flex flex-col gap-3 border-b border-border bg-muted/10 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground shadow-xs">
                                <Swords size={16} />
                            </div>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-lg font-semibold tracking-tight text-foreground">
                                        Open Matches
                                    </h1>
                                    {openGames.length > 0 ? (
                                        <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground shadow-xs">
                                            {openGames.length} total
                                        </span>
                                    ) : null}
                                </div>
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                    Browse open games available for players to join
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <button
                            onClick={onRefresh}
                            className="btn-outline min-h-10 px-4"
                            aria-label="Refresh open matches"
                        >
                            <RefreshCw size={14} /> Refresh
                        </button>
                    </div>
                </header>

                {/* Filters */}
                <div className="border-b border-border bg-muted/20 px-5 py-4 sm:px-6">
                    <div className="mb-3 flex items-center gap-2">
                        <Search size={13} className="text-muted-foreground" />
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Filters
                        </span>
                    </div>

                    <div className="grid grid-cols-1 gap-x-3 gap-y-3 sm:grid-cols-[3fr_2fr_2fr_1fr]">
                        {/* Date */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-medium text-muted-foreground">
                                Date
                            </span>
                            <DatePicker
                                value={filters.date}
                                onChange={(v) => onFiltersChange({ ...filters, date: v })}
                                placeholder="Select date"
                            />
                        </div>

                        {/* Min skill */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-medium text-muted-foreground">
                                Min Skill
                            </span>
                            <NumberInput
                                className="input-base"
                                value={
                                    filters.minSkill === "" ? undefined : Number(filters.minSkill)
                                }
                                min={1}
                                max={10}
                                placeholder="1"
                                onChange={(e) =>
                                    onFiltersChange({ ...filters, minSkill: e.target.value })
                                }
                            />
                        </div>

                        {/* Max skill */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-medium text-muted-foreground">
                                Max Skill
                            </span>
                            <NumberInput
                                className="input-base"
                                value={
                                    filters.maxSkill === "" ? undefined : Number(filters.maxSkill)
                                }
                                min={1}
                                max={10}
                                placeholder="10"
                                onChange={(e) =>
                                    onFiltersChange({ ...filters, maxSkill: e.target.value })
                                }
                            />
                        </div>

                        {/* Search button */}
                        <div className="flex flex-col justify-end">
                            <button
                                onClick={onSearch}
                                className="btn-cta h-[38px] w-full whitespace-nowrap px-2"
                                aria-label="Apply filters"
                            >
                                <Search size={14} /> Search
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="flex items-center justify-center gap-3 py-20">
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-cta" />
                        <span className="text-sm text-muted-foreground">Loading open matches…</span>
                    </div>
                ) : error ? (
                    <div className="m-5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        {error.message}
                    </div>
                ) : openGames.length === 0 ? (
                    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                            <Swords size={24} className="text-muted-foreground/40" />
                        </div>
                        <h3 className="text-sm font-semibold text-foreground">
                            No open matches found
                        </h3>
                        <p className="mt-1.5 max-w-xs text-xs text-muted-foreground">
                            No open games match your filters. Try adjusting the date or skill range.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto" key={page}>
                        <table className="w-full min-w-[760px] border-collapse">
                            <thead>
                                <tr className="border-b border-border bg-muted/30">
                                    <th className={thCls}>
                                        <SortHeader
                                            label="Court"
                                            sortKey="court"
                                            activeSortKey={sortKey}
                                            direction={sortDirection}
                                            onSort={handleSort}
                                        />
                                    </th>
                                    <th className={thCls}>
                                        <SortHeader
                                            label="Date"
                                            sortKey="date"
                                            activeSortKey={sortKey}
                                            direction={sortDirection}
                                            onSort={handleSort}
                                        />
                                    </th>
                                    <th className={thCls}>
                                        <SortHeader
                                            label="Start"
                                            sortKey="start"
                                            activeSortKey={sortKey}
                                            direction={sortDirection}
                                            onSort={handleSort}
                                        />
                                    </th>
                                    <th className={thCls}>
                                        <SortHeader
                                            label="End"
                                            sortKey="end"
                                            activeSortKey={sortKey}
                                            direction={sortDirection}
                                            onSort={handleSort}
                                        />
                                    </th>
                                    <th className={thCls}>Skill Range</th>
                                    <th className={thCls}>Slots Available</th>
                                    <th className={thCls}>Price</th>
                                    <th className={`${thCls} text-right`}>Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {pageGames.map((game) => (
                                    <tr key={game.id} className="transition hover:bg-muted/20">
                                        <td className={tdCls}>
                                            <span className="font-medium text-foreground">
                                                {game.court_name}
                                            </span>
                                        </td>

                                        <td className={tdCls}>
                                            <span className="whitespace-nowrap text-muted-foreground">
                                                {
                                                    formatUTCDateTime(game.start_datetime).split(
                                                        ","
                                                    )[0]
                                                }
                                            </span>
                                        </td>

                                        <td className={tdCls}>
                                            <span className="whitespace-nowrap text-muted-foreground">
                                                {formatUTCTime(game.start_datetime)}
                                            </span>
                                        </td>

                                        <td className={tdCls}>
                                            <span className="whitespace-nowrap text-muted-foreground">
                                                {formatUTCTime(game.end_datetime)}
                                            </span>
                                        </td>

                                        <td className={tdCls}>
                                            <span className="text-muted-foreground">
                                                {game.min_skill_level != null ||
                                                game.max_skill_level != null ? (
                                                    <>
                                                        {game.min_skill_level ?? "—"}
                                                        {" – "}
                                                        {game.max_skill_level ?? "—"}
                                                    </>
                                                ) : (
                                                    <span className="text-muted-foreground/60">
                                                        Any
                                                    </span>
                                                )}
                                            </span>
                                        </td>

                                        <td className={tdCls}>
                                            <span
                                                className={
                                                    game.slots_available === 0
                                                        ? "font-medium text-destructive"
                                                        : "text-muted-foreground"
                                                }
                                            >
                                                {game.slots_available === 0
                                                    ? "Full"
                                                    : game.slots_available}
                                            </span>
                                        </td>

                                        <td className={tdCls}>
                                            <span className="text-muted-foreground">
                                                {formatCurrency(game.total_price)}
                                            </span>
                                        </td>

                                        <td className={`${tdCls} text-right`}>
                                            <button
                                                onClick={() => onManageClick(game.id)}
                                                className="inline-flex items-center justify-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground transition hover:bg-muted"
                                                aria-label={`Manage open match ${game.id}`}
                                            >
                                                <Settings2 size={13} /> Manage
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {!isLoading && !error && totalPages > 1 ? (
                    <div className="flex items-center justify-between border-t border-border px-5 py-3 sm:px-6">
                        <span className="text-xs text-muted-foreground">
                            {page * PAGE_SIZE + 1}–
                            {Math.min((page + 1) * PAGE_SIZE, sortedGames.length)} of{" "}
                            {sortedGames.length}
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage((p) => p - 1)}
                                disabled={page === 0}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-foreground transition hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
                                aria-label="Previous page"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setPage(i)}
                                    className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-medium transition ${
                                        i === page
                                            ? "border-cta bg-cta text-cta-foreground"
                                            : "border-border bg-card text-foreground hover:bg-muted"
                                    }`}
                                    aria-label={`Page ${i + 1}`}
                                    aria-current={i === page ? "page" : undefined}
                                >
                                    {i + 1}
                                </button>
                            ))}
                            <button
                                onClick={() => setPage((p) => p + 1)}
                                disabled={page === totalPages - 1}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-foreground transition hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
                                aria-label="Next page"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                ) : null}
            </section>
        </div>
    );
}
