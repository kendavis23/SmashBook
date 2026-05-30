import { useState, useMemo, useEffect, useRef, type JSX, type FormEvent } from "react";
import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Eye,
    CreditCard,
    UserPlus,
    X,
    Clock,
    CheckCircle,
} from "lucide-react";
import { formatUTCDate, formatUTCTime, formatCurrency, AlertToast } from "@repo/ui";
import type { PlayerBookingItem, InviteStatus } from "../../types";
import { PlayerAutocomplete } from "../../components/PlayerAutocomplete";

const PAGE_SIZE = 10;

type Props = {
    items: PlayerBookingItem[];
    emptyMessage: string;
    showActions: boolean;
    onManageClick: (item: PlayerBookingItem) => void;
    onPayClick: (item: PlayerBookingItem) => void;
    onInvitePlayer: (item: PlayerBookingItem, userId: string) => Promise<void>;
    onRespondInvite: (
        item: PlayerBookingItem,
        action: Extract<InviteStatus, "accepted" | "declined">
    ) => Promise<void>;
};

function buildPageWindow(current: number, total: number): (number | "...")[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i);

    const result: (number | "...")[] = [];
    const EDGE = 2;
    const WING = 1;

    const leftEdge = new Set(Array.from({ length: EDGE }, (_, i) => i));
    const rightEdge = new Set(Array.from({ length: EDGE }, (_, i) => total - 1 - i));
    const middle = new Set(
        Array.from({ length: WING * 2 + 1 }, (_, i) => current - WING + i).filter(
            (p) => p >= 0 && p < total
        )
    );
    const visible = new Set([...leftEdge, ...middle, ...rightEdge]);

    let prev = -1;
    for (const p of Array.from(visible).sort((a, b) => a - b)) {
        if (prev !== -1 && p - prev > 1) result.push("...");
        result.push(p);
        prev = p;
    }
    return result;
}

type InviteDialogProps = {
    booking: PlayerBookingItem;
    onInvite: (item: PlayerBookingItem, userId: string) => Promise<void>;
    onClose: () => void;
};

function InviteDialog({ booking, onInvite, onClose }: InviteDialogProps): JSX.Element {
    const [selectedPlayerId, setSelectedPlayerId] = useState("");
    const [selectedPlayerName, setSelectedPlayerName] = useState("");
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const dialogRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleOutside(e: MouseEvent) {
            if (!busy && dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
                onClose();
            }
        }
        document.addEventListener("mousedown", handleOutside);
        return () => document.removeEventListener("mousedown", handleOutside);
    }, [onClose, busy]);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (!selectedPlayerId) return;
        setBusy(true);
        setErr("");
        try {
            await onInvite(booking, selectedPlayerId);
            setBusy(false);
            setSuccessMsg(`${selectedPlayerName} has been invited successfully!`);
        } catch (ex) {
            setBusy(false);
            setErr((ex as { message?: string })?.message ?? "Failed to invite.");
        }
    }

    return (
        <>
            {successMsg ? (
                <AlertToast
                    title="Invitation sent!"
                    description={successMsg}
                    variant="success"
                    onClose={onClose}
                />
            ) : null}
            {err ? (
                <AlertToast
                    title="Failed to send invitation"
                    description={err}
                    variant="error"
                    onClose={() => setErr("")}
                />
            ) : null}
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
                <div
                    ref={dialogRef}
                    className="w-[22rem] rounded-2xl border border-border bg-card shadow-2xl"
                >
                    {/* Header with gradient accent */}
                    <div className="relative overflow-hidden bg-gradient-to-br from-cta/10 via-cta/5 to-transparent px-5 pt-5 pb-4">
                        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-cta/8" />
                        <div className="absolute -right-2 -top-2 h-12 w-12 rounded-full bg-cta/10" />
                        <div className="relative flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cta text-cta-foreground shadow-sm">
                                    <UserPlus size={18} />
                                </div>
                                <div>
                                    <p className="text-base font-semibold text-foreground">
                                        Invite a Player
                                    </p>
                                    <p className="mt-0.5 text-sm font-medium text-cta">
                                        {booking.court_name}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                            >
                                <X size={14} />
                            </button>
                        </div>
                        {/* Date + time pills */}
                        <div className="relative mt-3 flex flex-wrap gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/70 px-3 py-1 text-xs font-medium text-muted-foreground">
                                <CalendarDays size={11} />
                                {formatUTCDate(booking.start_datetime)}
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/70 px-3 py-1 text-xs font-medium text-muted-foreground">
                                <Clock size={11} />
                                {formatUTCTime(booking.start_datetime)} –{" "}
                                {formatUTCTime(booking.end_datetime)}
                            </span>
                        </div>
                    </div>

                    <div className="border-t border-border" />

                    {/* Form body */}
                    <form
                        onSubmit={(e) => void handleSubmit(e)}
                        className="flex flex-col gap-3 p-5"
                    >
                        <div>
                            <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Search player
                            </p>
                            {selectedPlayerName ? (
                                <div className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                                    <span className="text-sm text-foreground">
                                        {selectedPlayerName}
                                    </span>
                                    <button
                                        type="button"
                                        aria-label="Remove selected player"
                                        onClick={() => {
                                            setSelectedPlayerId("");
                                            setSelectedPlayerName("");
                                        }}
                                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                                    >
                                        <X size={11} />
                                    </button>
                                </div>
                            ) : (
                                <PlayerAutocomplete
                                    inputId={`invite-player-${booking.booking_id}`}
                                    label="Search player"
                                    clubId={booking.club_id}
                                    value={selectedPlayerId}
                                    onChange={(v) => {
                                        if (!v) {
                                            setSelectedPlayerId("");
                                            setSelectedPlayerName("");
                                        }
                                    }}
                                    onSelect={(player) => {
                                        setSelectedPlayerId(player.id);
                                        setSelectedPlayerName(player.full_name);
                                    }}
                                    disabled={busy}
                                />
                            )}
                        </div>
                        <button
                            type="submit"
                            disabled={busy || !selectedPlayerId}
                            className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-cta px-4 py-2.5 text-sm font-semibold text-cta-foreground shadow-sm transition hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
                        >
                            {busy ? (
                                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-cta-foreground border-t-transparent" />
                            ) : (
                                <UserPlus size={15} />
                            )}
                            Send Invitation
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
}

