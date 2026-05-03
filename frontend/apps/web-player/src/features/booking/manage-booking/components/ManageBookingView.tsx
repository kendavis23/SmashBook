import type { JSX } from "react";
import { useState } from "react";
import {
    Banknote,
    CalendarDays,
    Check,
    ChevronLeft,
    ChevronRight,
    Clock3,
    CreditCard,
    RotateCcw,
    Search,
    ShieldCheck,
    UserPlus,
    UsersRound,
    X,
} from "lucide-react";
import { Breadcrumb, AlertToast, formatUTCDateTime, formatCurrency } from "@repo/ui";
import type { Booking, PlayerRole, InviteStatus, PaymentStatus } from "../../types";
import { PlayerAutocomplete } from "../../components/PlayerAutocomplete";

type MyInfo = {
    role: PlayerRole;
    inviteStatus: InviteStatus;
    paymentStatus: PaymentStatus;
    amountDue: number;
};
import { ManageBookingModalView } from "./ManageBookingModalView";

const BOOKING_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    confirmed: { bg: "bg-success/15", text: "text-success" },
    pending: { bg: "bg-warning/15", text: "text-warning" },
    cancelled: { bg: "bg-destructive/15", text: "text-destructive" },
    completed: { bg: "bg-secondary", text: "text-secondary-foreground" },
};

const BOOKING_TYPE_LABELS: Record<string, string> = {
    regular: "Regular",
    lesson_individual: "Individual Lesson",
    lesson_group: "Group Lesson",
    corporate_event: "Corporate Event",
    tournament: "Tournament",
};

const sectionShellCls =
    "rounded-xl border border-border/80 bg-card/95 p-4 shadow-sm shadow-black/5 sm:p-5";

const sectionHeaderCls =
    "mb-4 flex items-start justify-between gap-3 border-b border-border/60 pb-3";

const sectionKickerCls = "text-[11px] font-semibold uppercase tracking-wide text-cta";

function statusPillClass(status: string): string {
    if (status === "accepted" || status === "paid") {
        return "bg-success/15 text-success";
    }
    if (status === "declined" || status === "unpaid") {
        return "bg-destructive/15 text-destructive";
    }
    return "bg-warning/15 text-warning";
}

function initials(name: string): string {
    return name
        .split(" ")
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();
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
    onDismissError: () => void;
    onRefresh: () => void;
    onBack: () => void;
    clubId?: string | null;
    mode?: "page" | "modal";
    onClose?: () => void;
};

