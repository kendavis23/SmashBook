import {
    useState,
    useMemo,
    useEffect,
    useRef,
    type FormEvent,
    type JSX,
    type ReactNode,
    type RefObject,
} from "react";
import { createPortal } from "react-dom";
import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Eye,
    CreditCard,
    X,
    Check,
    UserPlus,
    ChevronDown,
} from "lucide-react";
import { AlertToast, formatUTCDate, formatUTCTime, formatCurrency } from "@repo/ui";
import type { PlayerBookingItem, InviteStatus } from "../../types";
import { PlayerAutocomplete } from "../../components/PlayerAutocomplete";

const PAGE_SIZE = 10;

const STATUS_STYLES: Record<string, string> = {
    confirmed: "bg-success/20 text-success",
    pending: "bg-warning/20 text-warning",
    cancelled: "bg-destructive/20 text-destructive",
    completed: "bg-muted text-muted-foreground",
};

function useOutsideClick(ref: RefObject<HTMLElement | null>, onClose: () => void) {
    useEffect(() => {
        function handler(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                onClose();
            }
        }
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [ref, onClose]);
}

function FixedDialog({
    anchorRef,
    children,
    dialogRef,
}: {
    anchorRef: RefObject<HTMLElement | null>;
    children: ReactNode;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dialogRef: RefObject<any>;
}): JSX.Element {
    const [pos, setPos] = useState({ top: 0, left: 0 });

    useEffect(() => {
        if (!anchorRef.current) return;
        const rect = anchorRef.current.getBoundingClientRect();
        const DIALOG_WIDTH = 300;
        const DIALOG_HEIGHT = 200;

        const spaceRight = window.innerWidth - rect.left;
        const left =
            spaceRight < DIALOG_WIDTH
                ? Math.max(8, rect.right + window.scrollX - DIALOG_WIDTH)
                : rect.left + window.scrollX;

        const spaceBelow = window.innerHeight - rect.bottom;
        const top =
            spaceBelow < DIALOG_HEIGHT
                ? rect.top + window.scrollY - DIALOG_HEIGHT - 8
                : rect.bottom + window.scrollY + 8;

        setPos({ top, left });
    }, [anchorRef]);

    return createPortal(
        <div
            ref={dialogRef}
            style={{ position: "absolute", top: pos.top, left: pos.left, zIndex: 9999 }}
        >
            {children}
        </div>,
        document.body
    );
}

function InviteDialog({
    booking,
    anchorRef,
    onInvite,
    onClose,
    onSuccess,
}: {
    booking: PlayerBookingItem;
    anchorRef: RefObject<HTMLElement | null>;
    onInvite: (item: PlayerBookingItem, userId: string) => Promise<void>;
    onClose: () => void;
    onSuccess: (msg: string) => void;
}): JSX.Element {
    const [userId, setUserId] = useState("");
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState("");
    const dialogRef = useRef<HTMLDivElement>(null);
    useOutsideClick(dialogRef, onClose);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        const trimmed = userId.trim();
        if (!trimmed) return;
        setBusy(true);
        setErr("");
        try {
            await onInvite(booking, trimmed);
            onClose();
            onSuccess("Invitation has been sent!");
        } catch (ex) {
            setErr((ex as { message?: string })?.message ?? "Failed to invite.");
            setBusy(false);
        }
    }

    return (
        <FixedDialog anchorRef={anchorRef} dialogRef={dialogRef}>
            <div className="w-80 overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
                <div className="flex items-center gap-2.5 border-b border-border bg-muted/20 px-4 py-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cta/10 text-cta">
                        <UserPlus size={14} />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">Invite a Player</p>
                        <p className="text-[11px] text-muted-foreground">{booking.court_name}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                        <X size={13} />
                    </button>
                </div>
                <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3 p-4">
                    <PlayerAutocomplete
                        inputId={`invite-player-${booking.booking_id}`}
                        label="Search player"
                        clubId={booking.club_id}
                        value={userId}
                        onChange={setUserId}
                        disabled={busy}
                    />
                    {err ? (
                        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-[11px] text-destructive">
                            {err}
                        </p>
                    ) : null}
                    <button
                        type="submit"
                        disabled={busy || !userId.trim()}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-cta px-4 py-2.5 text-sm font-medium text-cta-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
                    >
                        {busy ? (
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-cta-foreground border-t-transparent" />
                        ) : (
                            <UserPlus size={14} />
                        )}
                        Send Invitation
                    </button>
                </form>
            </div>
        </FixedDialog>
    );
}

