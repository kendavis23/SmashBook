import type { FormEvent, JSX } from "react";
import { useMemo, useState } from "react";
import { CalendarDays, Clock3, RefreshCw, RotateCcw, UsersRound } from "lucide-react";
import {
    Breadcrumb,
    AlertToast,
    ConfirmDeleteModal,
    DatePicker,
    formatUTCDate,
    formatUTCTime,
    formatCurrency,
    SelectInput,
} from "@repo/ui";
import type { Booking, TimeSlot } from "../../types";
import { BOOKING_STATUS_COLORS, BOOKING_STATUS_LABELS, BOOKING_TYPE_LABELS } from "../../types";
import { formatSlotTime } from "../../utils/slotTime";
import { PlayerAutocomplete } from "../../components/PlayerAutocomplete";
import { ManageBookingModalView } from "./ManageBookingModalView";

const fieldCls =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground " +
    "placeholder:text-muted-foreground transition focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta-ring/30";

const labelCls = "mb-1 block text-sm font-medium text-foreground";

const sectionShellCls =
    "rounded-xl border border-border/80 bg-card/95 p-4 shadow-sm shadow-black/5 sm:p-5";

const sectionHeaderCls =
    "mb-4 flex items-start justify-between gap-3 border-b border-border/60 pb-3";

const sectionKickerCls = "text-[11px] font-semibold uppercase tracking-wide text-cta";

export type ManageBookingFormState = {
    courtId: string;
    bookingDate: string;
    startTime: string;
    notes: string;
    eventName: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
};

type Props = {
    booking: Booking;
    courts: { id: string; name: string }[];
    slots: TimeSlot[];
    slotsLoading: boolean;
    form: ManageBookingFormState;
    isDirty: boolean;
    apiError: string;
    updateSuccess: boolean;
    isUpdating: boolean;
    isInviting: boolean;
    isCancelling: boolean;
    showCancelConfirm: boolean;
    onFormChange: (patch: Partial<ManageBookingFormState>) => void;
    onInvitePlayer: (playerId: string) => void;
    onSubmit: (e: FormEvent) => void;
    onCancelBooking: () => void;
    onConfirmCancel: () => void;
    onDismissCancelConfirm: () => void;
    onDismissError: () => void;
    onDismissSuccess?: () => void;
    onBack: () => void;
    onRefresh: () => void;
    onRefreshSlots: () => void;
    selectedPrice: number | string | null;
    clubId?: string | null;
    mode?: "page" | "modal";
    onClose?: () => void;
};

