import type { JSX } from "react";
import { useState } from "react";
import { Swords, X, ChevronDown, ChevronUp } from "lucide-react";
import {
    AlertToast,
    StatPill,
    formatUTCDateTime,
    formatUTCDate,
    formatUTCTime,
    formatCurrency,
} from "@repo/ui";
import type { Booking } from "../../types";

const BOOKING_STATUS_LABELS: Record<string, string> = {
    pending: "Pending",
    confirmed: "Confirmed",
    cancelled: "Cancelled",
    completed: "Completed",
};

const BOOKING_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    pending: { bg: "bg-warning/15", text: "text-warning" },
    confirmed: { bg: "bg-success/15", text: "text-success" },
    cancelled: { bg: "bg-destructive/15", text: "text-destructive" },
    completed: { bg: "bg-info/15", text: "text-info" },
};

const fieldCls =
    "w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground " +
    "cursor-default select-none opacity-80";

const labelCls = "mb-1 block text-sm font-medium text-foreground";

type Props = {
    booking: Booking;
    apiError: string;
    isInviting: boolean;
    onInvitePlayer: (playerId: string) => void;
    onDismissError: () => void;
    onClose: () => void;
};

export function ManageOpenMatchModalView({
    booking,
    apiError,
    isInviting,
    onInvitePlayer,
    onDismissError,
    onClose,
}: Props): JSX.Element {
    const [playersExpanded, setPlayersExpanded] = useState(false);
    const [playerId, setPlayerId] = useState("");

    const statusColors = BOOKING_STATUS_COLORS[booking.status] ?? {
        bg: "bg-warning/15",
        text: "text-warning",
    };

    return (
        <div className="flex h-full flex-col">
            {/* ── Sticky header ── */}
            <div className="shrink-0 border-b border-border px-6 pb-5 pt-6">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                            <Swords size={18} />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-lg font-semibold text-foreground">
                                    {booking.court_name}
                                </h2>
                                <span
                                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusColors.bg} ${statusColors.text}`}
                                >
                                    {BOOKING_STATUS_LABELS[booking.status] ?? booking.status}
                                </span>
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                {formatUTCDateTime(booking.start_datetime)} &ndash;{" "}
                                {formatUTCDateTime(booking.end_datetime)}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close modal"
                        className="shrink-0 rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* ── Scrollable body ── */}
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                {apiError ? (
                    <div className="mb-4">
                        <AlertToast title={apiError} variant="error" onClose={onDismissError} />
                    </div>
                ) : null}

                <div className="space-y-5">
                    {/* Context pills */}
                    <div className="grid grid-cols-4 gap-2">
                        <StatPill label="Court" value={booking.court_name} />
                        <StatPill label="Date" value={formatUTCDate(booking.start_datetime)} />
                        <StatPill label="Start" value={formatUTCTime(booking.start_datetime)} />
                        <StatPill label="End" value={formatUTCTime(booking.end_datetime)} />
                    </div>

                    {/* Game details */}
                    <div>
                        <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Game Details
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelCls}>Slots Available</label>
                                <div className={fieldCls}>{booking.slots_available}</div>
                            </div>
                            <div>
                                <label className={labelCls}>Max Players</label>
                                <div className={fieldCls}>{booking.max_players ?? "—"}</div>
                            </div>
                            <div>
                                <label className={labelCls}>Min Skill Level</label>
                                <div className={fieldCls}>{booking.min_skill_level ?? "—"}</div>
                            </div>
                            <div>
                                <label className={labelCls}>Max Skill Level</label>
                                <div className={fieldCls}>{booking.max_skill_level ?? "—"}</div>
                            </div>
                            <div>
                                <label className={labelCls}>Total Price</label>
                                <div className={fieldCls}>
                                    {formatCurrency(booking.total_price)}
                                </div>
                            </div>
                            <div>
                                <label className={labelCls}>Booking Type</label>
                                <div className={fieldCls}>{booking.booking_type}</div>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    {booking.notes ? (
                        <div>
                            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Notes
                            </p>
                            <div className={`${fieldCls} whitespace-pre-wrap`}>{booking.notes}</div>
                        </div>
                    ) : null}

                    {/* Invite player */}
                    <div>
                        <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Invite Player
                        </p>
                        <form
                            className="flex flex-col gap-3 sm:flex-row sm:items-end"
                            onSubmit={(event) => {
                                event.preventDefault();
                                onInvitePlayer(playerId);
                            }}
                        >
                            <div className="min-w-0 sm:w-[70%]">
                                <label className={labelCls} htmlFor="open-match-modal-player-id">
                                    Player ID
                                </label>
                                <input
                                    id="open-match-modal-player-id"
                                    type="text"
                                    value={playerId}
                                    onChange={(event) => setPlayerId(event.target.value)}
                                    placeholder="3fa85f64-5717-4562-b3fc-2c963f66afa6"
                                    className="input-base"
                                    disabled={isInviting}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isInviting || !playerId.trim()}
                                className="btn-cta sm:w-auto"
                            >
                                {isInviting ? "Inviting…" : "Invite"}
                            </button>
                        </form>
                    </div>

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
                                    <table className="w-full min-w-[380px] border-collapse text-sm">
                                        <thead>
                                            <tr className="bg-muted/10">
                                                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                                    Name
                                                </th>
                                                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                                    Role
                                                </th>
                                                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                                    Payment
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
                                                        {p.payment_status}
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
            <div className="shrink-0 flex items-center justify-end gap-3 border-t border-border px-6 py-4">
                <button type="button" onClick={onClose} className="btn-outline">
                    Close
                </button>
            </div>
        </div>
    );
}