function RespondDialog({
    booking,
    anchorRef,
    onRespond,
    onClose,
    onSuccess,
}: {
    booking: PlayerBookingItem;
    anchorRef: RefObject<HTMLElement | null>;
    onRespond: (
        item: PlayerBookingItem,
        action: Extract<InviteStatus, "accepted" | "declined">
    ) => Promise<void>;
    onClose: () => void;
    onSuccess: (msg: string, variant: "success" | "error") => void;
}): JSX.Element {
    const [busy, setBusy] = useState<"accepted" | "declined" | null>(null);
    const [err, setErr] = useState("");
    const dialogRef = useRef<HTMLDivElement>(null);
    useOutsideClick(dialogRef, onClose);

    async function handleAction(action: Extract<InviteStatus, "accepted" | "declined">) {
        setBusy(action);
        setErr("");
        try {
            await onRespond(booking, action);
            onClose();
            onSuccess(
                action === "accepted" ? "Invite accepted!" : "Invite declined.",
                action === "accepted" ? "success" : "error"
            );
        } catch (ex) {
            setErr((ex as { message?: string })?.message ?? "Failed to respond.");
            setBusy(null);
        }
    }

    return (
        <FixedDialog anchorRef={anchorRef} dialogRef={dialogRef}>
            <div className="w-72 overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
                <div className="border-b border-border bg-muted/20 px-4 py-3">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground">Respond to Invite</p>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        >
                            <X size={13} />
                        </button>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {booking.court_name} · {formatUTCDate(booking.start_datetime)}
                    </p>
                </div>
                <div className="flex flex-col gap-3 p-4">
                    <p className="text-xs text-muted-foreground">
                        You&apos;ve been invited to join this booking. Would you like to accept or decline?
                    </p>
                    {err ? (
                        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-[11px] text-destructive">
                            {err}
                        </p>
                    ) : null}
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            disabled={busy !== null}
                            onClick={() => void handleAction("accepted")}
                            className="flex items-center justify-center gap-1.5 rounded-xl bg-success px-3 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
                        >
                            {busy === "accepted" ? (
                                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            ) : (
                                <Check size={13} />
                            )}
                            Accept
                        </button>
                        <button
                            type="button"
                            disabled={busy !== null}
                            onClick={() => void handleAction("declined")}
                            className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2.5 text-xs font-semibold text-muted-foreground shadow-sm transition hover:bg-muted hover:text-foreground disabled:opacity-50"
                        >
                            {busy === "declined" ? (
                                <span className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                            ) : (
                                <X size={13} />
                            )}
                            Decline
                        </button>
                    </div>
                </div>
            </div>
        </FixedDialog>
    );
}

type ToastState = { message: string; variant: "success" | "error" } | null;

