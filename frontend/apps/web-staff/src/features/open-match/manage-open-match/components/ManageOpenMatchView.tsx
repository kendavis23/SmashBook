import type { JSX } from "react";
import { useState } from "react";
import { Breadcrumb, AlertToast, formatUTCDateTime, formatCurrency } from "@repo/ui";
import type { Booking } from "../../types";
import { BOOKING_STATUS_COLORS, BOOKING_STATUS_LABELS, BOOKING_TYPE_LABELS } from "../../types";

type Props = {
    booking: Booking;
    apiError: string;
    isInviting: boolean;
    onInvitePlayer: (playerId: string) => void;
    onDismissError: () => void;
    onBack: () => void;
};

export default function ManageOpenMatchView({
    booking,
    apiError,
    isInviting,
    onInvitePlayer,
    onDismissError,
    onBack,
}: Props): JSX.Element {
    const [playerId, setPlayerId] = useState("");
    const statusColors = BOOKING_STATUS_COLORS[booking.status] ?? {
        bg: "bg-warning/15",
        text: "text-warning",
    };

    return (
        <div className="w-full space-y-5">
            <Breadcrumb
                items={[{ label: "Open Matches", onClick: onBack }, { label: "Manage Open Match" }]}
            />

            <section className="w-full rounded-xl border border-border bg-card px-6 py-6 shadow-sm sm:px-8">
                <header className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold text-foreground">
                            {booking.court_name}
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {formatUTCDateTime(booking.start_datetime)} &ndash;{" "}
                            {formatUTCDateTime(booking.end_datetime)}
                        </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors.bg} ${statusColors.text}`}
                        >
                            {BOOKING_STATUS_LABELS[booking.status] ?? booking.status}
                        </span>
                    </div>
                </header>

                <div className="mt-5 space-y-4">
                    {apiError ? (
                        <AlertToast title={apiError} variant="error" onClose={onDismissError} />
                    ) : null}

                    <section className="form-section">
                        <div className="mb-4">
                            <h3 className="text-sm font-semibold text-foreground">Overview</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Read-only details for this open match.
                            </p>
                        </div>
                        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <div>
                                <dt className="text-xs font-medium text-muted-foreground">Type</dt>
                                <dd className="mt-0.5 text-sm text-foreground">
                                    {BOOKING_TYPE_LABELS[booking.booking_type] ??
                                        booking.booking_type}
                                    <span className="ml-1.5 rounded-full bg-cta/15 px-1.5 py-0.5 text-[10px] font-medium text-cta">
                                        Open
                                    </span>
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
                                    Slots available
                                </dt>
                                <dd
                                    className={`mt-0.5 text-sm ${booking.slots_available === 0 ? "text-destructive" : "text-foreground"}`}
                                >
                                    {booking.slots_available}
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
                            {booking.min_skill_level != null || booking.max_skill_level != null ? (
                                <div>
                                    <dt className="text-xs font-medium text-muted-foreground">
                                        Skill range
                                    </dt>
                                    <dd className="mt-0.5 text-sm text-foreground">
                                        {booking.min_skill_level ?? "—"} &ndash;{" "}
                                        {booking.max_skill_level ?? "—"}
                                    </dd>
                                </div>
                            ) : null}
                            <div>
                                <dt className="text-xs font-medium text-muted-foreground">
                                    Created
                                </dt>
                                <dd className="mt-0.5 text-sm text-foreground">
                                    {formatUTCDateTime(booking.created_at)}
                                </dd>
                            </div>
                        </dl>
                    </section>

                    <section className="form-section">
                        <div className="mb-4">
                            <h3 className="text-sm font-semibold text-foreground">Invite Player</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Enter a player ID to invite them to this open match.
                            </p>
                        </div>
                        <form
                            className="flex flex-col gap-3 sm:flex-row sm:items-end"
                            onSubmit={(event) => {
                                event.preventDefault();
                                onInvitePlayer(playerId);
                            }}
                        >
                            <div className="min-w-0 sm:w-[70%]">
                                <label
                                    htmlFor="open-match-invite-player-id"
                                    className="mb-1 block text-sm font-medium text-foreground"
                                >
                                    Player ID
                                </label>
                                <input
                                    id="open-match-invite-player-id"
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
                    </section>

                    {booking.players.length > 0 ? (
                        <section className="form-section">
                            <div className="mb-4">
                                <h3 className="text-sm font-semibold text-foreground">Players</h3>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    All participants in this open match.
                                </p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[480px] border-collapse text-sm">
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
                                            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                Payment
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
                                                <td className="px-3 py-2.5 capitalize text-muted-foreground">
                                                    {p.payment_status}
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

                    {booking.notes ? (
                        <section className="form-section">
                            <div className="mb-4">
                                <h3 className="text-sm font-semibold text-foreground">Notes</h3>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Internal notes visible to staff only.
                                </p>
                            </div>
                            <div className="whitespace-pre-wrap rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
                                {booking.notes}
                            </div>
                        </section>
                    ) : null}

                    <div className="mt-6 flex items-center justify-end gap-3 border-t border-border pt-5">
                        <button type="button" onClick={onBack} className="btn-outline">
                            Back
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}
