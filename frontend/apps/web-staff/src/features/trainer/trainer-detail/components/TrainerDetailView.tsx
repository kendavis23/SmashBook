import type { JSX } from "react";
import { Users, Calendar, Clock, BookOpen, ChevronDown, ChevronRight } from "lucide-react";
import { Breadcrumb, AlertToast } from "@repo/ui";
import { formatUTCDate, formatUTCTime } from "@repo/ui";
import type { Trainer, TrainerAvailability, TrainerBookingItem, TrainerTab } from "../../types";
import { TRAINER_TABS, DAY_LABELS, BOOKING_TYPE_LABELS, BOOKING_STATUS_LABELS } from "../../types";
import { useState } from "react";

type Props = {
    trainer: Trainer;
    availability: TrainerAvailability[];
    availabilityLoading: boolean;
    availabilityError: Error | null;
    bookings: TrainerBookingItem[];
    bookingsLoading: boolean;
    bookingsError: Error | null;
    canManage: boolean;
    activeTab: TrainerTab;
    onTabChange: (tab: TrainerTab) => void;
    onRefreshAvailability: () => void;
    onRefreshBookings: () => void;
};

function BookingStatusBadge({ status }: { status: string }): JSX.Element {
    const colorMap: Record<string, string> = {
        confirmed: "bg-success/15 text-success",
        pending: "bg-warning/15 text-warning",
        cancelled: "bg-destructive/10 text-destructive",
        completed: "bg-info/15 text-info",
    };
    return (
        <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${colorMap[status] ?? "bg-secondary text-secondary-foreground"}`}
        >
            {BOOKING_STATUS_LABELS[status] ?? status}
        </span>
    );
}

function AvailabilityRow({ slot }: { slot: TrainerAvailability }): JSX.Element {
    const [open, setOpen] = useState(false);

    return (
        <div className="overflow-hidden rounded-lg border border-border">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="flex w-full items-center justify-between bg-muted/20 px-4 py-3 text-left transition hover:bg-muted/40"
                aria-expanded={open}
            >
                <div className="flex items-center gap-3">
                    <Calendar size={14} className="text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">
                        {DAY_LABELS[slot.day_of_week]}
                    </span>
                    <span className="text-sm text-muted-foreground">
                        {slot.start_time} – {slot.end_time}
                    </span>
                </div>
                {open ? (
                    <ChevronDown size={13} className="text-muted-foreground" />
                ) : (
                    <ChevronRight size={13} className="text-muted-foreground" />
                )}
            </button>
            {open ? (
                <div className="space-y-2 border-t border-border p-4 text-sm">
                    <div className="flex gap-2">
                        <span className="text-muted-foreground">Effective from:</span>
                        <span className="text-foreground">
                            {formatUTCDate(slot.effective_from)}
                        </span>
                    </div>
                    {slot.effective_until ? (
                        <div className="flex gap-2">
                            <span className="text-muted-foreground">Effective until:</span>
                            <span className="text-foreground">
                                {formatUTCDate(slot.effective_until)}
                            </span>
                        </div>
                    ) : null}
                    {slot.notes ? (
                        <div className="flex gap-2">
                            <span className="text-muted-foreground">Notes:</span>
                            <span className="text-foreground">{slot.notes}</span>
                        </div>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}

export default function TrainerDetailView({
    trainer,
    availability,
    availabilityLoading,
    availabilityError,
    bookings,
    bookingsLoading,
    bookingsError,
    activeTab,
    onTabChange,
    onRefreshAvailability,
    onRefreshBookings,
}: Props): JSX.Element {
    return (
        <div className="w-full space-y-5">
            <Breadcrumb
                items={[{ label: "Trainers", href: "/trainers" }, { label: "Trainer Detail" }]}
            />

            <section className="card-surface overflow-hidden">
                {/* Profile header */}
                <header className="flex flex-col gap-3 border-b border-border bg-muted/10 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground shadow-xs">
                                <Users size={16} />
                            </div>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-lg font-semibold tracking-tight text-foreground">
                                        Trainer #{trainer.id.slice(0, 8)}
                                    </h1>
                                    <span
                                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                                            trainer.is_active
                                                ? "bg-success/15 text-success"
                                                : "bg-destructive/10 text-destructive"
                                        }`}
                                    >
                                        {trainer.is_active ? "Active" : "Inactive"}
                                    </span>
                                </div>
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                    {trainer.bio ?? "No bio provided."}
                                </p>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Tabs */}
                <div className="border-b border-border px-5 sm:px-6">
                    <nav className="-mb-px flex gap-0">
                        {TRAINER_TABS.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => onTabChange(tab.id)}
                                className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-medium transition ${
                                    activeTab === tab.id
                                        ? "border-cta text-cta"
                                        : "border-transparent text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                {tab.id === "availability" ? (
                                    <Clock size={14} />
                                ) : (
                                    <BookOpen size={14} />
                                )}
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="px-5 py-5 sm:px-6">
                    {/* ── Availability Tab ── */}
                    {activeTab === "availability" ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-semibold text-foreground">
                                        Weekly Availability
                                    </h3>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Recurring time slots when this trainer is available.
                                    </p>
                                </div>
                                <button
                                    onClick={onRefreshAvailability}
                                    className="btn-outline px-3 py-1.5 text-xs"
                                    aria-label="Refresh availability"
                                >
                                    Refresh
                                </button>
                            </div>

                            {availabilityError ? (
                                <AlertToast
                                    title={
                                        availabilityError.message ?? "Failed to load availability."
                                    }
                                    variant="error"
                                    onClose={onRefreshAvailability}
                                />
                            ) : null}

                            {availabilityLoading ? (
                                <div className="flex items-center justify-center gap-3 py-12">
                                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-cta" />
                                    <span className="text-sm text-muted-foreground">
                                        Loading availability…
                                    </span>
                                </div>
                            ) : availability.length === 0 ? (
                                <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                                        <Clock size={18} />
                                    </div>
                                    <p className="text-sm font-medium text-foreground">
                                        No availability set
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        This trainer has no availability slots configured.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {availability.map((slot) => (
                                        <AvailabilityRow key={slot.id} slot={slot} />
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : null}

                    {/* ── Bookings Tab ── */}
                    {activeTab === "bookings" ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-semibold text-foreground">
                                        Assigned Bookings
                                    </h3>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Upcoming bookings assigned to this trainer.
                                    </p>
                                </div>
                                <button
                                    onClick={onRefreshBookings}
                                    className="btn-outline px-3 py-1.5 text-xs"
                                    aria-label="Refresh bookings"
                                >
                                    Refresh
                                </button>
                            </div>

                            {bookingsError ? (
                                <AlertToast
                                    title={bookingsError.message ?? "Failed to load bookings."}
                                    variant="error"
                                    onClose={onRefreshBookings}
                                />
                            ) : null}

                            {bookingsLoading ? (
                                <div className="flex items-center justify-center gap-3 py-12">
                                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-cta" />
                                    <span className="text-sm text-muted-foreground">
                                        Loading bookings…
                                    </span>
                                </div>
                            ) : bookings.length === 0 ? (
                                <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                                        <BookOpen size={18} />
                                    </div>
                                    <p className="text-sm font-medium text-foreground">
                                        No bookings found
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        No upcoming bookings are assigned to this trainer.
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-muted/10">
                                                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                                    Court
                                                </th>
                                                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                                    Type
                                                </th>
                                                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                                    Date
                                                </th>
                                                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                                    Time
                                                </th>
                                                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                                    Players
                                                </th>
                                                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                                    Status
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {bookings.map((booking) => (
                                                <tr
                                                    key={booking.booking_id}
                                                    className="border-t border-border hover:bg-muted/20"
                                                >
                                                    <td className="px-3 py-3 font-medium text-foreground">
                                                        {booking.court_name}
                                                    </td>
                                                    <td className="px-3 py-3 text-foreground">
                                                        {BOOKING_TYPE_LABELS[
                                                            booking.booking_type
                                                        ] ?? booking.booking_type}
                                                    </td>
                                                    <td className="px-3 py-3 text-foreground">
                                                        {formatUTCDate(booking.start_datetime)}
                                                    </td>
                                                    <td className="px-3 py-3 text-foreground">
                                                        {formatUTCTime(booking.start_datetime)} –{" "}
                                                        {formatUTCTime(booking.end_datetime)}
                                                    </td>
                                                    <td className="px-3 py-3 text-foreground">
                                                        {booking.participants.length}
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <BookingStatusBadge
                                                            status={booking.status}
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>
            </section>
        </div>
    );
}
