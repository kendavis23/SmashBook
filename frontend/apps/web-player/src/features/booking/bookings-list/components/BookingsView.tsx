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
    RefreshCw,
    Crown,
    User,
    CreditCard,
    X,
    Check,
    UserPlus,
} from "lucide-react";
import { Breadcrumb, AlertToast, formatUTCDate, formatUTCTime, formatCurrency } from "@repo/ui";
import type { PlayerBookingItem, BookingTab, InviteStatus } from "../../types";
import { BOOKING_TABS } from "../../types";
import { PlayerAutocomplete } from "../../components/PlayerAutocomplete";

type Props = {
    upcoming: PlayerBookingItem[];
    past: PlayerBookingItem[];
    activeTab: BookingTab;
    isLoading: boolean;
    error: Error | null;
    onTabChange: (tab: BookingTab) => void;
    onRefresh: () => void;
    onCreateClick: () => void;
    onManageClick: (item: PlayerBookingItem) => void;
    onInvitePlayer: (item: PlayerBookingItem, userId: string) => Promise<void>;
    onRespondInvite: (
        item: PlayerBookingItem,
        action: Extract<InviteStatus, "accepted" | "declined">
    ) => Promise<void>;
};

const STATUS_CLASSES: Record<string, string> = {
    confirmed: "bg-success/15 text-success",
    pending: "bg-warning/15 text-warning",
    cancelled: "bg-destructive/15 text-destructive",
    completed: "bg-secondary text-secondary-foreground",
};

const thCls =
    "px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap";
const tdCls = "px-3 py-3 text-sm text-foreground align-top";

const PAGE_SIZE = 10;

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
        const DIALOG_WIDTH = 256; // w-64
        const DIALOG_HEIGHT = 140; // approximate

        const spaceRight = window.innerWidth - rect.left;
        const left =
            spaceRight < DIALOG_WIDTH
                ? Math.max(0, rect.right + window.scrollX - DIALOG_WIDTH)
                : rect.left + window.scrollX;

        const spaceBelow = window.innerHeight - rect.bottom;
        const top =
            spaceBelow < DIALOG_HEIGHT
                ? rect.top + window.scrollY - DIALOG_HEIGHT - 4
                : rect.bottom + window.scrollY + 4;

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
            <div className="w-72 rounded-xl border border-border bg-card shadow-lg">
                <div className="flex items-center justify-between border-b border-border px-3 py-2">
                    <span className="text-xs font-semibold text-foreground">Invite Player</span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        <X size={13} />
                    </button>
                </div>
                <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-2 p-3">
                    <PlayerAutocomplete
                        inputId={`invite-player-${booking.booking_id}`}
                        label="Player"
                        clubId={booking.club_id}
                        value={userId}
                        onChange={setUserId}
                        disabled={busy}
                    />
                    {err ? <p className="text-[11px] text-destructive">{err}</p> : null}
                    <button
                        type="submit"
                        disabled={busy || !userId.trim()}
                        className="inline-flex items-center justify-center gap-1 rounded-lg bg-cta px-3 py-1.5 text-xs font-medium text-cta-foreground transition hover:opacity-90 disabled:opacity-50"
                    >
                        {busy ? (
                            <span className="h-3 w-3 animate-spin rounded-full border border-cta-foreground border-t-transparent" />
                        ) : null}
                        Send Invite
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
            <div className="w-52 rounded-xl border border-border bg-card shadow-lg">
                <div className="flex items-center justify-between border-b border-border px-3 py-2">
                    <span className="text-xs font-semibold text-foreground">Respond to Invite</span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        <X size={13} />
                    </button>
                </div>
                <div className="flex flex-col gap-2 p-3">
                    {err ? <p className="text-[11px] text-destructive">{err}</p> : null}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            disabled={busy !== null}
                            onClick={() => void handleAction("accepted")}
                            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-success/15 px-2 py-1.5 text-xs font-medium text-success transition hover:bg-success/25 disabled:opacity-50"
                        >
                            {busy === "accepted" ? (
                                <span className="h-3 w-3 animate-spin rounded-full border border-success border-t-transparent" />
                            ) : (
                                <Check size={12} />
                            )}
                            Accept
                        </button>
                        <button
                            type="button"
                            disabled={busy !== null}
                            onClick={() => void handleAction("declined")}
                            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-destructive/15 px-2 py-1.5 text-xs font-medium text-destructive transition hover:bg-destructive/25 disabled:opacity-50"
                        >
                            {busy === "declined" ? (
                                <span className="h-3 w-3 animate-spin rounded-full border border-destructive border-t-transparent" />
                            ) : (
                                <X size={12} />
                            )}
                            Decline
                        </button>
                    </div>
                </div>
            </div>
        </FixedDialog>
    );
}

