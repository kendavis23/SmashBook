import type { JSX } from "react";
import { Swords, RefreshCw } from "lucide-react";
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

function GamesTable({ items }: { items: PlayerBookingItem[] }): JSX.Element {
    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <Swords size={40} className="mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No match history found.</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-border bg-muted/10">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Court
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Time
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Type
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Role
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Payment
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Amount
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {items.map((game) => (
                        <tr key={game.booking_id} className="transition hover:bg-muted/5">
                            <td className="px-4 py-3 font-medium text-foreground">
                                {game.court_name}
                            </td>
                            <td className="px-4 py-3 text-foreground">
                                {formatUTCDate(game.start_datetime)}
                            </td>
                            <td className="px-4 py-3 text-foreground">
                                {formatUTCTime(game.start_datetime)} –{" "}
                                {formatUTCTime(game.end_datetime)}
                            </td>
                            <td className="px-4 py-3 capitalize text-foreground">
                                {game.booking_type.replace(/_/g, " ")}
                            </td>
                            <td className="px-4 py-3 capitalize text-foreground">{game.role}</td>
                            <td className="px-4 py-3">
                                <span
                                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_CLASSES[game.status] ?? "bg-secondary text-secondary-foreground"}`}
                                >
                                    {game.status}
                                </span>
                            </td>
                            <td className="px-4 py-3">
                                <span
                                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${PAYMENT_CLASSES[game.payment_status] ?? "bg-secondary text-secondary-foreground"}`}
                                >
                                    {game.payment_status}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-foreground">
                                {formatCurrency(game.amount_due)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
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

                <div className="px-5 py-5 sm:px-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center gap-3 py-16">
                            <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-cta" />
                            <span className="text-sm text-muted-foreground">
                                Loading match history…
                            </span>
                        </div>
                    ) : (
                        <GamesTable items={games} />
                    )}
                </div>
            </section>
        </div>
    );
}
