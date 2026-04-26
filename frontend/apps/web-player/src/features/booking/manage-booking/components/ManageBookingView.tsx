import type { JSX } from "react";
import { useState } from "react";
import { Check, RotateCcw, UserPlus, X } from "lucide-react";
import { Breadcrumb, AlertToast, formatUTCDateTime, formatCurrency } from "@repo/ui";
import type { Booking, PlayerRole, InviteStatus, PaymentStatus } from "../../types";

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
    onBack: () => void;
    mode?: "page" | "modal";
    onClose?: () => void;
};

export default function ManageBookingView({
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
    onBack,
    mode = "page",
    onClose,
}: Props): JSX.Element {
    const [inviteId, setInviteId] = useState("");

    if (mode === "modal") {
        return (
            <ManageBookingModalView
                booking={booking}
                playerRole={playerRole}
                myInfo={myInfo}
                apiError={apiError}
                isInvitePending={isInvitePending}
                isRespondPending={isRespondPending}
                onInvitePlayer={onInvitePlayer}
                onRespondInvite={onRespondInvite}
                onDismissError={onDismissError}
                onRefresh={onRefresh}
                onClose={onClose ?? onBack}
            />
        );
    }

    const statusColors = BOOKING_STATUS_COLORS[booking.status] ?? BOOKING_STATUS_COLORS["pending"]!;

    const myInviteStatus = myInfo?.inviteStatus ?? null;
    const myPaymentStatus = myInfo?.paymentStatus ?? null;
    const showPayCta = myInviteStatus === "accepted" && myPaymentStatus === "pending";

    return (
        <div className="w-full space-y-5">
            <Breadcrumb
                items={[{ label: "Bookings", onClick: onBack }, { label: "Manage Booking" }]}
            />

            <section className="w-full rounded-xl border border-border bg-card px-6 py-6 shadow-sm sm:px-8">
                <header className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-xl font-semibold text-foreground">
                                {booking.court_name}
                            </h1>
                            <span
                                className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusColors.bg} ${statusColors.text}`}
                            >
                                {booking.status}
                            </span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {formatUTCDateTime(booking.start_datetime)} &ndash;{" "}
                            {formatUTCDateTime(booking.end_datetime)}
                        </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <button
                            type="button"
                            onClick={onRefresh}
                            className="btn-outline min-h-10 px-4"
                            aria-label="Refresh booking"
                        >
                            <RotateCcw size={14} /> Refresh
                        </button>
                    </div>
                </header>

                <div className="mt-5 space-y-4">
                    {apiError ? (
                        <AlertToast title={apiError} variant="error" onClose={onDismissError} />
                    ) : null}

                    {/* Overview */}
                    <section className="form-section">
                        <div className="mb-4">
                            <h3 className="text-sm font-semibold text-foreground">Overview</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Read-only details for this booking.
                            </p>
                        </div>
                        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <div>
                                <dt className="text-xs font-medium text-muted-foreground">Type</dt>
                                <dd className="mt-0.5 text-sm capitalize text-foreground">
                                    {booking.booking_type.replace(/_/g, " ")}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs font-medium text-muted-foreground">Start</dt>
                                <dd className="mt-0.5 text-sm text-foreground">
                                    {formatUTCDateTime(booking.start_datetime)}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs font-medium text-muted-foreground">End</dt>
                                <dd className="mt-0.5 text-sm text-foreground">
                                    {formatUTCDateTime(booking.end_datetime)}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs font-medium text-muted-foreground">
                                    Players
                                </dt>
                                <dd className="mt-0.5 text-sm text-foreground">
                                    {booking.players.length}
                                    {booking.max_players != null ? ` / ${booking.max_players}` : ""}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs font-medium text-muted-foreground">
                                    Total price
                                </dt>
                                <dd className="mt-0.5 text-sm text-foreground">
                                    {formatCurrency(booking.total_price)}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs font-medium text-muted-foreground">
                                    Open game
                                </dt>
                                <dd className="mt-0.5 text-sm text-foreground">
                                    {booking.is_open_game ? "Yes" : "No"}
                                </dd>
                            </div>
                            {booking.min_skill_level != null || booking.max_skill_level != null ? (
                                <div>
                                    <dt className="text-xs font-medium text-muted-foreground">
                                        Skill level
                                    </dt>
                                    <dd className="mt-0.5 text-sm text-foreground">
                                        {booking.min_skill_level ?? "—"} &ndash;{" "}
                                        {booking.max_skill_level ?? "—"}
                                    </dd>
                                </div>
                            ) : null}
                        </dl>
                    </section>

                    {/* My Details */}
                    {myInfo ? (
                        <section className="form-section">
                            <div className="mb-4">
                                <h3 className="text-sm font-semibold text-foreground">
                                    My Details
                                </h3>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Your participation details for this booking.
                                </p>
                            </div>
                            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                <div>
                                    <dt className="text-xs font-medium text-muted-foreground">
                                        Role
                                    </dt>
                                    <dd className="mt-0.5 text-sm capitalize text-foreground">
                                        {myInfo.role}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs font-medium text-muted-foreground">
                                        Invite
                                    </dt>
                                    <dd className="mt-0.5 text-sm capitalize text-foreground">
                                        {myInfo.inviteStatus}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs font-medium text-muted-foreground">
                                        Payment
                                    </dt>
                                    <dd className="mt-0.5 text-sm capitalize text-foreground">
                                        {myInfo.paymentStatus}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs font-medium text-muted-foreground">
                                        Amount due
                                    </dt>
                                    <dd className="mt-0.5 text-sm text-foreground">
                                        {formatCurrency(myInfo.amountDue)}
                                    </dd>
                                </div>
                            </dl>
                        </section>
                    ) : null}

                    {/* Invite Player (organiser only) */}
                    {playerRole === "organiser" ? (
                        <section className="form-section">
                            <div className="mb-4">
                                <h3 className="text-sm font-semibold text-foreground">
                                    Invite Player
                                </h3>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Enter a player ID to invite them to this open match.
                                </p>
                            </div>
                            <form
                                className="flex flex-col gap-3 sm:flex-row sm:items-end"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    if (inviteId.trim()) {
                                        onInvitePlayer(inviteId.trim());
                                        setInviteId("");
                                    }
                                }}
                            >
                                <div className="min-w-0 sm:w-[70%]">
                                    <label
                                        htmlFor="player-invite-id"
                                        className="mb-1 block text-sm font-medium text-foreground"
                                    >
                                        Player ID
                                    </label>
                                    <input
                                        id="player-invite-id"
                                        type="text"
                                        className="input-base"
                                        placeholder="3fa85f64-5717-4562-b3fc-2c963f66afa6"
                                        value={inviteId}
                                        onChange={(e) => setInviteId(e.target.value)}
                                        disabled={isInvitePending}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isInvitePending || !inviteId.trim()}
                                    className="btn-cta sm:w-auto"
                                >
                                    <UserPlus size={14} />
                                    {isInvitePending ? "Inviting…" : "Invite"}
                                </button>
                            </form>
                        </section>
                    ) : null}

                    {/* Respond to Invite (player with pending invite only) */}
                    {playerRole === "player" && myInviteStatus === "pending" ? (
                        <section className="form-section">
                            <div className="mb-4">
                                <h3 className="text-sm font-semibold text-foreground">
                                    Respond to Invite
                                </h3>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    You have been invited to this booking.
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    disabled={isRespondPending}
                                    onClick={() => onRespondInvite("accepted")}
                                    className="btn-cta disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <Check size={14} /> Accept
                                </button>
                                <button
                                    type="button"
                                    disabled={isRespondPending}
                                    onClick={() => onRespondInvite("declined")}
                                    className="btn-outline disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <X size={14} /> Decline
                                </button>
                            </div>
                        </section>
                    ) : null}

                    {/* Pay Here (any role, accepted invite + pending payment) */}
                    {showPayCta ? (
                        <section className="form-section">
                            <div className="mb-4">
                                <h3 className="text-sm font-semibold text-foreground">Payment</h3>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Your payment is pending. Complete it to confirm your spot.
                                </p>
                            </div>
                            <button type="button" className="btn-cta sm:w-auto">
                                Pay here
                            </button>
                        </section>
                    ) : null}

                    {/* Players table */}
                    {booking.players.length > 0 ? (
                        <section className="form-section">
                            <div className="mb-4">
                                <h3 className="text-sm font-semibold text-foreground">Players</h3>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    All participants in this booking.
                                </p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[380px] border-collapse text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/30">
                                            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                Name
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                Role
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                Invite
                                            </th>
                                            <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                Amount due
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {booking.players.map((p) => (
                                            <tr key={p.id} className="hover:bg-muted/20">
                                                <td className="px-3 py-2.5 text-foreground">
                                                    {p.full_name}
                                                </td>
                                                <td className="px-3 py-2.5 capitalize text-muted-foreground">
                                                    {p.role}
                                                </td>
                                                <td className="px-3 py-2.5 capitalize text-muted-foreground">
                                                    {p.invite_status}
                                                </td>
                                                <td className="px-3 py-2.5 text-right text-foreground">
                                                    {formatCurrency(p.amount_due)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    ) : null}

                    <div className="flex justify-start border-t border-border pt-5">
                        <button type="button" onClick={onBack} className="btn-outline">
                            Back
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}