export default function ManageBookingView({
    booking,
    playerRole,
    myInfo,
    myUserId,
    apiError,
    isInvitePending,
    isRespondPending,
    onInvitePlayer,
    onRespondInvite,
    onDismissError,
    onRefresh,
    onBack,
    clubId,
    mode = "page",
    onClose,
}: Props): JSX.Element {
    const [inviteId, setInviteId] = useState("");
    const [playerSearch, setPlayerSearch] = useState("");
    const [playerPage, setPlayerPage] = useState(0);
    const PAGE_SIZE = 4;

    if (mode === "modal") {
        return (
            <ManageBookingModalView
                booking={booking}
                playerRole={playerRole}
                myInfo={myInfo}
                myUserId={myUserId}
                apiError={apiError}
                isInvitePending={isInvitePending}
                isRespondPending={isRespondPending}
                onInvitePlayer={onInvitePlayer}
                onRespondInvite={onRespondInvite}
                onDismissError={onDismissError}
                onRefresh={onRefresh}
                clubId={clubId}
                onClose={onClose ?? onBack}
            />
        );
    }

    const statusColors = BOOKING_STATUS_COLORS[booking.status] ?? {
        bg: "bg-warning/15",
        text: "text-warning",
    };

    const myInviteStatus = myInfo?.inviteStatus ?? null;
    const myPaymentStatus = myInfo?.paymentStatus ?? null;
    const showPayCta = myInviteStatus === "accepted" && myPaymentStatus === "pending";
    const bookingDate = formatUTCDateTime(booking.start_datetime);
    const bookingTypeLabel =
        BOOKING_TYPE_LABELS[booking.booking_type] ?? booking.booking_type.replace(/_/g, " ");
    const acceptedPlayers = booking.players.filter((player) => player.invite_status === "accepted");
    const pendingPlayers = booking.players.filter((player) => player.invite_status === "pending");
    const inviteSection =
        playerRole === "organiser" && booking.slots_available !== 0 ? (
            <section className={sectionShellCls}>
                <div className={sectionHeaderCls}>
                    <div>
                        <p className={sectionKickerCls}>Invite</p>
                        <h3 className="mt-1 text-base font-semibold text-foreground">
                            Invite Player
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Search a club player and send an invite to this booking.
                        </p>
                    </div>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cta/10 text-cta">
                        <UserPlus size={18} />
                    </div>
                </div>
                <form
                    className="flex flex-col gap-3 sm:flex-row sm:items-end xl:flex-col xl:items-stretch 2xl:flex-row 2xl:items-end"
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (inviteId.trim()) {
                            onInvitePlayer(inviteId.trim());
                            setInviteId("");
                        }
                    }}
                >
                    <div className="min-w-0 flex-1">
                        <label
                            htmlFor="player-invite-id"
                            className="mb-1 block text-sm font-medium text-foreground"
                        >
                            Player
                        </label>
                        <PlayerAutocomplete
                            inputId="player-invite-id"
                            label="Player"
                            clubId={clubId ?? booking.club_id}
                            value={inviteId}
                            onChange={setInviteId}
                            disabled={isInvitePending}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isInvitePending || !inviteId.trim()}
                        className="btn-cta min-h-10 whitespace-nowrap px-4 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <UserPlus size={14} />
                        {isInvitePending ? "Inviting..." : "Invite"}
                    </button>
                </form>
            </section>
        ) : null;

    const responseSection =
        playerRole === "player" && myInviteStatus === "pending" ? (
            <section className="overflow-hidden rounded-xl border border-cta/25 bg-cta/5 p-4 shadow-sm shadow-cta/10 sm:p-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                        <p className={sectionKickerCls}>Action needed</p>
                        <h3 className="mt-1 text-base font-semibold text-foreground">
                            Respond to Invite
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Accept to reserve your spot, or decline if you cannot attend.
                        </p>
                    </div>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background text-cta shadow-sm">
                        <ShieldCheck size={18} />
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                        type="button"
                        disabled={isRespondPending}
                        onClick={() => onRespondInvite("accepted")}
                        className="btn-cta min-h-11 justify-center disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <Check size={15} /> Accept
                    </button>
                    <button
                        type="button"
                        disabled={isRespondPending}
                        onClick={() => onRespondInvite("declined")}
                        className="btn-outline min-h-11 justify-center disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <X size={15} /> Decline
                    </button>
                </div>
            </section>
        ) : null;

    const paymentSection = showPayCta ? (
        <section className="overflow-hidden rounded-xl border border-success/25 bg-success/10 p-4 shadow-sm shadow-success/10 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-background text-success shadow-sm">
                        <CreditCard size={19} />
                    </div>
                    <div className="min-w-0">
                        <p className={sectionKickerCls}>Payment</p>
                        <h3 className="mt-1 text-base font-semibold text-foreground">Payment</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Your spot is accepted. Complete payment to finish the booking.
                        </p>
                    </div>
                </div>
                <button type="button" className="btn-cta min-h-11 shrink-0 justify-center px-5">
                    <Banknote size={15} />
                    Pay here
                </button>
            </div>
        </section>
    ) : null;

    return (
        <div className="w-full space-y-5">
            <Breadcrumb
                items={[{ label: "Bookings", onClick: onBack }, { label: "Manage Booking" }]}
            />

            <section className="w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg shadow-black/5">
                <header className="relative overflow-hidden border-b border-border bg-muted/15 px-4 py-4 sm:px-6">
                    <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.14),transparent_42%)] sm:block" />
                    <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-sm">
                                <CalendarDays size={13} className="text-cta" />
                                Manage booking
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                                    {booking.court_name}
                                </h1>
                                <span
                                    className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors.bg} ${statusColors.text}`}
                                >
                                    {booking.status}
                                </span>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                <span className="inline-flex items-center gap-1.5">
                                    <Clock3 size={14} />
                                    {bookingDate}
                                </span>
                                <span className="hidden text-muted-foreground/40 sm:inline">|</span>
                                <span>{formatUTCDateTime(booking.end_datetime)}</span>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onRefresh}
                            className="btn-outline min-h-10 w-full px-4 sm:w-auto"
                            aria-label="Refresh booking"
                        >
                            <RotateCcw size={14} /> Refresh
                        </button>
                    </div>
                </header>

                <div className="bg-background/40 px-4 py-5 sm:px-6">
                    <div className="space-y-5">
                        {apiError ? (
                            <AlertToast title={apiError} variant="error" onClose={onDismissError} />
                        ) : null}

                        {(responseSection || paymentSection) && (
                            <div className="grid gap-4 lg:grid-cols-2">
                                {responseSection}
                                {paymentSection}
                            </div>
                        )}

                        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
                            <div className="min-w-0 space-y-5">
                                <section className={sectionShellCls}>
                                    <div className={sectionHeaderCls}>
                                        <div>
                                            <p className={sectionKickerCls}>Details</p>
                                            <h3 className="mt-1 text-base font-semibold text-foreground">
                                                Overview
                                            </h3>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                Booking time, court, players, and pricing.
                                            </p>
                                        </div>
                                        <CalendarDays
                                            size={18}
                                            className="mt-1 text-muted-foreground"
                                        />
                                    </div>
                                    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2.5">
                                            <dt className="text-xs font-medium text-muted-foreground">
                                                Type
                                            </dt>
                                            <dd className="mt-0.5 text-sm capitalize text-foreground">
                                                {bookingTypeLabel}
                                                {booking.is_open_game ? (
                                                    <span className="ml-1.5 rounded-full bg-cta/15 px-1.5 py-0.5 text-[10px] font-medium text-cta">
                                                        Open
                                                    </span>
                                                ) : null}
                                            </dd>
                                        </div>
                                        <div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2.5">
                                            <dt className="text-xs font-medium text-muted-foreground">
                                                Players
                                            </dt>
                                            <dd className="mt-0.5 text-sm text-foreground">
                                                {booking.max_players != null
                                                    ? `${booking.max_players - booking.slots_available} / ${booking.max_players}`
                                                    : booking.players.length}
                                            </dd>
                                        </div>
                                        <div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2.5">
                                            <dt className="text-xs font-medium text-muted-foreground">
                                                Start
                                            </dt>
                                            <dd className="mt-0.5 text-sm text-foreground">
                                                {formatUTCDateTime(booking.start_datetime)}
                                            </dd>
                                        </div>
                                        <div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2.5">
                                            <dt className="text-xs font-medium text-muted-foreground">
                                                End
                                            </dt>
                                            <dd className="mt-0.5 text-sm text-foreground">
                                                {formatUTCDateTime(booking.end_datetime)}
                                            </dd>
                                        </div>
                                        <div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2.5">
                                            <dt className="text-xs font-medium text-muted-foreground">
                                                Total price
                                            </dt>
                                            <dd className="mt-0.5 text-sm font-semibold text-foreground">
                                                {formatCurrency(booking.total_price)}
                                            </dd>
                                        </div>
                                        <div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2.5">
                                            <dt className="text-xs font-medium text-muted-foreground">
                                                Slots available
                                            </dt>
                                            <dd
                                                className={`mt-0.5 text-sm ${
                                                    booking.slots_available === 0
                                                        ? "text-destructive"
                                                        : "text-foreground"
                                                }`}
                                            >
                                                {booking.slots_available}
                                            </dd>
                                        </div>
                                        {booking.min_skill_level != null ||
                                        booking.max_skill_level != null ? (
                                            <div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2.5 sm:col-span-2">
                                                <dt className="text-xs font-medium text-muted-foreground">
                                                    Skill level
                                                </dt>
                                                <dd className="mt-0.5 text-sm text-foreground">
                                                    {booking.min_skill_level ?? "-"} -{" "}
                                                    {booking.max_skill_level ?? "-"}
                                                </dd>
                                            </div>
                                        ) : null}
                                    </dl>
                                </section>
                            </div>

                            <div className="min-w-0 space-y-5">
                                {inviteSection}

                                {booking.players.length > 0 ? (
                                    <section className={sectionShellCls}>
                                        <div className={sectionHeaderCls}>
                                            <div>
                                                <p className={sectionKickerCls}>Participants</p>
                                                <h3 className="mt-1 text-base font-semibold text-foreground">
                                                    Players
                                                </h3>
                                                <p className="mt-1 text-sm text-muted-foreground">
                                                    {acceptedPlayers.length} accepted,{" "}
                                                    {pendingPlayers.length} pending.
                                                </p>
                                            </div>
                                            <UsersRound
                                                size={18}
                                                className="mt-1 text-muted-foreground"
                                            />
                                        </div>
                                        <div className="relative mb-3">
                                            <Search
                                                size={14}
                                                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                                            />
                                            <input
                                                type="text"
                                                placeholder="Search by name…"
                                                value={playerSearch}
                                                onChange={(e) => {
                                                    setPlayerSearch(e.target.value);
                                                    setPlayerPage(0);
                                                }}
                                                className="w-full rounded-lg border border-border bg-background py-2 pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-cta/50"
                                            />
                                        </div>
                                        {(() => {
                                            const sorted = [...booking.players].sort((a, b) => {
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
                                            const filtered = playerSearch.trim()
                                                ? sorted.filter((p) =>
                                                      p.full_name
                                                          .toLowerCase()
                                                          .includes(playerSearch.toLowerCase())
                                                  )
                                                : sorted;
                                            const totalPages = Math.ceil(
                                                filtered.length / PAGE_SIZE
                                            );
                                            const page =
                                                filtered.length === 0
                                                    ? 0
                                                    : Math.min(playerPage, totalPages - 1);
                                            const paged = filtered.slice(
                                                page * PAGE_SIZE,
                                                page * PAGE_SIZE + PAGE_SIZE
                                            );
                                            return (
                                                <>
                                                    <div className="space-y-2">
                                                        {paged.length === 0 ? (
                                                            <p className="py-4 text-center text-sm text-muted-foreground">
                                                                No players found.
                                                            </p>
                                                        ) : (
                                                            paged.map((player) => {
                                                                const isMe =
                                                                    myUserId != null &&
                                                                    player.user_id === myUserId;
                                                                const isAccepted =
                                                                    !isMe &&
                                                                    player.invite_status ===
                                                                        "accepted";
                                                                return (
                                                                    <div
                                                                        key={player.id}
                                                                        className={`relative flex items-center gap-3 rounded-lg border px-3 py-3 ${
                                                                            isMe
                                                                                ? "border-cta/40 bg-cta/10 ring-1 ring-cta/20"
                                                                                : isAccepted
                                                                                  ? "border-success/30 bg-success/8"
                                                                                  : "border-border/70 bg-background/70"
                                                                        }`}
                                                                    >
                                                                        {isMe ? (
                                                                            <span className="absolute inset-y-0 left-0 w-1 rounded-l-lg bg-cta" />
                                                                        ) : null}
                                                                        <div
                                                                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-1 ${
                                                                                isMe
                                                                                    ? "bg-cta/20 text-cta ring-cta/40"
                                                                                    : isAccepted
                                                                                      ? "bg-success/15 text-success ring-success/30"
                                                                                      : "bg-secondary text-secondary-foreground ring-border"
                                                                            }`}
                                                                        >
                                                                            {initials(
                                                                                player.full_name
                                                                            )}
                                                                        </div>
                                                                        <div className="min-w-0 flex-1">
                                                                            <p className="truncate text-sm font-medium text-foreground">
                                                                                {player.full_name}
                                                                                {isMe ? (
                                                                                    <span className="ml-1.5 rounded-full bg-cta/15 px-1.5 py-0.5 text-[10px] font-semibold text-cta">
                                                                                        You
                                                                                    </span>
                                                                                ) : null}
                                                                            </p>
                                                                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                                                                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium capitalize text-muted-foreground">
                                                                                    {player.role}
                                                                                </span>
                                                                                <span
                                                                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${statusPillClass(player.invite_status)}`}
                                                                                >
                                                                                    <span className="font-semibold uppercase tracking-wide">
                                                                                        Invite:
                                                                                    </span>
                                                                                    <span className="capitalize">
                                                                                        {
                                                                                            player.invite_status
                                                                                        }
                                                                                    </span>
                                                                                </span>
                                                                                <span
                                                                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${statusPillClass(player.payment_status)}`}
                                                                                >
                                                                                    <span className="font-semibold uppercase tracking-wide">
                                                                                        Payment:
                                                                                    </span>
                                                                                    <span className="capitalize">
                                                                                        {
                                                                                            player.payment_status
                                                                                        }
                                                                                    </span>
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="shrink-0 text-right text-sm font-semibold text-foreground">
                                                                            {formatCurrency(
                                                                                player.amount_due
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })
                                                        )}
                                                    </div>
                                                    {totalPages > 1 && (
                                                        <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3">
                                                            <span className="text-xs text-muted-foreground">
                                                                {page * PAGE_SIZE + 1}–
                                                                {Math.min(
                                                                    (page + 1) * PAGE_SIZE,
                                                                    filtered.length
                                                                )}{" "}
                                                                of {filtered.length}
                                                            </span>
                                                            <div className="flex items-center gap-1">
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setPlayerPage(page - 1)
                                                                    }
                                                                    disabled={page === 0}
                                                                    className="rounded-md border border-border p-1 text-muted-foreground transition hover:bg-muted disabled:opacity-40"
                                                                >
                                                                    <ChevronLeft size={14} />
                                                                </button>
                                                                <span className="min-w-[3rem] text-center text-xs text-muted-foreground">
                                                                    {page + 1} / {totalPages}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setPlayerPage(page + 1)
                                                                    }
                                                                    disabled={
                                                                        page >= totalPages - 1
                                                                    }
                                                                    className="rounded-md border border-border p-1 text-muted-foreground transition hover:bg-muted disabled:opacity-40"
                                                                >
                                                                    <ChevronRight size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </section>
                                ) : null}
                            </div>
                        </div>

                        <div className="flex justify-start border-t border-border/70 pt-5">
                            <button type="button" onClick={onBack} className="btn-outline">
                                Back
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