export default function ManageBookingView({
    booking,
    courts,
    slots,
    slotsLoading,
    form,
    isDirty,
    apiError,
    updateSuccess,
    isUpdating,
    isInviting,
    isCancelling,
    showCancelConfirm,
    onFormChange,
    onInvitePlayer,
    onSubmit,
    onCancelBooking,
    onConfirmCancel,
    onDismissCancelConfirm,
    onDismissError,
    onDismissSuccess,
    onBack,
    onRefresh,
    onRefreshSlots,
    selectedPrice,
    clubId,
    mode = "page",
    onClose,
}: Props): JSX.Element {
    const [playerId, setPlayerId] = useState("");
    const statusColors = BOOKING_STATUS_COLORS[booking.status] ?? BOOKING_STATUS_COLORS["pending"]!;
    const isCancellable = booking.status !== "cancelled" && booking.status !== "completed";
    const isEditable = booking.status !== "cancelled" && booking.status !== "completed";
    const bookingTime = `${formatUTCTime(booking.start_datetime)} - ${formatUTCTime(booking.end_datetime)}`;
    const todayStr = useMemo(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }, []);

    const overviewSection = (
        <section className={sectionShellCls}>
            <div className={sectionHeaderCls}>
                <div>
                    <p className={sectionKickerCls}>Details</p>
                    <h3 className="mt-1 text-base font-semibold text-foreground">Overview</h3>
                </div>
            </div>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2.5">
                    <dt className="text-xs font-medium text-muted-foreground">Type</dt>
                    <dd className="mt-0.5 text-sm text-foreground">
                        {BOOKING_TYPE_LABELS[booking.booking_type] ?? booking.booking_type}
                        {booking.is_open_game ? (
                            <span className="ml-1.5 rounded-full bg-cta/15 px-1.5 py-0.5 text-[10px] font-medium text-cta">
                                Open
                            </span>
                        ) : null}
                    </dd>
                </div>
                <div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2.5">
                    <dt className="text-xs font-medium text-muted-foreground">Slots available</dt>
                    <dd
                        className={`mt-0.5 text-sm ${booking.slots_available === 0 ? "text-destructive" : "text-foreground"}`}
                    >
                        {booking.slots_available}
                    </dd>
                </div>
                <div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2.5">
                    <dt className="text-xs font-medium text-muted-foreground">Date</dt>
                    <dd className="mt-0.5 text-sm text-foreground">
                        {formatUTCDate(booking.start_datetime)}
                    </dd>
                </div>
                <div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2.5">
                    <dt className="text-xs font-medium text-muted-foreground">Time</dt>
                    <dd className="mt-0.5 text-sm text-foreground">{bookingTime}</dd>
                </div>
                <div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2.5">
                    <dt className="text-xs font-medium text-muted-foreground">Players</dt>
                    <dd className="mt-0.5 text-sm text-foreground">
                        {booking.players.length}
                        {booking.max_players != null ? ` / ${booking.max_players}` : ""}
                    </dd>
                </div>
                <div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2.5">
                    <dt className="text-xs font-medium text-muted-foreground">Total price</dt>
                    <dd className="mt-0.5 text-sm text-foreground">
                        {formatCurrency(booking.total_price)}
                    </dd>
                </div>
                {booking.min_skill_level != null || booking.max_skill_level != null ? (
                    <div className="sm:col-span-2 rounded-lg border border-border/70 bg-background/70 px-3 py-2.5">
                        <dt className="text-xs font-medium text-muted-foreground">Skill range</dt>
                        <dd className="mt-0.5 text-sm text-foreground">
                            {booking.min_skill_level ?? "—"} &ndash;{" "}
                            {booking.max_skill_level ?? "—"}
                        </dd>
                    </div>
                ) : null}
                {booking.event_name ? (
                    <div className="sm:col-span-2 rounded-lg border border-border/70 bg-background/70 px-3 py-2.5">
                        <dt className="text-xs font-medium text-muted-foreground">Event name</dt>
                        <dd className="mt-0.5 text-sm text-foreground">{booking.event_name}</dd>
                    </div>
                ) : null}
                {booking.notes ? (
                    <div className="sm:col-span-2 rounded-lg border border-border/70 bg-background/70 px-3 py-2.5">
                        <dt className="text-xs font-medium text-muted-foreground">Notes</dt>
                        <dd className="mt-0.5 text-sm text-foreground whitespace-pre-wrap">
                            {booking.notes}
                        </dd>
                    </div>
                ) : null}
            </dl>
        </section>
    );

    const inviteSection =
        booking.is_open_game && booking.status === "pending" ? (
            <section className={sectionShellCls}>
                <div className={sectionHeaderCls}>
                    <div>
                        <p className={sectionKickerCls}>Participants</p>
                        <h3 className="mt-1 text-base font-semibold text-foreground">
                            Invite Player
                        </h3>
                    </div>
                    <UsersRound size={18} className="mt-1 text-muted-foreground" />
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
                            htmlFor="booking-invite-player-id"
                            className="mb-1 block text-sm font-medium text-foreground"
                        >
                            Player
                        </label>
                        <PlayerAutocomplete
                            inputId="booking-invite-player-id"
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
        ) : null;

    const playersSection =
        booking.players.length > 0 ? (
            <section className={sectionShellCls}>
                <div className={sectionHeaderCls}>
                    <div>
                        <p className={sectionKickerCls}>Participants</p>
                        <h3 className="mt-1 text-base font-semibold text-foreground">Players</h3>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse text-sm">
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
                                    <td className="px-3 py-2.5 text-foreground">{p.full_name}</td>
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
        ) : null;

    if (mode === "modal") {
        return (
            <ManageBookingModalView
                booking={booking}
                courts={courts}
                slots={slots}
                slotsLoading={slotsLoading}
                form={form}
                isDirty={isDirty}
                apiError={apiError}
                updateSuccess={updateSuccess}
                isUpdating={isUpdating}
                isInviting={isInviting}
                isCancelling={isCancelling}
                showCancelConfirm={showCancelConfirm}
                onFormChange={onFormChange}
                onInvitePlayer={onInvitePlayer}
                onSubmit={onSubmit}
                onCancelBooking={onCancelBooking}
                onConfirmCancel={onConfirmCancel}
                onDismissCancelConfirm={onDismissCancelConfirm}
                onDismissError={onDismissError}
                onDismissSuccess={onDismissSuccess ?? (() => {})}
                onBack={onBack}
                onClose={onClose ?? onBack}
                onRefresh={onRefresh}
                onRefreshSlots={onRefreshSlots}
                selectedPrice={selectedPrice}
                clubId={clubId}
            />
        );
    }

    return (
        <div className="w-full space-y-5">
            <Breadcrumb
                items={[{ label: "Bookings", onClick: onBack }, { label: "Manage Booking" }]}
            />

            <section className="w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg shadow-black/5">
                <header className="relative overflow-hidden border-b border-border bg-muted/15 px-4 py-4 sm:px-6">
                    <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.14),transparent_42%)] sm:block" />
                    <div className="relative flex flex-row items-center justify-between gap-4">
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
                                    {BOOKING_STATUS_LABELS[booking.status] ?? booking.status}
                                </span>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 ml-auto">
                            <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                                <button
                                    type="button"
                                    onClick={onRefresh}
                                    className="btn-outline min-h-10 px-4"
                                    aria-label="Refresh booking"
                                >
                                    <RotateCcw size={14} /> Refresh
                                </button>
                                {isCancellable ? (
                                    <button
                                        type="button"
                                        onClick={onCancelBooking}
                                        disabled={isCancelling}
                                        className="btn-destructive whitespace-nowrap"
                                    >
                                        {isCancelling ? "Cancelling…" : "Cancel Booking"}
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </header>

                <div className="bg-background/40 px-4 py-5 sm:px-6">
                    <div className="space-y-4">
                        {apiError ? (
                            <AlertToast title={apiError} variant="error" onClose={onDismissError} />
                        ) : null}
                        {updateSuccess ? (
                            <AlertToast
                                title="Booking updated successfully."
                                variant="success"
                                onClose={() => {
                                    /* auto-dismiss handled by container */
                                }}
                            />
                        ) : null}

                        {isEditable ? (
                            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)]">
                                {/* Left — edit form */}
                                <div>
                                    <form onSubmit={onSubmit} noValidate>
                                        <section className={sectionShellCls}>
                                            <div className={sectionHeaderCls}>
                                                <div>
                                                    <p className={sectionKickerCls}>Details</p>
                                                    <h3 className="mt-1 text-base font-semibold text-foreground">
                                                        Core Details
                                                    </h3>
                                                    <p className="mt-1 text-sm text-muted-foreground">
                                                        Update court, start time, client details,
                                                        and notes.
                                                    </p>
                                                </div>
                                                <Clock3
                                                    size={18}
                                                    className="mt-1 text-muted-foreground"
                                                />
                                            </div>
                                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                <div>
                                                    <label htmlFor="mb-court" className={labelCls}>
                                                        Court
                                                    </label>
                                                    <SelectInput
                                                        value={form.courtId}
                                                        onValueChange={(v) =>
                                                            onFormChange({
                                                                courtId: v,
                                                                startTime: "",
                                                            })
                                                        }
                                                        options={courts.map((c) => ({
                                                            value: c.id,
                                                            label: c.name,
                                                        }))}
                                                    />
                                                </div>
                                                <div>
                                                    <label htmlFor="mb-date" className={labelCls}>
                                                        Date
                                                    </label>
                                                    <DatePicker
                                                        value={form.bookingDate}
                                                        onChange={(v) =>
                                                            onFormChange({
                                                                bookingDate: v,
                                                                startTime: "",
                                                            })
                                                        }
                                                        minDate={todayStr}
                                                    />
                                                </div>
                                                <div>
                                                    <div className="mb-1 flex items-center justify-between">
                                                        <label className="text-sm font-medium text-foreground">
                                                            Start Time
                                                        </label>
                                                        {form.bookingDate ? (
                                                            <button
                                                                type="button"
                                                                onClick={onRefreshSlots}
                                                                disabled={slotsLoading}
                                                                title="Refresh available slots"
                                                                className="text-muted-foreground transition hover:text-foreground disabled:opacity-40"
                                                            >
                                                                <RefreshCw
                                                                    size={13}
                                                                    className={
                                                                        slotsLoading
                                                                            ? "animate-spin"
                                                                            : ""
                                                                    }
                                                                />
                                                            </button>
                                                        ) : null}
                                                    </div>
                                                    {!form.bookingDate ? (
                                                        <div
                                                            className={`${fieldCls} cursor-not-allowed opacity-50`}
                                                        >
                                                            <span className="text-muted-foreground">
                                                                —
                                                            </span>
                                                        </div>
                                                    ) : slotsLoading ? (
                                                        <div className={`${fieldCls} opacity-60`}>
                                                            <span className="text-muted-foreground">
                                                                Loading…
                                                            </span>
                                                        </div>
                                                    ) : slots.length === 0 ? (
                                                        <div className={`${fieldCls} opacity-60`}>
                                                            <span className="text-muted-foreground">
                                                                No slots
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <SelectInput
                                                            value={form.startTime}
                                                            onValueChange={(v) =>
                                                                onFormChange({ startTime: v })
                                                            }
                                                            placeholder="Select time"
                                                            options={slots.map((slot) => ({
                                                                value: slot.start_time,
                                                                label:
                                                                    formatSlotTime(
                                                                        slot.start_time
                                                                    ) +
                                                                    (!slot.is_available
                                                                        ? " — Booked"
                                                                        : ""),
                                                                disabled: !slot.is_available,
                                                            }))}
                                                        />
                                                    )}
                                                </div>
                                                <div>
                                                    <label className={labelCls}>Price</label>
                                                    <div
                                                        className={`${fieldCls} cursor-default select-none opacity-80`}
                                                    >
                                                        {form.startTime
                                                            ? formatCurrency(selectedPrice)
                                                            : "—"}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-5 border-t border-border/70 pt-4">
                                                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                                                    <div>
                                                        <p className={sectionKickerCls}>
                                                            Client details
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                    <div className="md:col-span-2">
                                                        <label
                                                            htmlFor="mb-event-name"
                                                            className={labelCls}
                                                        >
                                                            Event name
                                                        </label>
                                                        <input
                                                            id="mb-event-name"
                                                            type="text"
                                                            className={fieldCls}
                                                            placeholder="e.g. Friday Corporate Cup"
                                                            value={form.eventName}
                                                            onChange={(e) =>
                                                                onFormChange({
                                                                    eventName: e.target.value,
                                                                })
                                                            }
                                                        />
                                                    </div>
                                                    <div>
                                                        <label
                                                            htmlFor="mb-contact-name"
                                                            className={labelCls}
                                                        >
                                                            Contact name
                                                        </label>
                                                        <input
                                                            id="mb-contact-name"
                                                            type="text"
                                                            className={fieldCls}
                                                            value={form.contactName}
                                                            onChange={(e) =>
                                                                onFormChange({
                                                                    contactName: e.target.value,
                                                                })
                                                            }
                                                        />
                                                    </div>
                                                    <div>
                                                        <label
                                                            htmlFor="mb-contact-email"
                                                            className={labelCls}
                                                        >
                                                            Contact email
                                                        </label>
                                                        <input
                                                            id="mb-contact-email"
                                                            type="email"
                                                            className={fieldCls}
                                                            value={form.contactEmail}
                                                            onChange={(e) =>
                                                                onFormChange({
                                                                    contactEmail: e.target.value,
                                                                })
                                                            }
                                                        />
                                                    </div>
                                                    <div>
                                                        <label
                                                            htmlFor="mb-contact-phone"
                                                            className={labelCls}
                                                        >
                                                            Contact phone
                                                        </label>
                                                        <input
                                                            id="mb-contact-phone"
                                                            type="tel"
                                                            className={fieldCls}
                                                            value={form.contactPhone}
                                                            onChange={(e) =>
                                                                onFormChange({
                                                                    contactPhone: e.target.value,
                                                                })
                                                            }
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-5 border-t border-border/70 pt-4">
                                                <div className="mb-3">
                                                    <p className={sectionKickerCls}>Staff notes</p>
                                                    <h3 className="mt-1 text-sm font-semibold text-foreground">
                                                        Notes
                                                    </h3>
                                                </div>
                                                <textarea
                                                    id="mb-notes"
                                                    rows={3}
                                                    className={fieldCls}
                                                    placeholder="Internal notes visible to staff only…"
                                                    value={form.notes}
                                                    onChange={(e) =>
                                                        onFormChange({ notes: e.target.value })
                                                    }
                                                />
                                            </div>
                                        </section>

                                        <div className="mt-5 flex items-center justify-end gap-3 border-t border-border/70 pt-5">
                                            <button
                                                type="button"
                                                onClick={onBack}
                                                className="btn-outline"
                                            >
                                                Back
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={!isDirty || isUpdating}
                                                className="btn-cta disabled:opacity-50"
                                            >
                                                {isUpdating ? "Saving…" : "Save Changes"}
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                {/* Right — overview + invite + players */}
                                <div className="space-y-5">
                                    {overviewSection}
                                    {inviteSection}
                                    {playersSection}
                                </div>
                            </div>
                        ) : (
                            /* Read-only: single full-width column — overview, players, back */
                            <div className="space-y-5">
                                {overviewSection}
                                {inviteSection}
                                {playersSection}
                                <div className="flex justify-start border-t border-border/70 pt-5">
                                    <button
                                        type="button"
                                        onClick={onBack}
                                        className="btn-outline"
                                    >
                                        Back
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {showCancelConfirm ? (
                <ConfirmDeleteModal
                    title="Cancel this booking?"
                    description="The booking will be cancelled. Players will lose their reserved slots. This cannot be undone."
                    saving={isCancelling}
                    onConfirm={onConfirmCancel}
                    onCancel={onDismissCancelConfirm}
                />
            ) : null}
        </div>
    );
}
