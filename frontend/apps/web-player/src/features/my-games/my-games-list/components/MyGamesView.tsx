import { useState, useMemo, useEffect, type JSX } from "react";
import { Swords, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { Breadcrumb, AlertToast, formatUTCDate, formatUTCTime, formatCurrency } from "@repo/ui";
import type { PlayerBookingItem } from "../../types";

type Props = {
    games: PlayerBookingItem[];
    isLoading: boolean;
    error: Error | null;
    onRefresh: () => void;
};

const STATUS_CLASSES: Record<string, string> = {
    confirmed: "bg-success/15 text-success",
    pending: "bg-warning/15 text-warning",
    cancelled: "bg-destructive/15 text-destructive",
    completed: "bg-secondary text-secondary-foreground",
};

const PAYMENT_CLASSES: Record<string, string> = {
    paid: "bg-success/15 text-success",
    pending: "bg-warning/15 text-warning",
    refunded: "bg-info/15 text-info",
};

const thCls =
    "px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap";
const tdCls = "px-3 py-3 text-sm text-foreground align-top";

const PAGE_SIZE = 10;

function GamesTable({ items }: { items: PlayerBookingItem[] }): JSX.Element {
    const [page, setPage] = useState(0);
    const totalPages = Math.ceil(items.length / PAGE_SIZE);
    const pageItems = useMemo(
        () => items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
        [items, page]
    );

    useEffect(() => {
        setPage(0);
    }, [items]);

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <Swords size={40} className="mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No match history found.</p>
            </div>
        );
    }

    return (
        <>
            <div className="overflow-x-auto" key={page}>
                <table className="w-full min-w-[700px] border-collapse">
                    <thead>
                        <tr className="border-b border-border bg-muted/30">
                            <th className={thCls}>Court</th>
                            <th className={thCls}>Date</th>
                            <th className={thCls}>Time</th>
                            <th className={thCls}>Type</th>
                            <th className={thCls}>Role</th>
                            <th className={thCls}>Status</th>
                            <th className={thCls}>Payment</th>
                            <th className={`${thCls} text-right`}>Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {pageItems.map((game) => (
                            <tr key={game.booking_id} className="transition hover:bg-muted/20">
                                <td className={`${tdCls} font-medium`}>{game.court_name}</td>
                                <td className={tdCls}>
                                    <span className="whitespace-nowrap text-muted-foreground">
                                        {formatUTCDate(game.start_datetime)}
                                    </span>
                                </td>
                                <td className={tdCls}>
                                    <span className="whitespace-nowrap text-muted-foreground">
                                        {formatUTCTime(game.start_datetime)} –{" "}
                                        {formatUTCTime(game.end_datetime)}
                                    </span>
                                </td>
                                <td className={tdCls}>
                                    <span className="capitalize text-muted-foreground">
                                        {game.booking_type.replace(/_/g, " ")}
                                    </span>
                                </td>
                                <td className={tdCls}>
                                    <span className="capitalize text-muted-foreground">
                                        {game.role}
                                    </span>
                                </td>
                                <td className={tdCls}>
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${STATUS_CLASSES[game.status] ?? "bg-secondary text-secondary-foreground"}`}
                                    >
                                        {game.status}
                                    </span>
                                </td>
                                <td className={tdCls}>
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${PAYMENT_CLASSES[game.payment_status] ?? "bg-secondary text-secondary-foreground"}`}
                                    >
                                        {game.payment_status}
                                    </span>
                                </td>
                                <td className={`${tdCls} text-right`}>
                                    <span className="font-medium text-muted-foreground">
                                        {formatCurrency(game.amount_due)}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 ? (
                <div className="flex items-center justify-between border-t border-border px-5 py-3 sm:px-6">
                    <span className="text-xs text-muted-foreground">
                        {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, items.length)} of{" "}
                        {items.length}
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
        </>
    );
}

export default function MyGamesView({ games, isLoading, error, onRefresh }: Props): JSX.Element {
    return (
        <div className="w-full space-y-5">
            <Breadcrumb items={[{ label: "My Games" }]} />

            <section className="card-surface overflow-hidden">
                <header className="flex flex-col gap-3 border-b border-border bg-muted/10 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground shadow-xs">
                                <Swords size={16} />
                            </div>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-lg font-semibold tracking-tight text-foreground">
                                        My Games
                                    </h1>
                                    {games.length > 0 ? (
                                        <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground shadow-xs">
                                            {games.length} total
                                        </span>
                                    ) : null}
                                </div>
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                    Your full match history
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <button
                            onClick={onRefresh}
                            className="btn-outline min-h-10 px-4"
                            aria-label="Refresh my games"
                        >
                            <RefreshCw size={14} /> Refresh
                        </button>
                    </div>
                </header>

                {error ? (
                    <div className="px-5 py-5 sm:px-6">
                        <AlertToast
                            title={error.message || "Failed to load match history."}
                            variant="error"
                        />
                    </div>
                ) : null}

                {isLoading ? (
                    <div className="flex items-center justify-center gap-3 py-20">
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-cta" />
                        <span className="text-sm text-muted-foreground">
                            Loading match history…
                        </span>
                    </div>
                ) : (
                    <GamesTable items={games} />
                )}
            </section>
        </div>
    );
}
