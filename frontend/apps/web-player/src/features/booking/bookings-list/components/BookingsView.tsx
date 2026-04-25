import type { JSX } from "react";
import { CalendarDays, RefreshCw } from "lucide-react";
import { Breadcrumb, AlertToast, formatUTCDate, formatUTCTime, formatCurrency } from "@repo/ui";
import type { PlayerBookingItem, BookingTab } from "../../types";
import { BOOKING_TABS } from "../../types";

type Props = {
    upcoming: PlayerBookingItem[];
    past: PlayerBookingItem[];
    activeTab: BookingTab;
    isLoading: boolean;
    error: Error | null;
    onTabChange: (tab: BookingTab) => void;
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

function BookingTable({
    items,
    emptyMessage,
}: {
    items: PlayerBookingItem[];
    emptyMessage: string;
}): JSX.Element {
    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <CalendarDays size={40} className="mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">{emptyMessage}</p>
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
                    {items.map((booking) => (
                        <tr key={booking.booking_id} className="transition hover:bg-muted/5">
                            <td className="px-4 py-3 font-medium text-foreground">
                                {booking.court_name}
                            </td>
                            <td className="px-4 py-3 text-foreground">
                                {formatUTCDate(booking.start_datetime)}
                            </td>
                            <td className="px-4 py-3 text-foreground">
                                {formatUTCTime(booking.start_datetime)} –{" "}
                                {formatUTCTime(booking.end_datetime)}
                            </td>
                            <td className="px-4 py-3 capitalize text-foreground">
                                {booking.booking_type.replace(/_/g, " ")}
                            </td>
                            <td className="px-4 py-3">
                                <span
                                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_CLASSES[booking.status] ?? "bg-secondary text-secondary-foreground"}`}
                                >
                                    {booking.status}
                                </span>
                            </td>
                            <td className="px-4 py-3">
                                <span
                                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${PAYMENT_CLASSES[booking.payment_status] ?? "bg-secondary text-secondary-foreground"}`}
                                >
                                    {booking.payment_status}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-foreground">
                                {formatCurrency(booking.amount_due)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function BookingsView({
    upcoming,
    past,
    activeTab,
    isLoading,
    error,
    onTabChange,
    onRefresh,
}: Props): JSX.Element {
    const items = activeTab === "upcoming" ? upcoming : past;
    const emptyMessage = activeTab === "upcoming" ? "No upcoming bookings." : "No past bookings.";

    return (
        <div className="w-full space-y-5">
            <Breadcrumb items={[{ label: "Bookings" }]} />

            <section className="card-surface overflow-hidden">
                <header className="flex flex-col gap-3 border-b border-border bg-muted/10 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground shadow-xs">
                                <CalendarDays size={16} />
                            </div>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-lg font-semibold tracking-tight text-foreground">
                                        My Bookings
                                    </h1>
                                    {upcoming.length + past.length > 0 ? (
                                        <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground shadow-xs">
                                            {upcoming.length + past.length} total
                                        </span>
                                    ) : null}
                                </div>
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                    View your upcoming and past court bookings
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <button
                            onClick={onRefresh}
                            className="btn-outline min-h-10 px-4"
                            aria-label="Refresh bookings"
                        >
                            <RefreshCw size={14} /> Refresh
                        </button>
                    </div>
                </header>

                {error ? (
                    <div className="px-5 py-5 sm:px-6">
                        <AlertToast
                            title={error.message || "Failed to load bookings."}
                            variant="error"
                        />
                    </div>
                ) : null}

                <div className="px-5 py-5 sm:px-6">
                    {/* Tab bar */}
                    <div className="mb-5 flex gap-1 border-b border-border">
                        {BOOKING_TABS.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => onTabChange(tab.id)}
                                className={`px-4 py-2 text-sm font-medium transition ${
                                    activeTab === tab.id
                                        ? "border-b-2 border-cta text-cta"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                {tab.label}
                                {tab.id === "upcoming" && upcoming.length > 0 ? (
                                    <span className="ml-2 rounded-full bg-cta/10 px-1.5 py-0.5 text-[10px] font-semibold text-cta">
                                        {upcoming.length}
                                    </span>
                                ) : null}
                            </button>
                        ))}
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center gap-3 py-16">
                            <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-cta" />
                            <span className="text-sm text-muted-foreground">Loading bookings…</span>
                        </div>
                    ) : (
                        <BookingTable items={items} emptyMessage={emptyMessage} />
                    )}
                </div>
            </section>
        </div>
    );
}
