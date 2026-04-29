import type { JSX } from "react";
import { useState } from "react";
import { CalendarCheck, Check, ChevronDown, ChevronUp, RotateCcw, UserPlus, X } from "lucide-react";
import {
    AlertToast,
    StatPill,
    formatUTCDate,
    formatUTCTime,
    formatUTCDateTime,
    formatCurrency,
} from "@repo/ui";
import type { Booking, PlayerRole, InviteStatus, PaymentStatus } from "../../types";
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

type Props = {
    booking: Booking;
    playerRole: PlayerRole;
    myInfo?: MyInfo;
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
    const [playersExpanded, setPlayersExpanded] = useState(false);
    const [inviteId, setInviteId] = useState("");

    const statusCls =
        BOOKING_STATUS_CLASSES[booking.status] ?? "bg-secondary text-secondary-foreground";

    const myInviteStatus = myInfo?.inviteStatus ?? null;
    const myPaymentStatus = myInfo?.paymentStatus ?? null;
    const showPayCta = myInviteStatus === "accepted" && myPaymentStatus === "pending";

    return (
        <div className="flex h-full flex-col">
            {/* ── Sticky header ── */}
            <div className="shrink-0 border-b border-border px-6 pb-5 pt-6">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                            <CalendarCheck size={18} />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-lg font-semibold text-foreground">
                                    {booking.court_name}
                                </h2>
                                <span
                                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${statusCls}`}
                                >
                                    {booking.status}
                                </span>
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                {formatUTCDate(booking.start_datetime)} &middot;{" "}
                                {formatUTCTime(booking.start_datetime)} &ndash;{" "}
                                {formatUTCTime(booking.end_datetime)}
                            </p>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
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
                </div>
            </div>

            {/* ── Scrollable body ── */}
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                <div className="space-y-5">
                    {apiError ? (
                        <div className="mb-4">
                            <AlertToast title={apiError} variant="error" onClose={onDismissError} />
                        </div>
                    ) : null}

                    {/* Context pills */}
                    <div className="grid grid-cols-3 gap-2">
                        <StatPill label="Type" value={booking.booking_type.replace(/_/g, " ")} />
                        <StatPill label="Start" value={formatUTCDateTime(booking.start_datetime)} />
                        <StatPill
                            label="Players"
                            value={
                                String(booking.players.length) +
                                (booking.max_players != null ? ` / ${booking.max_players}` : "")
                            }
                        />
                        <StatPill label="Total" value={formatCurrency(booking.total_price)} />
                        <StatPill label="Open game" value={booking.is_open_game ? "Yes" : "No"} />
                        {booking.min_skill_level != null || booking.max_skill_level != null ? (
                            <StatPill
                                label="Skill level"
                                value={`${booking.min_skill_level ?? "—"} – ${booking.max_skill_level ?? "—"}`}
                            />
                        ) : null}
                    </div>

                    {/* My Details */}
                    {myInfo ? (
                        <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
                            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                My Details
                            </p>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-4">
                                <div>
                                    <p className="text-[10px] text-muted-foreground">Role</p>
                                    <p className="text-sm capitalize text-foreground">
                                        {myInfo.role}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground">Invite</p>
                                    <p className="text-sm capitalize text-foreground">
                                        {myInfo.inviteStatus}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground">Payment</p>
                                    <p className="text-sm capitalize text-foreground">
                                        {myInfo.paymentStatus}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground">Amount due</p>
                                    <p className="text-sm text-foreground">
                                        {formatCurrency(myInfo.amountDue)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {/* Invite Player (organiser only) */}
                    {playerRole === "organiser" ? (
                        <div>
                            <p className="mb-2 text-sm font-medium text-foreground">
                                Invite Player
                            </p>
                            <div className="flex gap-2">
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
                                    className="btn-cta min-h-10 px-4"
                                >
                                    <UserPlus size={14} />
                                    {isInvitePending ? "Inviting…" : "Invite"}
                                </button>
                            </div>
                        </div>
                    ) : null}

                    {/* Respond to Invite (player with pending invite only) */}
                    {playerRole === "player" && myInviteStatus === "pending" ? (
                        <div>
                            <p className="mb-3 text-sm font-medium text-foreground">
                                You have been invited to this booking.
                            </p>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    disabled={isRespondPending}
                                    onClick={() => onRespondInvite("accepted")}
                                    className="btn-cta inline-flex min-h-9 items-center gap-1.5 px-4 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <Check size={14} />
                                    Accept
                                </button>
                                <button
                                    type="button"
                                    disabled={isRespondPending}
                                    onClick={() => onRespondInvite("declined")}
                                    className="btn-outline inline-flex min-h-9 items-center gap-1.5 px-4 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <X size={14} />
                                    Decline
                                </button>
                            </div>
                        </div>
                    ) : null}

                    {/* Pay Here (any role, accepted invite + pending payment) */}
                    {showPayCta ? (
                        <div>
                            <p className="mb-1 text-sm font-medium text-foreground">Payment</p>
                            <p className="mb-3 text-xs text-muted-foreground">
                                Your payment is pending. Complete it to confirm your spot.
                            </p>
                            <button type="button" className="btn-cta min-h-9 px-4 text-sm">
                                Pay here
                            </button>
                        </div>
                    ) : null}

                    {/* Players — collapsible */}
                    {booking.players.length > 0 ? (
                        <div className="overflow-hidden rounded-lg border border-border">
                            <button
                                type="button"
                                className="flex w-full items-center justify-between bg-muted/20 px-4 py-3 text-left transition hover:bg-muted/40"
                                onClick={() => setPlayersExpanded((v) => !v)}
                                aria-expanded={playersExpanded}
                            >
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    Players ({booking.players.length})
                                </span>
                                {playersExpanded ? (
                                    <ChevronUp size={13} className="text-muted-foreground" />
                                ) : (
                                    <ChevronDown size={13} className="text-muted-foreground" />
                                )}
                            </button>
                            {playersExpanded ? (
                                <div className="overflow-x-auto border-t border-border">
                                    <table className="w-full min-w-[340px] border-collapse text-sm">
                                        <thead>
                                            <tr className="bg-muted/10">
                                                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                                    Name
                                                </th>
                                                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                                    Role
                                                </th>
                                                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                                    Invite
                                                </th>
                                                <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                                    Amount
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {booking.players.map((p) => (
                                                <tr key={p.id} className="hover:bg-muted/20">
                                                    <td className="px-3 py-2 font-medium text-foreground">
                                                        {p.full_name}
                                                    </td>
                                                    <td className="px-3 py-2 capitalize text-muted-foreground">
                                                        {p.role}
                                                    </td>
                                                    <td className="px-3 py-2 capitalize text-muted-foreground">
                                                        {p.invite_status}
                                                    </td>
                                                    <td className="px-3 py-2 text-right text-foreground">
                                                        {formatCurrency(p.amount_due)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            </div>

            {/* ── Sticky footer ── */}
            <div className="shrink-0 flex items-center justify-end border-t border-border px-6 py-4">
                <button type="button" onClick={onClose} className="btn-outline">
                    Close
                </button>
            </div>
        </div>
    );
}