function RoleCell({ booking }: { booking: PlayerBookingItem }): JSX.Element {
    const isOrganiser = booking.role === "organiser";
    return (
        <span
            title={booking.role}
            className={`inline-flex items-center justify-center rounded-full p-1 ${
                isOrganiser ? "bg-cta/10 text-cta" : "bg-secondary text-secondary-foreground"
            }`}
        >
            {isOrganiser ? <Crown size={12} /> : <User size={12} />}
        </span>
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

    if (allowActions && isOrganiser && booking.status === "pending") {
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
                <div className="relative">
                    <button
                        ref={anchorRef}
                        type="button"
                        onClick={() => setOpen((v) => !v)}
                        title="Invite a player"
                        className="inline-flex items-center gap-1 rounded-lg border border-cta/40 bg-cta/10 px-2 py-1 text-[11px] font-medium text-cta transition hover:bg-cta/20"
                    >
                        <UserPlus size={11} /> Invite
                    </button>
                    {open ? (
                        <InviteDialog
                            booking={booking}
                            anchorRef={anchorRef}
                            onInvite={onInvitePlayer}
                            onClose={() => setOpen(false)}
                            onSuccess={(msg) => setToast({ message: msg, variant: "success" })}
                        />
                    ) : null}
                </div>
            </>
        );
    }

    if (allowActions && isPending) {
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
                <div className="relative">
                    <button
                        ref={anchorRef}
                        type="button"
                        onClick={() => setOpen((v) => !v)}
                        title="Respond to invite"
                        className="inline-flex items-center gap-1 rounded-lg border border-warning/40 bg-warning/10 px-2 py-1 text-[11px] font-medium text-warning transition hover:bg-warning/20"
                    >
                        Pending
                    </button>
                    {open ? (
                        <RespondDialog
                            booking={booking}
                            anchorRef={anchorRef}
                            onRespond={onRespondInvite}
                            onClose={() => setOpen(false)}
                            onSuccess={(msg, variant) => setToast({ message: msg, variant })}
                        />
                    ) : null}
                </div>
            </>
        );
    }

    const statusText = booking.invite_status ?? "—";
    const cls =
        booking.invite_status === "accepted"
            ? "text-success"
            : booking.invite_status === "declined"
              ? "text-destructive"
              : "text-muted-foreground";

    return <span className={`text-[11px] font-medium capitalize ${cls}`}>{statusText}</span>;
}

