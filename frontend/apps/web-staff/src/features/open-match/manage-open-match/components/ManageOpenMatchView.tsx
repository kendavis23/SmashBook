import type { JSX } from "react";
import { useState } from "react";
import { CalendarDays, UserRound, UsersRound } from "lucide-react";
import { Breadcrumb, AlertToast, formatUTCDate, formatUTCTime, formatCurrency } from "@repo/ui";
import type { Booking } from "../../types";
import { BOOKING_STATUS_COLORS, BOOKING_STATUS_LABELS, BOOKING_TYPE_LABELS } from "../../types";
import { PlayerAutocomplete } from "../../../booking/components/PlayerAutocomplete";

const sectionShellCls =
    "rounded-xl border border-border/80 bg-card/95 p-4 shadow-sm shadow-black/5 sm:p-5";

const sectionHeaderCls =
    "mb-4 flex items-start justify-between gap-3 border-b border-border/60 pb-3";

const sectionKickerCls = "text-[11px] font-semibold uppercase tracking-wide text-cta";

function PlayersTable({ players }: { players: Booking["players"] }): JSX.Element {
    const getInitials = (name: string): string =>
        name
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase() || "P";

    const formatStatus = (value?: string | null): string =>
        value
            ? value
                  .split("_")
                  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                  .join(" ")
            : "—";

    const statusPillCls = (value?: string | null): string => {
        const normalized = value?.toLowerCase();

        if (normalized === "paid" || normalized === "accepted" || normalized === "confirmed") {
            return "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20";
        }

        if (normalized === "pending" || normalized === "invited") {
            return "bg-amber-500/10 text-amber-700 ring-amber-500/20";
        }

        if (normalized === "declined" || normalized === "cancelled" || normalized === "failed") {
            return "bg-destructive/10 text-destructive ring-destructive/20";
        }

        return "bg-muted/40 text-muted-foreground ring-border/70";
    };

    return (
        <div className="overflow-hidden rounded-lg border border-border/70 bg-background">
            <div className="flex items-center gap-2 border-b border-border/70 bg-muted/15 px-3 py-2">
                <UserRound size={14} className="text-muted-foreground" />
                <span className="text-xs font-semibold text-foreground">Player details</span>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
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
                            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Payment
                            </th>
                            <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Amount
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {players.map((p) => (
                            <tr key={p.id} className="transition hover:bg-muted/15">
                                <td className="px-3 py-2">
                                    <div className="flex items-center gap-2">
                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cta/10 text-xs font-semibold text-cta ring-1 ring-cta/20">
                                            {getInitials(p.full_name)}
                                        </span>
                                        <span className="min-w-0 truncate font-medium text-foreground">
                                            {p.full_name}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-3 py-2">
                                    <span className="inline-flex h-6 items-center rounded-full bg-muted/40 px-2.5 text-[11px] font-semibold capitalize text-foreground ring-1 ring-border/70">
                                        {formatStatus(p.role)}
                                    </span>
                                </td>
                                <td className="px-3 py-2">
                                    <span
                                        className={`inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-semibold ring-1 ${statusPillCls(
                                            p.invite_status
                                        )}`}
                                    >
                                        {formatStatus(p.invite_status)}
                                    </span>
                                </td>
                                <td className="px-3 py-2">
                                    <span
                                        className={`inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-semibold ring-1 ${statusPillCls(
                                            p.payment_status
                                        )}`}
                                    >
                                        {formatStatus(p.payment_status)}
                                    </span>
                                </td>
                                <td className="px-3 py-2 text-right text-foreground">
                                    <span className="font-semibold">
                                        {formatCurrency(p.amount_due)}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

type Props = {
    booking: Booking;
    apiError: string;
    isInviting: boolean;
    onInvitePlayer: (playerId: string) => void;
    onDismissError: () => void;
    onBack: () => void;
    clubId?: string | null;
};

export default function ManageOpenMatchView({
    booking,
    apiError,
    isInviting,
    onInvitePlayer,
    onDismissError,
    onBack,
    clubId,
}: Props): JSX.Element {
    const [playerId, setPlayerId] = useState("");
    const statusColors = BOOKING_STATUS_COLORS[booking.status] ?? {
        bg: "bg-warning/15",
        text: "text-warning",
    };
    const bookingTime = `${formatUTCTime(booking.start_datetime)} - ${formatUTCTime(booking.end_datetime)}`;

    return (
        <div className="w-full space-y-5">
            <Breadcrumb
                items={[{ label: "Open Matches", onClick: onBack }, { label: "Manage Open Match" }]}
            />

            <section className="w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg shadow-black/5">
                <header className="relative overflow-hidden border-b border-border bg-muted/15 px-4 py-4 sm:px-6">
                    <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.14),transparent_42%)] sm:block" />
                    <div className="relative flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div className="min-w-0">
                            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-sm">
                                <CalendarDays size={13} className="text-cta" />
                                Manage open match
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                                    {booking.court_name}
                                </h1>
                                <span
                                    className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors.bg} ${statusColors.text}`}
                                >
                                    {BOOKING_STATUS_LABELS[booking.status] ?? booking.status}
                                </span>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="bg-background/40 px-4 py-5 sm:px-6">
                    <div className="space-y-4">
                        {apiError ? (
                            <AlertToast title={apiError} variant="error" onClose={onDismissError} />
                        ) : null}

                        <div className="grid gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,7fr)]">
                            <div className="space-y-5">
                                <section className={sectionShellCls}>
                                    <div className={sectionHeaderCls}>
                                        <div>
                                            <p className={sectionKickerCls}>Details</p>
                                            <h3 className="mt-1 text-base font-semibold text-foreground">
                                                Overview
                                            </h3>
                                        </div>
                                    </div>
                                    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2.5">
                                            <dt className="text-xs font-medium text-muted-foreground">
                                                Type
                                            </dt>
                                            <dd className="mt-0.5 text-sm text-foreground">
                                                {BOOKING_TYPE_LABELS[booking.booking_type] ??
                                                    booking.booking_type}
                                                <span className="ml-1.5 rounded-full bg-cta/15 px-1.5 py-0.5 text-[10px] font-medium text-cta">
                                                    Open
                                                </span>
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
                                        <div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2.5">
                                            <dt className="text-xs font-medium text-muted-foreground">
                                                Date
                                            </dt>
                                            <dd className="mt-0.5 text-sm text-foreground">
                                                {formatUTCDate(booking.start_datetime)}
                                            </dd>
                                        </div>
                                        <div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2.5">
                                            <dt className="text-xs font-medium text-muted-foreground">
                                                Time
                                            </dt>
                                            <dd className="mt-0.5 text-sm text-foreground">
                                                {bookingTime}
                                            </dd>
                                        </div>
                                        <div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2.5">
                                            <dt className="text-xs font-medium text-muted-foreground">
                                                Players
                                            </dt>
                                            <dd className="mt-0.5 text-sm text-foreground">
                                                {booking.players.length}
                                                {booking.max_players != null
                                                    ? ` / ${booking.max_players}`
                                                    : ""}
                                            </dd>
                                        </div>
                                        <div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2.5">
                                            <dt className="text-xs font-medium text-muted-foreground">
                                                Total price
                                            </dt>
                                            <dd className="mt-0.5 text-sm text-foreground">
                                                {formatCurrency(booking.total_price)}
                                            </dd>
                                        </div>
                                        {booking.min_skill_level != null ||
                                        booking.max_skill_level != null ? (
                                            <div className="sm:col-span-2 rounded-lg border border-border/70 bg-background/70 px-3 py-2.5">
                                                <dt className="text-xs font-medium text-muted-foreground">
                                                    Skill range
                                                </dt>
                                                <dd className="mt-0.5 text-sm text-foreground">
                                                    {booking.min_skill_level ?? "—"} &ndash;{" "}
                                                    {booking.max_skill_level ?? "—"}
                                                </dd>
                                            </div>
                                        ) : null}
                                    </dl>
                                </section>

                                <section className={sectionShellCls}>
                                    <div className={sectionHeaderCls}>
                                        <div>
                                            <p className={sectionKickerCls}>Participants</p>
                                            <h3 className="mt-1 text-base font-semibold text-foreground">
                                                Invite Player
                                            </h3>
                                        </div>
                                        <UsersRound
                                            size={18}
                                            className="mt-1 text-muted-foreground"
                                        />
                                    </div>
                                    <form
                                        className="flex flex-col gap-3 sm:flex-row sm:items-end xl:flex-col xl:items-stretch 2xl:flex-row 2xl:items-end"
                                        onSubmit={(event) => {
                                            event.preventDefault();
                                            onInvitePlayer(playerId);
                                        }}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <label
                                                htmlFor="open-match-invite-player-id"
                                                className="mb-1 block text-sm font-medium text-foreground"
                                            >
                                                Player
                                            </label>
                                            <PlayerAutocomplete
                                                inputId="open-match-invite-player-id"
                                                label="Player"
                                                clubId={clubId}
                                                value={playerId}
                                                disabled={isInviting}
                                                onChange={setPlayerId}
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

                                {booking.notes ? (
                                    <section className={sectionShellCls}>
                                        <div className={sectionHeaderCls}>
                                            <div>
                                                <p className={sectionKickerCls}>Staff notes</p>
                                                <h3 className="mt-1 text-base font-semibold text-foreground">
                                                    Notes
                                                </h3>
                                            </div>
                                        </div>
                                        <div className="whitespace-pre-wrap rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
                                            {booking.notes}
                                        </div>
                                    </section>
                                ) : null}

                                <div className="mt-5 flex items-center justify-end gap-3 border-t border-border/70 pt-5">
                                    <button type="button" onClick={onBack} className="btn-outline">
                                        Back
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-5">
                                <section className={sectionShellCls}>
                                    <div className={sectionHeaderCls}>
                                        <div>
                                            <p className={sectionKickerCls}>Participants</p>
                                            <h3 className="mt-1 text-base font-semibold text-foreground">
                                                Players
                                            </h3>
                                        </div>
                                        <div className="flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground">
                                            <UsersRound size={13} className="text-cta" />
                                            {booking.players.length}
                                            {booking.max_players != null
                                                ? ` / ${booking.max_players}`
                                                : ""}
                                        </div>
                                    </div>

                                    {booking.players.length > 0 ? (
                                        <PlayersTable players={booking.players} />
                                    ) : (
                                        <div className="rounded-lg border border-dashed border-border/80 bg-background/60 px-4 py-8 text-center">
                                            <UsersRound
                                                size={24}
                                                className="mx-auto text-muted-foreground"
                                            />
                                            <p className="mt-2 text-sm font-medium text-foreground">
                                                No players yet
                                            </p>
                                        </div>
                                    )}
                                </section>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