type InviteToast = { variant: "success" | "error"; title: string; description: string };

export default function PlayerBookingList({
    items,
    emptyMessage,
    showActions,
    onManageClick,
    onPayClick,
    onInvitePlayer,
    onRespondInvite,
}: Props): JSX.Element {
    const [page, setPage] = useState(0);
    const [inviteBooking, setInviteBooking] = useState<PlayerBookingItem | null>(null);
    const [respondToast, setRespondToast] = useState<InviteToast | null>(null);

    async function handleRespond(
        booking: PlayerBookingItem,
        action: Extract<InviteStatus, "accepted" | "declined">
    ) {
        try {
            await onRespondInvite(booking, action);
            setRespondToast({
                variant: "success",
                title: action === "accepted" ? "Invite accepted!" : "Invite declined",
                description:
                    action === "accepted"
                        ? `You've accepted the invite for ${booking.court_name}. Complete payment to confirm your spot before the hold expires.`
                        : `You've declined the invite for ${booking.court_name}.`,
            });
        } catch (ex) {
            setRespondToast({
                variant: "error",
                title: "Failed to respond",
                description: (ex as { message?: string })?.message ?? "Something went wrong.",
            });
        }
    }
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
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground/50">
                    <CalendarDays size={24} />
                </div>
                <p className="text-sm font-medium text-foreground">{emptyMessage}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                    Your bookings will appear here once made.
                </p>
            </div>
        );
    }

    const thCls =
        "px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap";
    const tdCls = "px-3 py-3 text-sm text-foreground align-top";

    return (
        <>
            {respondToast ? (
                <AlertToast
                    title={respondToast.title}
                    description={respondToast.description}
                    variant={respondToast.variant}
                    onClose={() => setRespondToast(null)}
                />
            ) : null}
            {inviteBooking ? (
                <InviteDialog
                    booking={inviteBooking}
                    onInvite={onInvitePlayer}
                    onClose={() => setInviteBooking(null)}
                />
            ) : null}

            <div className="overflow-x-auto" key={`table-${page}`}>
                <table className="w-full min-w-[700px] border-collapse">
                    <thead>
                        <tr className="border-b border-border bg-muted/30">
                            <th className={thCls}>Court</th>
                            <th className={thCls}>Date</th>
                            <th className={thCls}>Time</th>
                            <th className={thCls}>Role</th>
                            <th className={thCls}>Type</th>
                            <th className={thCls}>Status</th>
                            <th className={thCls}>Amount</th>
                            {showActions ? (
                                <th className={`${thCls} text-right`}>Actions</th>
                            ) : null}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {pageItems.map((booking) => {
                            const showPay = booking.payment_status !== "paid";
                            const isOrganiser = booking.role === "organiser";
                            const isPendingInvite =
                                !isOrganiser && booking.invite_status === "pending";
                            const isDeclinedInvite =
                                !isOrganiser && booking.invite_status === "declined";

                            return (
                                <tr
                                    key={booking.booking_id}
                                    className="transition hover:bg-muted/20"
                                >
                                    <td className={tdCls}>
                                        <span className="font-medium text-foreground">
                                            {booking.court_name}
                                        </span>
                                    </td>

                                    <td className={tdCls}>
                                        <span className="whitespace-nowrap text-muted-foreground">
                                            {formatUTCDate(booking.start_datetime)}
                                        </span>
                                    </td>

                                    <td className={tdCls}>
                                        <span className="whitespace-nowrap text-muted-foreground">
                                            {formatUTCTime(booking.start_datetime)} –{" "}
                                            {formatUTCTime(booking.end_datetime)}
                                        </span>
                                    </td>

                                    <td className={tdCls}>
                                        <span className="text-muted-foreground">
                                            {isOrganiser ? "Organiser" : "Player"}
                                        </span>
                                    </td>

                                    <td className={tdCls}>
                                        <span className="capitalize text-muted-foreground">
                                            {booking.booking_type.replace(/_/g, " ")}
                                        </span>
                                    </td>

                                    <td className={tdCls}>
                                        <span className="capitalize text-muted-foreground">
                                            {isDeclinedInvite ? "—" : booking.status}
                                        </span>
                                    </td>

                                    <td className={tdCls}>
                                        <span className="capitalize text-muted-foreground">
                                            {isDeclinedInvite
                                                ? "—"
                                                : formatCurrency(booking.amount_due)}
                                        </span>
                                    </td>

                                    {showActions ? (
                                        <td className={`${tdCls} text-right`}>
                                            <div className="inline-flex items-center gap-1.5">
                                                {isDeclinedInvite ? (
                                                    <span className="text-xs text-muted-foreground italic">
                                                        Invitation no longer available
                                                    </span>
                                                ) : isPendingInvite ? (
                                                    <>
                                                        <button
                                                            type="button"
                                                            title="Accept invite"
                                                            onClick={() =>
                                                                void handleRespond(
                                                                    booking,
                                                                    "accepted"
                                                                )
                                                            }
                                                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-success px-2.5 py-1.5 text-xs text-success-foreground transition hover:opacity-90"
                                                        >
                                                            <CheckCircle size={13} /> Accept
                                                        </button>
                                                        <button
                                                            type="button"
                                                            title="Decline invite"
                                                            onClick={() =>
                                                                void handleRespond(
                                                                    booking,
                                                                    "declined"
                                                                )
                                                            }
                                                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground transition hover:bg-muted"
                                                        >
                                                            <X size={13} /> Decline
                                                        </button>
                                                    </>
                                                ) : showPay ? (
                                                    <button
                                                        type="button"
                                                        title="Pay now"
                                                        onClick={() => onPayClick(booking)}
                                                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-cta px-2.5 py-1.5 text-xs text-cta-foreground transition hover:bg-cta/90"
                                                    >
                                                        <CreditCard size={13} /> Pay Now
                                                    </button>
                                                ) : (
                                                    <>
                                                        {isOrganiser &&
                                                        booking.status === "pending" ? (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setInviteBooking(booking)
                                                                }
                                                                className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground transition hover:bg-muted"
                                                                title="Invite player"
                                                            >
                                                                <UserPlus size={13} /> Invite Player
                                                            </button>
                                                        ) : null}
                                                        <button
                                                            type="button"
                                                            onClick={() => onManageClick(booking)}
                                                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-foreground transition hover:bg-muted"
                                                            aria-label={`View booking on ${booking.court_name}`}
                                                            title="View details"
                                                        >
                                                            <Eye size={13} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    ) : null}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 ? (
                <div className="flex items-center justify-between border-t border-border px-5 py-3 sm:px-6">
                    <span className="text-xs text-muted-foreground">
                        Showing {page * PAGE_SIZE + 1}–
                        {Math.min((page + 1) * PAGE_SIZE, items.length)} of {items.length}
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
                        {buildPageWindow(page, totalPages).map((entry, idx) =>
                            entry === "..." ? (
                                <span
                                    key={`ellipsis-${idx}`}
                                    className="inline-flex h-8 w-6 items-center justify-center text-xs text-muted-foreground"
                                >
                                    …
                                </span>
                            ) : (
                                <button
                                    key={entry}
                                    onClick={() => setPage(entry)}
                                    className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-medium transition ${
                                        entry === page
                                            ? "border-cta bg-cta text-cta-foreground"
                                            : "border-border bg-card text-foreground hover:bg-muted"
                                    }`}
                                    aria-label={`Page ${entry + 1}`}
                                    aria-current={entry === page ? "page" : undefined}
                                >
                                    {entry + 1}
                                </button>
                            )
                        )}
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
