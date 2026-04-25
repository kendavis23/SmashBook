import { useState, type FormEvent, type JSX } from "react";
import { CalendarDays, Check, RefreshCw, UserPlus, X } from "lucide-react";
import { Breadcrumb, AlertToast, formatUTCDate, formatUTCTime, formatCurrency } from "@repo/ui";
import type { PlayerBookingItem, BookingTab, InviteStatus } from "../../types";
import { BOOKING_TABS } from "../../types";

type Props = {
    upcoming: PlayerBookingItem[];
    past: PlayerBookingItem[];
    activeTab: BookingTab;
    isLoading: boolean;
    error: Error | null;
    onTabChange: (tab: BookingTab) => void;
    onRefresh: () => void;
    inviteDialogOpen: boolean;
    isInvitePending: boolean;
    inviteError: string | null;
    isRespondInvitePending: boolean;
    respondInviteError: string | null;
    onOpenInvite: (bookingId: string, clubId: string) => void;
    onCloseInvite: () => void;
    onInvite: (userId: string) => void;
    onDismissInviteError: () => void;
    onRespondInvite: (
        bookingId: string,
        clubId: string,
        action: Extract<InviteStatus, "accepted" | "declined">
    ) => void;
    onDismissRespondInviteError: () => void;
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

function InviteDialog({
    isOpen,
    isPending,
    error,
    onClose,
    onInvite,
    onDismissError,
}: {
    isOpen: boolean;
    isPending: boolean;
    error: string | null;
    onClose: () => void;
    onInvite: (userId: string) => void;
    onDismissError: () => void;
}): JSX.Element | null {
    const [playerId, setPlayerId] = useState("");

    if (!isOpen) return null;

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (playerId.trim()) onInvite(playerId.trim());
    }

    function handleClose() {
        setPlayerId("");
        onClose();
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            onClick={handleClose}
        >
            <div
                className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-base font-semibold text-foreground">Invite Player</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    Enter a player ID to invite them to this open match.
                </p>

                {error ? (
                    <div className="mt-4">
                        <AlertToast title={error} variant="error" onClose={onDismissError} />
                    </div>
                ) : null}

                <form onSubmit={handleSubmit} noValidate className="mt-5">
                    <label className="mb-1 block text-sm font-medium text-foreground">
                        Player ID
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            className="input-base flex-1"
                            placeholder="3fa85f64-5717-4562-b3fc-2c963f66afa6"
                            value={playerId}
                            onChange={(e) => setPlayerId(e.target.value)}
                            disabled={isPending}
                        />
                        <button
                            type="submit"
                            disabled={isPending || !playerId.trim()}
                            className="btn-cta min-h-10 px-4"
                        >
                            {isPending ? "Inviting…" : "Invite"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function BookingTable({
    items,
    emptyMessage,
    showActions,
    isRespondInvitePending,
    onOpenInvite,
    onRespondInvite,
}: {
    items: PlayerBookingItem[];
    emptyMessage: string;
    showActions: boolean;
    isRespondInvitePending: boolean;
    onOpenInvite: (bookingId: string, clubId: string) => void;
    onRespondInvite: (
        bookingId: string,
        clubId: string,
        action: Extract<InviteStatus, "accepted" | "declined">
    ) => void;
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
                        {showActions ? (
                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Action
                            </th>
                        ) : null}
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
                            {showActions ? (
                                <td className="px-4 py-3 text-right">
                                    {booking.role === "organiser" ? (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onOpenInvite(booking.booking_id, booking.club_id)
                                            }
                                            className="btn-outline inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
                                        >
                                            <UserPlus size={12} />
                                            Invite
                                        </button>
                                    ) : (
                                        <InviteResponseActions
                                            booking={booking}
                                            isPending={isRespondInvitePending}
                                            onRespondInvite={onRespondInvite}
                                        />
                                    )}
                                </td>
                            ) : null}
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
    inviteDialogOpen,
    isInvitePending,
    inviteError,
    isRespondInvitePending,
    respondInviteError,
    onOpenInvite,
    onCloseInvite,
    onInvite,
    onDismissInviteError,
    onRespondInvite,
    onDismissRespondInviteError,
}: Props): JSX.Element {
    const items = activeTab === "upcoming" ? upcoming : past;
    const emptyMessage = activeTab === "upcoming" ? "No upcoming bookings." : "No past bookings.";

    return (
        <div className="w-full space-y-5">
            <Breadcrumb items={[{ label: "Bookings" }]} />

            <InviteDialog
                isOpen={inviteDialogOpen}
                isPending={isInvitePending}
                error={inviteError}
                onClose={onCloseInvite}
                onInvite={onInvite}
                onDismissError={onDismissInviteError}
            />

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

                {respondInviteError ? (
                    <div className="px-5 pt-5 sm:px-6">
                        <AlertToast
                            title={respondInviteError}
                            variant="error"
                            onClose={onDismissRespondInviteError}
                        />
                    </div>
                ) : null}

                <div className="px-5 py-5 sm:px-6">
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
                        <BookingTable
                            items={items}
                            emptyMessage={emptyMessage}
                            showActions={activeTab === "upcoming"}
                            isRespondInvitePending={isRespondInvitePending}
                            onOpenInvite={onOpenInvite}
                            onRespondInvite={onRespondInvite}
                        />
                    )}
                </div>
            </section>
        </div>
    );
}

function InviteResponseActions({
    booking,
    isPending,
    onRespondInvite,
}: {
    booking: PlayerBookingItem;
    isPending: boolean;
    onRespondInvite: (
        bookingId: string,
        clubId: string,
        action: Extract<InviteStatus, "accepted" | "declined">
    ) => void;
}): JSX.Element {
    if (booking.invite_status !== "pending") {
        return (
            <span className="inline-flex rounded-full bg-secondary px-2.5 py-1 text-xs font-medium capitalize text-secondary-foreground">
                {booking.invite_status}
            </span>
        );
    }

    return (
        <div className="flex justify-end gap-1.5">
            <button
                type="button"
                disabled={isPending}
                onClick={() => onRespondInvite(booking.booking_id, booking.club_id, "accepted")}
                className="btn-cta inline-flex min-h-8 items-center gap-1.5 px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
            >
                <Check size={12} />
                Accept
            </button>
            <button
                type="button"
                disabled={isPending}
                onClick={() => onRespondInvite(booking.booking_id, booking.club_id, "declined")}
                className="btn-outline inline-flex min-h-8 items-center gap-1.5 px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
            >
                <X size={12} />
                Decline
            </button>
        </div>
    );
}