function InviteCell({
    booking,
    allowActions,
    onInvitePlayer,
    onRespondInvite,
}: {
    booking: PlayerBookingItem;
    allowActions: boolean;
    onInvitePlayer: (item: PlayerBookingItem, userId: string) => Promise<void>;
    onRespondInvite: (
        item: PlayerBookingItem,
        action: Extract<InviteStatus, "accepted" | "declined">
    ) => Promise<void>;
}): JSX.Element {
    const [open, setOpen] = useState(false);
    const [toast, setToast] = useState<ToastState>(null);
    const anchorRef = useRef<HTMLButtonElement>(null);
    const isOrganiser = booking.role === "organiser";
    const isPending = booking.invite_status === "pending";
    const canInvite = allowActions && isOrganiser && booking.status === "pending";
    const canRespond = allowActions && isPending;

    return (
        <>
            {toast ? (
                <AlertToast
                    title={toast.message}
                    variant={toast.variant}
                    duration={4000}
                    onClose={() => setToast(null)}
                />
            ) : null}
            <div className="flex items-center gap-1.5">
                {booking.invite_status === "accepted" ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success">
                        <Check size={10} />
                        Accepted
                    </span>
                ) : booking.invite_status === "declined" ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-destructive">
                        <X size={10} />
                        Declined
                    </span>
                ) : isPending ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-warning">
                        <span className="relative flex h-1.5 w-1.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning opacity-60" />
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-warning" />
                        </span>
                        Pending
                    </span>
                ) : (
                    <span className="text-[11px] text-muted-foreground">—</span>
                )}

                {canInvite || canRespond ? (
                    <div className="relative">
                        <button
                            ref={anchorRef}
                            type="button"
                            onClick={() => setOpen((v) => !v)}
                            title={canInvite ? "Invite a player" : "Accept or decline this invite"}
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-md border transition ${
                                canRespond
                                    ? "border-warning/40 bg-warning/10 text-warning hover:bg-warning/20"
                                    : "border-cta/30 bg-cta/8 text-cta hover:bg-cta/15"
                            }`}
                        >
                            {canInvite ? <UserPlus size={11} /> : <ChevronDown size={11} />}
                        </button>
                        {open && canInvite ? (
                            <InviteDialog
                                booking={booking}
                                anchorRef={anchorRef}
                                onInvite={onInvitePlayer}
                                onClose={() => setOpen(false)}
                                onSuccess={(msg) => setToast({ message: msg, variant: "success" })}
                            />
                        ) : null}
                        {open && canRespond ? (
                            <RespondDialog
                                booking={booking}
                                anchorRef={anchorRef}
                                onRespond={onRespondInvite}
                                onClose={() => setOpen(false)}
                                onSuccess={(msg, variant) => setToast({ message: msg, variant })}
                            />
                        ) : null}
                    </div>
                ) : null}
            </div>
        </>
    );
}

type Props = {
    items: PlayerBookingItem[];
    emptyMessage: string;
    showActions: boolean;
    onManageClick: (item: PlayerBookingItem) => void;
    onInvitePlayer: (item: PlayerBookingItem, userId: string) => Promise<void>;
    onRespondInvite: (
        item: PlayerBookingItem,
        action: Extract<InviteStatus, "accepted" | "declined">
    ) => Promise<void>;
};

export default function PlayerBookingList({
    items,
    emptyMessage,
    showActions,
    onManageClick,
    onInvitePlayer,
    onRespondInvite,
}: Props): JSX.Element {
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
            <div className="overflow-x-auto" key={page}>
                <table className="w-full min-w-[700px] border-collapse">
                    <thead>
                        <tr className="border-b border-border bg-muted/30">
                            <th className={thCls}>Court</th>
                            <th className={thCls}>Type</th>
                            <th className={thCls}>Date</th>
                            <th className={thCls}>Time</th>
                            <th className={thCls}>Role</th>
                            <th className={thCls}>Invite</th>
                            <th className={thCls}>Status</th>
                            <th className={thCls}>Amount</th>
                            {showActions ? (
                                <th className={`${thCls} text-right`}>Actions</th>
                            ) : null}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {pageItems.map((booking) => {
                            const showPay =
                                booking.payment_status === "pending" &&
                                booking.invite_status === "accepted";
                            const statusStyle =
                                STATUS_STYLES[booking.status] ?? "bg-muted text-muted-foreground";
                            const isOrganiser = booking.role === "organiser";

                            return (
                                <tr key={booking.booking_id} className="transition hover:bg-muted/20">
                                    <td className={tdCls}>
                                        <span className="font-medium text-foreground">
                                            {booking.court_name}
                                        </span>
                                    </td>

                                    <td className={tdCls}>
                                        <span className="capitalize text-muted-foreground">
                                            {booking.booking_type.replace(/_/g, " ")}
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
                                        <span
                                            title={isOrganiser ? "Organiser" : "Player"}
                                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                                isOrganiser
                                                    ? "bg-cta/10 text-cta"
                                                    : "bg-secondary text-secondary-foreground"
                                            }`}
                                        >
                                            {isOrganiser ? "Organiser" : "Player"}
                                        </span>
                                    </td>

                                    <td className={tdCls}>
                                        <InviteCell
                                            booking={booking}
                                            allowActions={showActions}
                                            onInvitePlayer={onInvitePlayer}
                                            onRespondInvite={onRespondInvite}
                                        />
                                    </td>

                                    <td className={tdCls}>
                                        <span
                                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusStyle}`}
                                        >
                                            {booking.status}
                                        </span>
                                    </td>

                                    <td className={tdCls}>
                                        <span className="text-foreground">
                                            {formatCurrency(booking.amount_due)}
                                        </span>
                                    </td>

                                    {showActions ? (
                                        <td className={`${tdCls} text-right`}>
                                            <div className="inline-flex items-center gap-1.5">
                                                {showPay ? (
                                                    <button
                                                        type="button"
                                                        title="Pay now"
                                                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground transition hover:bg-muted"
                                                    >
                                                        <CreditCard size={13} /> Pay
                                                    </button>
                                                ) : null}
                                                <button
                                                    type="button"
                                                    onClick={() => onManageClick(booking)}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground transition hover:bg-muted"
                                                    aria-label={`View booking on ${booking.court_name}`}
                                                    title="View details"
                                                >
                                                    <Eye size={13} /> View
                                                </button>
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
