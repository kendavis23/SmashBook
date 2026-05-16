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
    Shield,
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
    confirmed: "bg-success/15 text-success",
    pending: "bg-warning/15 text-warning",
    cancelled: "bg-destructive/15 text-destructive",
    completed: "bg-secondary text-secondary-foreground",
};

const BOOKING_TYPE_LABELS: Record<string, string> = {
    regular: "Regular",
    lesson_individual: "Individual Lesson",
    lesson_group: "Group Lesson",
    corporate_event: "Corporate Event",
    tournament: "Tournament",
};

const labelCls = "mb-1 block text-xs font-medium text-foreground";
const dividerCls = "border-t-2 border-border/20 pt-3";
const sectionCls = `space-y-2 ${dividerCls}`;

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
        <div className="overflow-hidden rounded-lg border border-border/70 bg-background">
            <div className="flex items-center gap-2 border-b border-border/70 bg-muted/15 px-2.5 py-1.5">
                <UserRound size={13} className="shrink-0 text-muted-foreground" />
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
                        className="w-28 rounded border border-border bg-background py-0.5 pl-5 pr-2 text-[11px] placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-cta/50"
                    />
                </div>
            </div>
            <div className="divide-y divide-border/60">
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
                                className={`relative flex items-center gap-2.5 px-3 py-2.5 ${isMe ? "bg-cta/5" : ""}`}
                            >
                                {isMe ? (
                                    <span className="absolute inset-y-0 left-0 w-0.5 rounded-r bg-cta" />
                                ) : null}

                                {/* Avatar */}
                                <span
                                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${isMe
                                        ? "bg-cta/15 text-cta"
                                        : isAccepted
                                            ? "bg-success/10 text-success"
                                            : "bg-muted text-muted-foreground"
                                        }`}
                                >
                                    {getInitials(p.full_name)}
                                </span>

                                {/* Content */}
                                <div className="min-w-0 flex-1">
                                    {/* Line 1: Name + role + you badge */}
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="text-sm font-semibold text-foreground leading-tight">
                                            {p.full_name}
                                        </span>
                                        <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                                            <Shield size={10} className="shrink-0" />
                                            <span className="capitalize">{formatStatus(p.role)}</span>
                                        </span>
                                        {isMe ? (
                                            <span className="rounded-full bg-cta px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                                                You
                                            </span>
                                        ) : null}
                                    </div>

                                    {/* Line 2: Invite + Payment badges */}
                                    <div className="mt-1 flex flex-wrap items-center gap-1">
                                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${inviteBadgeCls}`}>
                                            Invite: {formatStatus(p.invite_status)}
                                        </span>
                                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${payBadgeCls}`}>
                                            Payment: {formatStatus(p.payment_status)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
            {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border/60 px-3 py-1.5">
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
                            className="rounded p-0.5 text-muted-foreground hover:bg-muted disabled:opacity-40"
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
                            className="rounded p-0.5 text-muted-foreground hover:bg-muted disabled:opacity-40"
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
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-2.5">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold tracking-tight text-foreground">
                            {booking.court_name}
                        </h2>
                        <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${statusCls}`}
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
                        className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                        <RotateCcw size={15} />
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close modal"
                        className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                        <X size={16} />
                    </button>
                </div>
            </header>

            <main className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-3">
                {apiError ? (
                    <AlertToast title={apiError} variant="error" onClose={onDismissError} />
                ) : null}

                <div className="space-y-2">
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
                                { icon: <MapPin size={13} />, label: "Court", value: booking.court_name, color: "text-violet-500", bg: "bg-violet-500/10" },
                                { icon: <CalendarDays size={13} />, label: "Date", value: date, color: "text-blue-500", bg: "bg-blue-500/10" },
                                { icon: <Clock size={13} />, label: "Time", value: time, color: "text-amber-500", bg: "bg-amber-500/10" },
                                { icon: <span className="text-xs font-bold leading-none">£</span>, label: "Total", value: formatCurrency(booking.total_price) ?? "—", color: "text-emerald-500", bg: "bg-emerald-500/10" },
                                { icon: <Users size={13} />, label: "Players", value: playersValue, color: "text-pink-500", bg: "bg-pink-500/10" },
                                { icon: <CalendarDays size={13} />, label: "Type", value: bookingTypeLabel, color: "text-cta", bg: "bg-cta/10" },
                            ];
                            return items.map(({ icon, label, value, color, bg }) => (
                                <div key={label} className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5">
                                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${bg} ${color}`}>
                                        {icon}
                                    </div>
                                    <div className="min-w-0 flex flex-col gap-0.5">
                                        <span className="text-[9px] font uppercase tracking-wider text-muted-foreground">{label}</span>
                                        <span className="truncate text-sm font text-foreground leading-tight">{value}</span>
                                    </div>
                                </div>
                            ));
                        })()}
                    </div>
                </div>

                {myInfo ? (
                    <section className={sectionCls}>
                        <p className={labelCls}>Payment Information</p>
                        <div className="overflow-hidden rounded-lg border border-border/50">
                            <div className="grid grid-cols-3 divide-x divide-border/50">
                                {(() => {
                                    const discountValue = parseFloat(
                                        booking.players.find((pl) => pl.user_id === myUserId)?.discount_amount ?? "0"
                                    );
                                    const hasDiscount = discountValue > 0;
                                    const originalPrice = hasDiscount
                                        ? myInfo.amountDue + discountValue
                                        : myInfo.amountDue;
                                    const discountSource = booking.players.find((pl) => pl.user_id === myUserId)?.discount_source;
                                    const isPaid = myInfo.paymentStatus === "paid";
                                    return (
                                        <>
                                            <div className="flex flex-col items-center gap-0.5 px-3 py-3">
                                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Original price</span>
                                                <span className={`text-base font-semibold ${hasDiscount ? "text-muted-foreground line-through" : "text-foreground"}`}>
                                                    {formatCurrency(originalPrice)}
                                                </span>
                                            </div>
                                            <div className="flex flex-col items-center gap-0.5 px-3 py-3">
                                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                                    {hasDiscount ? (discountSource ?? "Discount") : "Discount"}
                                                </span>
                                                {hasDiscount ? (
                                                    <span className="text-base font-semibold text-cta">
                                                        -{formatCurrency(discountValue)}
                                                    </span>
                                                ) : (
                                                    <span className="text-base font-semibold text-muted-foreground">—</span>
                                                )}
                                            </div>
                                            {showPayCta ? (
                                                <button
                                                    type="button"
                                                    onClick={() => { if (payableBooking) onPayClick?.(payableBooking); }}
                                                    className="flex flex-col items-center justify-center gap-1 px-3 py-3 bg-cta hover:bg-cta/90 active:bg-cta/80 transition-colors cursor-pointer w-full"
                                                >
                                                    <span className="text-[10px] uppercase tracking-wider text-white/80 flex items-center gap-0.5">
                                                        <CreditCard size={9} />
                                                        Pay now
                                                    </span>
                                                    <span className="text-base font-bold text-white">
                                                        {formatCurrency(myInfo.amountDue)}
                                                    </span>
                                                </button>
                                            ) : (
                                                <div className={`flex flex-col items-center gap-0.5 px-3 py-3 ${isPaid ? "bg-success/8" : "bg-muted/20"}`}>
                                                    <span className={`text-[10px] uppercase tracking-wider ${isPaid ? "text-success" : "text-muted-foreground"}`}>
                                                        {isPaid ? "You paid" : "You pay"}
                                                    </span>
                                                    <span className={`text-base font-bold ${isPaid ? "text-success" : "text-foreground"}`}>
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
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                            <div className="min-w-0 sm:w-[70%]">
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
                                className="btn-cta min-h-10 sm:w-auto disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <UserPlus size={14} />
                                {isInvitePending ? "Inviting..." : "Invite"}
                            </button>
                        </div>
                    </section>
                ) : null}

                {playerRole === "player" && myInviteStatus === "pending" ? (
                    <section className={sectionCls}>
                        <div className="rounded-lg border border-warning/30 bg-warning/8 px-4 py-3">
                            <p className="mb-0.5 text-sm font-semibold text-foreground">
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
                        <PlayersTable
                            players={booking.players}
                            myUserId={myUserId}
                        />
                    </section>
                ) : null}
            </main>

            <footer className="flex shrink-0 items-center justify-end border-t border-border px-5 py-2.5">
                <button type="button" onClick={onClose} className="btn-outline">
                    Close
                </button>
            </footer>
        </div>
    );
}