function BookingTable({
    items,
    emptyMessage,
    showActions,
    onManageClick,
    onInvitePlayer,
    onRespondInvite,
}: {
    items: PlayerBookingItem[];
    emptyMessage: string;
    showActions: boolean;
    onManageClick: (item: PlayerBookingItem) => void;
    onInvitePlayer: (item: PlayerBookingItem, userId: string) => Promise<void>;
    onRespondInvite: (
        item: PlayerBookingItem,
        action: Extract<InviteStatus, "accepted" | "declined">
    ) => Promise<void>;
}): JSX.Element {
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
                <CalendarDays size={40} className="mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <>
            <div className="overflow-x-auto" key={page}>
                <table className="w-full min-w-[780px] border-collapse">
                    <thead>
                        <tr className="border-b border-border bg-muted/30">
                            <th className={thCls}>Court</th>
                            <th className={thCls}>Date</th>
                            <th className={thCls}>Time</th>
                            <th className={thCls}>Type</th>
                            <th className={`${thCls} text-center`}>Role</th>
                            <th className={thCls}>Invite</th>
                            <th className={thCls}>Status</th>
                            <th className={`${thCls} text-right`}>Amount</th>
                            {showActions ? <th className={`${thCls} text-right`}>Action</th> : null}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {pageItems.map((booking) => {
                            const showPay =
                                booking.payment_status === "pending" &&
                                booking.invite_status === "accepted";

                            return (
                                <tr
                                    key={booking.booking_id}
                                    className="transition hover:bg-muted/20"
                                >
                                    <td className={`${tdCls} font-medium`}>{booking.court_name}</td>
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
                                        <span className="capitalize text-muted-foreground">
                                            {booking.booking_type.replace(/_/g, " ")}
                                        </span>
                                    </td>
                                    <td className={`${tdCls} text-center`}>
                                        <RoleCell booking={booking} />
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
                                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${STATUS_CLASSES[booking.status] ?? "bg-secondary text-secondary-foreground"}`}
                                        >
                                            {booking.status}
                                        </span>
                                    </td>
                                    <td className={`${tdCls} text-right`}>
                                        <div className="inline-flex items-center justify-end gap-2">
                                            <span className="font-medium text-muted-foreground">
                                                {formatCurrency(booking.amount_due)}
                                            </span>
                                            {showPay ? (
                                                <button
                                                    type="button"
                                                    title="Pay now"
                                                    className="inline-flex items-center gap-1 rounded-lg border border-cta/40 bg-cta/10 px-2 py-1 text-[11px] font-medium text-cta transition hover:bg-cta/20"
                                                >
                                                    <CreditCard size={11} /> Pay
                                                </button>
                                            ) : null}
                                        </div>
                                    </td>
                                    {showActions ? (
                                        <td className={`${tdCls} text-right`}>
                                            <button
                                                type="button"
                                                onClick={() => onManageClick(booking)}
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-foreground transition hover:bg-muted"
                                                aria-label={`View booking on ${booking.court_name}`}
                                                title="View"
                                            >
                                                <Eye size={14} />
                                            </button>
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

export default function BookingsView({
    upcoming,
    past,
    activeTab,
    isLoading,
    error,
    onTabChange,
    onRefresh,
    onCreateClick: _onCreateClick,
    onManageClick,
    onInvitePlayer,
    onRespondInvite,
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

                <div>
                    <div className="flex gap-5 border-b border-border sm:px-2 mb-3">
                        {BOOKING_TABS.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => onTabChange(tab.id)}
                                className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-1 py-3 text-sm font-medium transition ${
                                    activeTab === tab.id
                                        ? "border-cta text-cta"
                                        : "border-transparent text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                {tab.label}
                                {tab.id === "upcoming" && upcoming.length > 0 ? (
                                    <span className="rounded-full bg-cta/10 px-1.5 py-0.5 text-[10px] font-semibold text-cta">
                                        {upcoming.length}
                                    </span>
                                ) : null}
                            </button>
                        ))}
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center gap-3 py-20">
                            <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-cta" />
                            <span className="text-sm text-muted-foreground">Loading bookings…</span>
                        </div>
                    ) : (
                        <BookingTable
                            items={items}
                            emptyMessage={emptyMessage}
                            showActions={activeTab === "upcoming"}
                            onManageClick={onManageClick}
                            onInvitePlayer={onInvitePlayer}
                            onRespondInvite={onRespondInvite}
                        />
                    )}
                </div>
            </section>
        </div>
    );
}
