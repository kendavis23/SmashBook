import type { JSX } from "react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { UserRound, X } from "lucide-react";
import { formatUTCDate, formatUTCTime } from "@repo/ui";
import type { TrainerBookingItem } from "../../types";
import { BOOKING_TYPE_LABELS, BOOKING_STATUS_LABELS } from "../../types";

const labelCls = "mb-1 block text-xs font-medium text-foreground";
const dividerCls = "border-t-2 border-border/20 pt-3";

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

function formatParticipantStatus(value?: string | null): string {
    return value
        ? value
              .split("_")
              .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
              .join(" ")
        : "—";
}

function getInitials(name: string): string {
    return (
        name
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase() || "P"
    );
}

function ParticipantsTable({
    participants,
}: {
    participants: TrainerBookingItem["participants"];
}): JSX.Element {
    return (
        <div className="overflow-hidden rounded-lg border border-border/70 bg-background">
            <div className="flex items-center gap-2 border-b border-border/70 bg-muted/15 px-3 py-2">
                <UserRound size={14} className="text-muted-foreground" />
                <span className="text-xs font-semibold text-foreground">Participant details</span>
            </div>
            {participants.length > 0 ? (
                <div className="divide-y divide-border">
                    {participants.map((participant) => (
                        <div
                            key={participant.user_id}
                            className="flex items-center gap-3 px-3 py-2.5"
                        >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
                                {getInitials(participant.full_name)}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-foreground">
                                    {participant.full_name}
                                </p>
                                <p className="truncate text-[11px] text-muted-foreground">
                                    {participant.email}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                    <span className="capitalize">
                                        {formatParticipantStatus(participant.role)}
                                    </span>
                                    <span className="mx-1.5 opacity-40">&middot;</span>
                                    <span className="text-muted-foreground/60">Invite:</span>{" "}
                                    <span className="capitalize">
                                        {formatParticipantStatus(participant.invite_status)}
                                    </span>
                                    <span className="mx-1.5 opacity-40">&middot;</span>
                                    <span className="text-muted-foreground/60">Payment:</span>{" "}
                                    <span className="capitalize">
                                        {formatParticipantStatus(participant.payment_status)}
                                    </span>
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                    No participants found.
                </div>
            )}
        </div>
    );
}

type Props = {
    booking: TrainerBookingItem;
    onClose: () => void;
};

export function TrainerBookingDetailModal({ booking, onClose }: Props): JSX.Element {
    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div
                className="flex w-full max-w-2xl flex-col rounded-2xl border border-border bg-card shadow-2xl"
                style={{ height: "90vh" }}
                role="dialog"
                aria-modal="true"
                aria-label="Booking details"
            >
                <div className="flex h-full flex-col overflow-hidden rounded-xl bg-card">
                    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-2.5">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-base font-semibold tracking-tight text-foreground">
                                    {booking.court_name}
                                </h2>
                                <BookingStatusBadge status={booking.status} />
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close modal"
                            className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        >
                            <X size={16} />
                        </button>
                    </header>

                    <main className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-3">
                        <div className="overflow-hidden rounded-lg border border-border/70 bg-background">
                            <div className="flex items-center justify-between border-b border-border/50 px-4 py-2.5">
                                <span className="text-xs font-medium text-muted-foreground">
                                    Court
                                </span>
                                <span className="text-sm font-medium text-foreground">
                                    {booking.court_name}
                                </span>
                            </div>
                            <div className="flex items-center justify-between border-b border-border/50 px-4 py-2.5">
                                <span className="text-xs font-medium text-muted-foreground">
                                    Type
                                </span>
                                <span className="text-sm font-medium text-foreground">
                                    {BOOKING_TYPE_LABELS[booking.booking_type] ??
                                        booking.booking_type}
                                </span>
                            </div>
                            <div className="flex items-center justify-between border-b border-border/50 px-4 py-2.5">
                                <span className="text-xs font-medium text-muted-foreground">
                                    Participants
                                </span>
                                <span className="text-sm font-medium text-foreground">
                                    {booking.participants.length}
                                </span>
                            </div>
                            <div className="flex items-center justify-between border-b border-border/50 px-4 py-2.5">
                                <span className="text-xs font-medium text-muted-foreground">
                                    Date
                                </span>
                                <span className="text-sm font-medium text-foreground">
                                    {formatUTCDate(booking.start_datetime)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between px-4 py-2.5">
                                <span className="text-xs font-medium text-muted-foreground">
                                    Time
                                </span>
                                <span className="text-sm font-medium text-foreground">
                                    {formatUTCTime(booking.start_datetime)} –{" "}
                                    {formatUTCTime(booking.end_datetime)}
                                </span>
                            </div>
                        </div>

                        <section className={`space-y-2 ${dividerCls}`}>
                            <div className="flex items-center justify-between gap-2">
                                <p className={labelCls}>Participants</p>
                                <span className="inline-flex h-6 items-center rounded-full bg-cta/10 px-2.5 text-[11px] font-semibold text-cta ring-1 ring-cta/20">
                                    {booking.participants.length}
                                </span>
                            </div>
                            <ParticipantsTable participants={booking.participants} />
                        </section>
                    </main>

                    <footer className="flex shrink-0 items-center justify-end border-t border-border px-5 py-2.5">
                        <button type="button" onClick={onClose} className="btn-outline">
                            Close
                        </button>
                    </footer>
                </div>
            </div>
        </div>,
        document.body
    );
}

export function useBookingDetailModal() {
    const [selectedBooking, setSelectedBooking] = useState<TrainerBookingItem | null>(null);
    return {
        selectedBooking,
        openBooking: setSelectedBooking,
        closeBooking: () => setSelectedBooking(null),
    };
}
