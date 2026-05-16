import type { JSX } from "react";
import { useState } from "react";
import {
    CalendarDays,
    Check,
    ChevronLeft,
    ChevronRight,
    Clock,
    CreditCard,
    MapPin,
    RotateCcw,
    Search,
    UserPlus,
    UserRound,
    Users,
    X,
} from "lucide-react";
import { AlertToast, formatCurrency, formatUTCDate, formatUTCTime } from "@repo/ui";
import type {
    Booking,
    InviteStatus,
    PaymentStatus,
    PlayerBookingItem,
    PlayerRole,
} from "../../types";
import { PlayerAutocomplete } from "../../components/PlayerAutocomplete";

type MyInfo = {
    role: PlayerRole;
    inviteStatus: InviteStatus;
    paymentStatus: PaymentStatus;
    amountDue: number;
};

const BOOKING_STATUS_CLASSES: Record<string, string> = {
    confirmed: "border-success/20 bg-success/10 text-success",
    pending: "border-warning/20 bg-warning/10 text-warning",
    cancelled: "border-destructive/20 bg-destructive/10 text-destructive",
    completed: "border-border bg-secondary text-secondary-foreground",
};

const BOOKING_TYPE_LABELS: Record<string, string> = {
    regular: "Regular",
    lesson_individual: "Individual Lesson",
};

const labelCls = "mb-1 block text-xs font-medium text-foreground";
const dividerCls = "border-t border-border/60 pt-3";
const sectionCls = `space-y-2.5 ${dividerCls}`;

function formatDateRange(start: string, end: string): { date: string; time: string } {
    return {
        date: formatUTCDate(start),
        time: `${formatUTCTime(start)} - ${formatUTCTime(end)}`,
    };
}

function formatStatus(value?: string | null): string {
    return value
        ? value
              .split("_")
              .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
              .join(" ")
        : "-";
}

