import type { JSX } from "react";
import { useState } from "react";
import { Check, CreditCard, RotateCcw, UserPlus, UserRound, X } from "lucide-react";
import { AlertToast, formatCurrency, formatUTCDate, formatUTCTime } from "@repo/ui";
import type { Booking, InviteStatus, PaymentStatus, PlayerRole } from "../../types";
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

function DetailItem({ label, value }: { label: string; value: string }): JSX.Element {
    return (
        <li className="min-w-0 bg-muted/15 px-3 py-2">
            <span className="block text-[10px] font-semibold uppercase text-muted-foreground">
                {label}
            </span>
            <span className="mt-0.5 block truncate text-sm font-semibold text-foreground">
                {value}
            </span>
        </li>
    );
}

function PlayersTable({
    players,
    myUserId,
}: {
    players: Booking["players"];
    myUserId?: string;
}): JSX.Element {
    const getInitials = (name: string): string =>
        name
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase() || "P";

    return (
        <div className="overflow-hidden rounded-lg border border-border/70 bg-background">
            <div className="flex items-center gap-2 border-b border-border/70 bg-muted/15 px-3 py-2">
                <UserRound size={14} className="text-muted-foreground" />
                <span className="text-xs font-semibold text-foreground">Player details</span>
            </div>
            <div className="divide-y divide-border">
                {players.map((p) => {
                    const isMe = myUserId != null && p.user_id === myUserId;
                    return (
                        <div
                            key={p.id}
                            className={`relative flex items-center gap-3 px-3 py-2.5 ${isMe ? "bg-cta/10" : ""}`}
                        >
                            {isMe ? (
                                <span className="absolute inset-y-0 left-0 w-0.5 rounded-r bg-cta" />
                            ) : null}
                            <span
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                                    isMe
                                        ? "bg-cta/20 text-cta ring-1 ring-cta/40"
                                        : "bg-muted text-muted-foreground"
                                }`}
                            >
                                {getInitials(p.full_name)}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-foreground">
                                    {p.full_name}
                                    {isMe ? (
                                        <span className="ml-1.5 rounded-full bg-cta/15 px-1.5 py-0.5 text-[10px] font-semibold text-cta">
                                            You
                                        </span>
                                    ) : null}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                    <span className="capitalize">{formatStatus(p.role)}</span>
                                    <span className="mx-1.5 opacity-40">&middot;</span>
                                    <span className="text-muted-foreground/60">Invite:</span>{" "}
                                    <span className="capitalize">{formatStatus(p.invite_status)}</span>
                                    <span className="mx-1.5 opacity-40">&middot;</span>
                                    <span className="text-muted-foreground/60">Payment:</span>{" "}
                                    <span className="capitalize">{formatStatus(p.payment_status)}</span>
                                </p>
                            </div>
                            <span className="shrink-0 text-sm font-medium text-foreground">
                                {formatCurrency(p.amount_due)}
                            </span>
                        </div>
                    );
                })}
            </div>
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
    const showPayCta = myInviteStatus === "accepted" && myPaymentStatus === "pending";
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

                <ul
                    className={`grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border/70 bg-border/70 ${
                        booking.is_open_game ? "sm:grid-cols-4" : "sm:grid-cols-3"
                    }`}
                >
                    <DetailItem label="Type" value={bookingTypeLabel} />
                    <DetailItem
                        label="Players"
                        value={
                            String(booking.players.length) +
                            (booking.max_players != null ? ` / ${booking.max_players}` : "")
                        }
                    />
                    <DetailItem label="Total" value={formatCurrency(booking.total_price)} />
                    {booking.is_open_game ? (
                        <DetailItem
                            label="Open Game"
                            value={
                                booking.min_skill_level != null || booking.max_skill_level != null
                                    ? `Skill ${booking.min_skill_level ?? "-"} - ${booking.max_skill_level ?? "-"}`
                                    : "Open"
                            }
                        />
                    ) : null}
                </ul>

                <section className={dividerCls}>
                    {(() => {
                        const { date, time } = formatDateRange(
                            booking.start_datetime,
                            booking.end_datetime,
                        );
                        return (
                            <div>
                                <p className={labelCls}>Date &amp; Time</p>
                                <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
                                    <span className="text-sm font-medium text-foreground">
                                        {date}
                                    </span>
                                    <span className="text-muted-foreground/40">&rarr;</span>
                                    <span className="text-sm text-muted-foreground">{time}</span>
                                </div>
                            </div>
                        );
                    })()}
                </section>


                {playerRole === "organiser" && booking.slots_available !== 0 ? (
                    <section className={sectionCls}>
                        <p className={labelCls}>Invite Player</p>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                            <div className="min-w-0 sm:w-[70%]">
                                <label className={labelCls} htmlFor="modal-player-invite-id">
                                    Player
                                </label>
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

                {showPayCta ? (
                    <section className={sectionCls}>
                        <div className="rounded-lg border border-cta/30 bg-cta/8 px-4 py-3">
                            <div className="mb-3 flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="mb-0.5 text-sm font-semibold text-foreground">
                                        Payment due
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Complete payment to confirm your spot.
                                    </p>
                                </div>
                                {myInfo?.amountDue != null && myInfo.amountDue > 0 ? (
                                    <span className="shrink-0 text-base font-bold text-foreground">
                                        {formatCurrency(myInfo.amountDue)}
                                    </span>
                                ) : null}
                            </div>
                            <button
                                type="button"
                                className="btn-cta inline-flex w-full min-h-9 items-center justify-center gap-1.5 text-sm"
                            >
                                <CreditCard size={14} />
                                Pay now
                            </button>
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

            <footer className="flex shrink-0 items-center justify-end border-t border-border px-5 py-2.5">
                <button type="button" onClick={onClose} className="btn-outline">
                    Close
                </button>
            </footer>
        </div>
    );
}