function parseDiscountAmount(value?: string | null): number {
    if (!value) return 0;
    const parsed = Number(value.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? Math.abs(parsed) : 0;
}

function parseAmount(value: number | string | null | undefined): number {
    if (value == null) return 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    const parsed = Number(value.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
}

const MODAL_PAGE_SIZE = 4;

function PlayersTable({
    players,
    myUserId,
}: {
    players: Booking["players"];
    myUserId?: string;
}): JSX.Element {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(0);

    const getInitials = (name: string): string =>
        name
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase() || "P";

    const sorted = [...players].sort((a, b) => {
        const rankA =
            myUserId != null && a.user_id === myUserId
                ? 0
                : a.role === "organiser"
                  ? 1
                  : a.invite_status === "accepted"
                    ? 2
                    : 3;
        const rankB =
            myUserId != null && b.user_id === myUserId
                ? 0
                : b.role === "organiser"
                  ? 1
                  : b.invite_status === "accepted"
                    ? 2
                    : 3;
        return rankA - rankB;
    });
    const filtered = search.trim()
        ? sorted.filter((p) => p.full_name.toLowerCase().includes(search.toLowerCase()))
        : sorted;
    const totalPages = Math.ceil(filtered.length / MODAL_PAGE_SIZE);
    const currentPage = filtered.length === 0 ? 0 : Math.min(page, totalPages - 1);
    const paged = filtered.slice(
        currentPage * MODAL_PAGE_SIZE,
        currentPage * MODAL_PAGE_SIZE + MODAL_PAGE_SIZE
    );

    return (
        <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm shadow-black/5">
            <div className="flex items-center gap-2 border-b border-border/60 bg-muted/20 px-3 py-1.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-background text-cta shadow-xs">
                    <UserRound size={13} className="shrink-0" />
                </span>
                <span className="flex-1 text-xs font-semibold text-foreground">Player details</span>
                <div className="relative">
                    <Search
                        size={11}
                        className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                        type="text"
                        placeholder="Search…"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(0);
                        }}
                        className="h-7 w-36 rounded-lg border border-border/70 bg-background py-0.5 pl-5 pr-2 text-xs text-foreground shadow-xs placeholder:text-muted-foreground focus:border-cta/50 focus:outline-none focus:ring-2 focus:ring-cta/10"
                    />
                </div>
            </div>
            <div className="divide-y divide-border/50">
                {paged.length === 0 ? (
                    <p className="py-3 text-center text-xs text-muted-foreground">
                        No players found.
                    </p>
                ) : (
                    paged.map((p) => {
                        const isMe = myUserId != null && p.user_id === myUserId;
                        const isAccepted = p.invite_status === "accepted";
                        const isPaid = p.payment_status === "paid";

                        const inviteBadgeCls = isAccepted
                            ? "bg-success/10 text-success"
                            : p.invite_status === "pending"
                              ? "bg-warning/10 text-warning"
                              : "bg-muted text-muted-foreground";

                        const payBadgeCls = isPaid
                            ? "bg-success/10 text-success"
                            : p.payment_status === "pending"
                              ? "bg-warning/10 text-warning"
                              : "bg-muted text-muted-foreground";

                        return (
                            <div
                                key={p.id}
                                className={`relative grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5 px-3 py-2.5 transition-colors hover:bg-muted/25 sm:grid-cols-[auto_minmax(0,1fr)_auto] ${isMe ? "bg-cta/5" : ""}`}
                            >
                                {isMe ? (
                                    <span className="absolute inset-y-0 left-0 w-0.5 rounded-r bg-cta" />
                                ) : null}

                                {/* Avatar */}
                                <span
                                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font ring-1 ring-inset ${
                                        isMe
                                            ? "bg-cta/15 text-cta ring-cta/20"
                                            : isAccepted
                                              ? "bg-success/10 text-success ring-success/20"
                                              : "bg-muted text-muted-foreground ring-border"
                                    }`}
                                >
                                    {getInitials(p.full_name)}
                                </span>

                                {/* Content */}
                                <div className="min-w-0 flex-1">
                                    <div className="flex min-w-0 items-baseline gap-1.5">
                                        <span className="truncate text-sm font leading-tight text-foreground">
                                            {p.full_name}
                                        </span>
                                        <span className="shrink-0 text-[11px] capitalize text-muted-foreground">
                                            ({formatStatus(p.role)})
                                        </span>
                                    </div>
                                </div>

                                <div className="col-start-2 flex flex-wrap gap-1.5 sm:col-start-auto sm:justify-end">
                                    <span
                                        className={`rounded-md px-2 py-1 text-[11px] font-medium ${inviteBadgeCls}`}
                                    >
                                        Invite: {formatStatus(p.invite_status)}
                                    </span>
                                    {isAccepted ? (
                                        <span
                                            className={`rounded-md px-2 py-1 text-[11px] font-medium ${payBadgeCls}`}
                                        >
                                            Payment: {formatStatus(p.payment_status)}
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
            {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border/60 bg-muted/15 px-3 py-1.5">
                    <span className="text-[11px] text-muted-foreground">
                        {currentPage * MODAL_PAGE_SIZE + 1}–
                        {Math.min((currentPage + 1) * MODAL_PAGE_SIZE, filtered.length)} of{" "}
                        {filtered.length}
                    </span>
                    <div className="flex items-center gap-0.5">
                        <button
                            type="button"
                            onClick={() => setPage(currentPage - 1)}
                            disabled={currentPage === 0}
                            className="rounded-md p-1 text-muted-foreground transition hover:bg-background hover:text-foreground disabled:opacity-40"
                        >
                            <ChevronLeft size={13} />
                        </button>
                        <span className="min-w-[2.5rem] text-center text-[11px] text-muted-foreground">
                            {currentPage + 1} / {totalPages}
                        </span>
                        <button
                            type="button"
                            onClick={() => setPage(currentPage + 1)}
                            disabled={currentPage >= totalPages - 1}
                            className="rounded-md p-1 text-muted-foreground transition hover:bg-background hover:text-foreground disabled:opacity-40"
                        >
                            <ChevronRight size={13} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

type Props = {
    booking: Booking;
    playerRole: PlayerRole;
    myInfo?: MyInfo;
    myUserId?: string;
    apiError: string;
    isInvitePending: boolean;
    isRespondPending: boolean;
    onInvitePlayer: (userId: string) => void;
    onRespondInvite: (action: Extract<InviteStatus, "accepted" | "declined">) => void;
    onPayClick?: (item: PlayerBookingItem) => void;
    onDismissError: () => void;
    onRefresh: () => void;
    clubId?: string | null;
    onClose: () => void;
};

export function ManageBookingModalView({
    booking,
    playerRole,
    myInfo,
    myUserId,
    apiError,
    isInvitePending,
    isRespondPending,
    onInvitePlayer,
    onRespondInvite,
    onPayClick,
    onDismissError,
    onRefresh,
    clubId,
    onClose,
}: Props): JSX.Element {
    const [inviteId, setInviteId] = useState("");

    const statusCls =
        BOOKING_STATUS_CLASSES[booking.status] ?? "bg-secondary text-secondary-foreground";
    const myInviteStatus = myInfo?.inviteStatus ?? null;
    const myPaymentStatus = myInfo?.paymentStatus ?? null;
    const payableBooking: PlayerBookingItem | null =
        myInfo && myInviteStatus === "accepted" && myPaymentStatus === "pending"
            ? {
                  booking_id: booking.id,
                  club_id: booking.club_id,
                  court_id: booking.court_id,
                  court_name: booking.court_name,
                  booking_type: booking.booking_type,
                  status: booking.status,
                  start_datetime: booking.start_datetime,
                  end_datetime: booking.end_datetime,
                  role: myInfo.role,
                  invite_status: myInfo.inviteStatus,
                  payment_status: myInfo.paymentStatus,
                  amount_due: myInfo.amountDue,
              }
            : null;
    const showPayCta = payableBooking != null && onPayClick != null;
    const bookingTypeLabel =
        BOOKING_TYPE_LABELS[booking.booking_type] ?? booking.booking_type.replace(/_/g, " ");

    return (
        <div className="flex h-full w-full flex-col bg-card">
            <header className="relative flex shrink-0 items-center justify-between gap-3 overflow-hidden border-b border-border/70 bg-muted/20 px-5 py-3">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cta/10 text-cta ring-1 ring-cta/15">
                            <MapPin size={15} />
                        </span>
                        <h2 className="min-w-0 truncate text-base font-bold tracking-tight text-foreground">
                            {booking.court_name}
                        </h2>
                        <span
                            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold capitalize shadow-xs ${statusCls}`}
                        >
                            {booking.status}
                        </span>
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                    <button
                        type="button"
                        onClick={onRefresh}
                        aria-label="Refresh booking"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-background hover:text-foreground"
                    >
                        <RotateCcw size={15} />
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close modal"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-background hover:text-foreground"
                    >
                        <X size={16} />
                    </button>
                </div>
            </header>

            <main className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-3.5">
                {apiError ? (
                    <AlertToast title={apiError} variant="error" onClose={onDismissError} />
                ) : null}

                <div className="space-y-2.5">
                    <p className={labelCls}>Match Information</p>
                    <div className="grid grid-cols-2 gap-2">
                        {(() => {
                            const { date, time } = formatDateRange(
                                booking.start_datetime,
                                booking.end_datetime
                            );
                            const playersValue =
                                booking.max_players != null
                                    ? `${booking.max_players - booking.slots_available} / ${booking.max_players}`
                                    : String(booking.players.length);
                            const items = [
                                {
                                    icon: <MapPin size={13} />,
                                    label: "Court",
                                    value: booking.court_name,
                                    color: "text-violet-600",
                                    bg: "bg-violet-500/10",
                                    ring: "ring-violet-500/15",
                                },
                                {
                                    icon: <CalendarDays size={13} />,
                                    label: "Date",
                                    value: date,
                                    color: "text-blue-600",
                                    bg: "bg-blue-500/10",
                                    ring: "ring-blue-500/15",
                                },
                                {
                                    icon: <Clock size={13} />,
                                    label: "Time",
                                    value: time,
                                    color: "text-amber-600",
                                    bg: "bg-amber-500/10",
                                    ring: "ring-amber-500/15",
                                },
                                {
                                    icon: <span className="text-xs font-bold leading-none">£</span>,
                                    label: "Total",
                                    value: formatCurrency(booking.total_price) ?? "—",
                                    color: "text-emerald-600",
                                    bg: "bg-emerald-500/10",
                                    ring: "ring-emerald-500/15",
                                },
                                {
                                    icon: <Users size={13} />,
                                    label: "Players",
                                    value: playersValue,
                                    color: "text-pink-600",
                                    bg: "bg-pink-500/10",
                                    ring: "ring-pink-500/15",
                                },
                                {
                                    icon: <CalendarDays size={13} />,
                                    label: "Type",
                                    value: bookingTypeLabel,
                                    color: "text-cta",
                                    bg: "bg-cta/10",
                                    ring: "ring-cta/15",
                                },
                            ];
                            return items.map(({ icon, label, value, color, bg, ring }) => (
                                <div
                                    key={label}
                                    className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5"
                                >
                                    <div
                                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${bg} ${color} ${ring}`}
                                    >
                                        {icon}
                                    </div>
                                    <div className="min-w-0 flex flex-col gap-0.5">
                                        <span className="text-[9px] font uppercase tracking-wider text-muted-foreground">
                                            {label}
                                        </span>
                                        <span className="truncate text-sm font leading-tight text-foreground">
                                            {value}
                                        </span>
                                    </div>
                                </div>
                            ));
                        })()}
                    </div>
                </div>

                {myInfo && myInfo.inviteStatus === "accepted" ? (
                    <section className={sectionCls}>
                        <p className={labelCls}>Payment Information</p>
                        <span className="sr-only">{formatStatus(myInfo.inviteStatus)}</span>
                        <div className="overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm shadow-black/5">
                            <div className="grid grid-cols-3 divide-x divide-border/60">
                                {(() => {
                                    const currentPlayer = booking.players.find(
                                        (pl) => pl.user_id === myUserId
                                    );
                                    const discountValue = parseDiscountAmount(
                                        currentPlayer?.discount_amount
                                    );
                                    const amountDue = parseAmount(myInfo.amountDue);
                                    const hasDiscount = discountValue > 0;
                                    const originalPrice = amountDue + discountValue;
                                    const discountSource = currentPlayer?.discount_source;
                                    const isPaid = myInfo.paymentStatus === "paid";
                                    return (
                                        <>
                                            <div className="flex flex-col items-start gap-1 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                                                <span className="whitespace-nowrap text-[10px] font uppercase tracking-wider text-muted-foreground">
                                                    Original price
                                                </span>
                                                <span
                                                    className={`text-sm font ${hasDiscount ? "text-muted-foreground line-through" : "text-foreground"}`}
                                                >
                                                    {formatCurrency(originalPrice)}
                                                </span>
                                            </div>
                                            <div className="flex flex-col items-start gap-1 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                                                <span className="whitespace-nowrap text-[10px] font uppercase tracking-wider text-muted-foreground">
                                                    {hasDiscount
                                                        ? (discountSource ?? "Discount")
                                                        : "Discount"}
                                                </span>
                                                {hasDiscount ? (
                                                    <span className="text-sm font-semibold text-cta">
                                                        -{formatCurrency(discountValue)}
                                                    </span>
                                                ) : (
                                                    <span className="text-sm font-semibold text-muted-foreground">
                                                        —
                                                    </span>
                                                )}
                                            </div>
                                            {showPayCta ? (
                                                <button
                                                    type="button"
                                                    aria-label="Pay now"
                                                    onClick={() => {
                                                        if (payableBooking)
                                                            onPayClick?.(payableBooking);
                                                    }}
                                                    className="flex w-full cursor-pointer flex-col items-start gap-1 bg-cta px-3 py-2.5 text-left shadow-inner transition-colors hover:bg-cta/90 active:bg-cta/80 sm:flex-row sm:items-center sm:justify-between sm:gap-2"
                                                >
                                                    <span className="flex items-center gap-1 whitespace-nowrap text-[10px] font-semibold uppercase tracking-wider text-cta-foreground/80">
                                                        <CreditCard size={9} />
                                                        Pay now
                                                    </span>
                                                    <span className="text-sm font-semibold text-cta-foreground">
                                                        {formatCurrency(myInfo.amountDue)}
                                                    </span>
                                                </button>
                                            ) : (
                                                <div
                                                    className={`flex flex-col items-start gap-1 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2 ${isPaid ? "bg-success/10" : "bg-muted/20"}`}
                                                >
                                                    <span
                                                        className={`whitespace-nowrap text-[10px] font-semibold uppercase tracking-wider ${isPaid ? "text-success" : "text-muted-foreground"}`}
                                                    >
                                                        {isPaid ? "You paid" : "You pay"}
                                                    </span>
                                                    <span
                                                        className={`text-sm font-semibold ${isPaid ? "text-success" : "text-foreground"}`}
                                                    >
                                                        {formatCurrency(myInfo.amountDue)}
                                                    </span>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    </section>
                ) : null}

                {playerRole === "organiser" && booking.slots_available !== 0 ? (
                    <section className={sectionCls}>
                        <p className={labelCls}>Invite Player</p>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                            <div className="min-w-0 flex-1">
                                <PlayerAutocomplete
                                    inputId="modal-player-invite-id"
                                    label="Player"
                                    clubId={clubId ?? booking.club_id}
                                    value={inviteId}
                                    onChange={setInviteId}
                                    disabled={isInvitePending}
                                />
                            </div>
                            <button
                                type="button"
                                disabled={isInvitePending || !inviteId.trim()}
                                onClick={() => {
                                    if (inviteId.trim()) {
                                        onInvitePlayer(inviteId.trim());
                                        setInviteId("");
                                    }
                                }}
                                className="btn-cta min-h-10 shrink-0 px-4 sm:w-auto disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <UserPlus size={14} />
                                {isInvitePending ? "Inviting..." : "Invite"}
                            </button>
                        </div>
                    </section>
                ) : null}

                {playerRole === "player" && myInviteStatus === "pending" ? (
                    <section className={sectionCls}>
                        <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 shadow-sm shadow-black/5">
                            <p className="mb-0.5 text-sm font-bold text-foreground">
                                You&apos;ve been invited
                            </p>
                            <p className="mb-3 text-xs text-muted-foreground">
                                Accept to confirm your spot in this booking.
                            </p>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    disabled={isRespondPending}
                                    onClick={() => onRespondInvite("accepted")}
                                    className="btn-cta inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 px-4 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <Check size={14} />
                                    Accept
                                </button>
                                <button
                                    type="button"
                                    disabled={isRespondPending}
                                    onClick={() => onRespondInvite("declined")}
                                    className="btn-outline inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 px-4 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <X size={14} />
                                    Decline
                                </button>
                            </div>
                        </div>
                    </section>
                ) : null}

                {booking.players.length > 0 ? (
                    <section className={sectionCls}>
                        <div className="flex items-center justify-between gap-2">
                            <p className={labelCls}>Players</p>
                            <span className="text-[11px] text-muted-foreground">
                                {booking.players.length}
                            </span>
                        </div>
                        <PlayersTable players={booking.players} myUserId={myUserId} />
                    </section>
                ) : null}
            </main>

            <footer className="flex shrink-0 items-center justify-end border-t border-border/70 bg-muted/15 px-5 py-2.5">
                <button type="button" onClick={onClose} className="btn-outline">
                    Close
                </button>
            </footer>
        </div>
    );
}
