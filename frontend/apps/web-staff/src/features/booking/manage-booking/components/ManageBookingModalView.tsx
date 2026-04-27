import type { FormEvent, JSX } from "react";
import { useMemo, useState } from "react";
import { RefreshCw, RotateCcw, X, ChevronDown, ChevronUp, CalendarCheck } from "lucide-react";
import {
    AlertToast,
    ConfirmDeleteModal,
    DatePicker,
    formatUTCDateTime,
    formatCurrency,
    SelectInput,
    StatPill,
} from "@repo/ui";
import type { Booking, TimeSlot } from "../../types";
import { BOOKING_STATUS_COLORS, BOOKING_STATUS_LABELS, BOOKING_TYPE_LABELS } from "../../types";
import { formatSlotTime } from "../../utils/slotTime";
import type { ManageBookingFormState } from "./ManageBookingView";

const fieldCls =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground " +
    "placeholder:text-muted-foreground transition focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta-ring/30";

const labelCls = "mb-1 block text-sm font-medium text-foreground";

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
    onSubmit: (e: FormEvent) => void;
    onCancelBooking: () => void;
    onConfirmCancel: () => void;
    onDismissCancelConfirm: () => void;
    onDismissError: () => void;
    onDismissSuccess: () => void;
    onBack: () => void;
    onClose: () => void;
    onRefresh: () => void;
    onInvitePlayer: (playerId: string) => void;
    onRefreshSlots: () => void;
    selectedPrice: number | string | null;
};

export function ManageBookingModalView({
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
    onSubmit,
    onCancelBooking,
    onConfirmCancel,
    onDismissCancelConfirm,
    onDismissError,
    onDismissSuccess,
    onBack,
    onClose,
    onRefresh,
    onInvitePlayer,
    onRefreshSlots,
    selectedPrice,
}: Props): JSX.Element {
    const [playersExpanded, setPlayersExpanded] = useState(false);
    const [eventExpanded, setEventExpanded] = useState(false);
    const [notesOpen, setNotesOpen] = useState(Boolean(form.notes));
    const [playerId, setPlayerId] = useState("");

    const statusColors = BOOKING_STATUS_COLORS[booking.status] ?? BOOKING_STATUS_COLORS["pending"]!;
    const isCancellable = booking.status !== "cancelled" && booking.status !== "completed";
    const isEditable = booking.status !== "cancelled" && booking.status !== "completed";
    const todayStr = useMemo(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }, []);

    return (
        <form
            onSubmit={isEditable ? onSubmit : undefined}
            noValidate
            className="flex h-full flex-col"
        >
            {/* ── Sticky header ── */}
            <div className="shrink-0 border-b border-border px-6 pb-5 pt-6">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        {/* Icon badge */}
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                            <CalendarCheck size={18} />
                        </div>
                        {/* Title + subtitle */}
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
                    <div className="flex shrink-0 items-center gap-2">
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
                    {/* Error / success alerts — always first inside space-y-5 */}
                    {apiError ? (
                        <div className="mb-4">
                            <AlertToast title={apiError} variant="error" onClose={onDismissError} />
                        </div>
                    ) : null}
                    {updateSuccess ? (
                        <div className="mb-4">
                            <AlertToast
                                title="Booking updated successfully."
                                variant="success"
                                onClose={onDismissSuccess}
                            />
                        </div>
                    ) : null}

                    {/* Read-only context pills — first content after alerts */}
                    <div
                        className={`grid gap-2 ${booking.is_open_game ? "grid-cols-4" : "grid-cols-3"}`}
                    >
                        <StatPill
                            label="Type"
                            value={
                                BOOKING_TYPE_LABELS[booking.booking_type] ?? booking.booking_type
                            }
                        />
                        <StatPill
                            label="Players"
                            value={
                                String(booking.players.length) +
                                (booking.max_players != null ? ` / ${booking.max_players}` : "")
                            }
                        />
                        <StatPill label="Total" value={formatCurrency(booking.total_price)} />
                        {booking.is_open_game ? (
                            <StatPill
                                label="Open Game"
                                value={
                                    booking.min_skill_level != null ||
                                    booking.max_skill_level != null
                                        ? `Skill ${booking.min_skill_level ?? "—"} – ${booking.max_skill_level ?? "—"}`
                                        : "Open"
                                }
                            />
                        ) : null}
                    </div>

                    {/* Invite Player — only for pending open games */}
                    {booking.is_open_game && booking.status === "pending" ? (
                        <div>
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                                <div className="min-w-0 sm:w-[70%]">
                                    <label className={labelCls} htmlFor="booking-modal-player-id">
                                        Player ID
                                    </label>
                                    <input
                                        id="booking-modal-player-id"
                                        type="text"
                                        value={playerId}
                                        onChange={(event) => setPlayerId(event.target.value)}
                                        placeholder="3fa85f64-5717-4562-b3fc-2c963f66afa6"
                                        className="input-base"
                                        disabled={isInviting}
                                    />
                                </div>
                                <button
                                    type="button"
                                    disabled={isInviting || !playerId.trim()}
                                    className="btn-cta sm:w-auto"
                                    onClick={() => onInvitePlayer(playerId)}
                                >
                                    {isInviting ? "Inviting…" : "Invite"}
                                </button>
                            </div>
                        </div>
                    ) : null}

                    {/* Edit form — only when editable */}
                    {isEditable ? (
                        <>
                            {/* Core Details */}
                            <div>
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className={labelCls}>Court</label>
                                            <SelectInput
                                                value={form.courtId}
                                                onValueChange={(v) =>
                                                    onFormChange({ courtId: v, startTime: "" })
                                                }
                                                options={courts.map((c) => ({
                                                    value: c.id,
                                                    label: c.name,
                                                }))}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelCls}>Price</label>
                                            <div
                                                className={`${fieldCls} cursor-default select-none bg-muted/30 opacity-80`}
                                            >
                                                {form.startTime
                                                    ? formatCurrency(selectedPrice)
                                                    : "—"}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className={labelCls}>Date</label>
                                            <DatePicker
                                                value={form.bookingDate}
                                                onChange={(v) =>
                                                    onFormChange({ bookingDate: v, startTime: "" })
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
                                                        title="Refresh slots"
                                                        className="rounded p-0.5 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-40"
                                                    >
                                                        <RefreshCw
                                                            size={12}
                                                            className={
                                                                slotsLoading ? "animate-spin" : ""
                                                            }
                                                        />
                                                    </button>
                                                ) : null}
                                            </div>
                                            {!form.bookingDate ? (
                                                <div
                                                    className={`${fieldCls} cursor-not-allowed opacity-50`}
                                                >
                                                    <span className="text-muted-foreground">—</span>
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
                                                            formatSlotTime(slot.start_time) +
                                                            (!slot.is_available ? " — Booked" : ""),
                                                        disabled: !slot.is_available,
                                                    }))}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="flex cursor-pointer items-center gap-2">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-border accent-cta"
                                        checked={notesOpen}
                                        onChange={(e) => setNotesOpen(e.target.checked)}
                                    />
                                    <span className="text-sm font-medium text-foreground">
                                        Notes
                                    </span>
                                </label>
                                {notesOpen ? (
                                    <div className="mt-2">
                                        <label htmlFor="mb-notes" className="sr-only">
                                            Booking notes
                                        </label>
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
                                ) : null}
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
                                            <ChevronUp
                                                size={13}
                                                className="text-muted-foreground"
                                            />
                                        ) : (
                                            <ChevronDown
                                                size={13}
                                                className="text-muted-foreground"
                                            />
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
                                                    {booking.players.map((p) => (
                                                        <tr
                                                            key={p.id}
                                                            className="hover:bg-muted/20"
                                                        >
                                                            <td className="px-3 py-2 font-medium text-foreground">
                                                                {p.full_name}
                                                            </td>
                                                            <td className="px-3 py-2 capitalize text-muted-foreground">
                                                                {p.role}
                                                            </td>
                                                            <td className="px-3 py-2 capitalize text-muted-foreground">
                                                                {p.invite_status}
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

                            {/* Event & Contact — collapsible */}
                            <div className="overflow-hidden rounded-lg border border-border">
                                <button
                                    type="button"
                                    className="flex w-full items-center justify-between bg-muted/20 px-4 py-3 text-left transition hover:bg-muted/40"
                                    onClick={() => setEventExpanded((v) => !v)}
                                    aria-expanded={eventExpanded}
                                >
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                        Event &amp; Contact{" "}
                                        <span className="text-[10px] font-normal normal-case opacity-70">
                                            (optional)
                                        </span>
                                    </span>
                                    {eventExpanded ? (
                                        <ChevronUp size={13} className="text-muted-foreground" />
                                    ) : (
                                        <ChevronDown size={13} className="text-muted-foreground" />
                                    )}
                                </button>
                                {eventExpanded ? (
                                    <div className="space-y-3 border-t border-border p-4">
                                        <div>
                                            <label className={labelCls}>Event name</label>
                                            <input
                                                type="text"
                                                className={fieldCls}
                                                placeholder="e.g. Friday Corporate Cup"
                                                value={form.eventName}
                                                onChange={(e) =>
                                                    onFormChange({ eventName: e.target.value })
                                                }
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className={labelCls}>Contact name</label>
                                                <input
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
                                                <label className={labelCls}>Contact email</label>
                                                <input
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
                                        </div>
                                        <div>
                                            <label className={labelCls}>Contact phone</label>
                                            <input
                                                type="tel"
                                                className={fieldCls}
                                                value={form.contactPhone}
                                                onChange={(e) =>
                                                    onFormChange({ contactPhone: e.target.value })
                                                }
                                            />
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </>
                    ) : null}

                    {/* Read-only court details when not editable */}
                    {!isEditable ? (
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <p className={labelCls}>Court</p>
                                <div
                                    className={`${fieldCls} cursor-default select-none opacity-80`}
                                >
                                    {booking.court_name}
                                </div>
                            </div>
                            <div>
                                <p className={labelCls}>Price</p>
                                <div
                                    className={`${fieldCls} cursor-default select-none opacity-80`}
                                >
                                    {formatCurrency(booking.total_price)}
                                </div>
                            </div>
                            <div>
                                <p className={labelCls}>Date</p>
                                <div
                                    className={`${fieldCls} cursor-default select-none opacity-80`}
                                >
                                    {formatUTCDateTime(booking.start_datetime)}
                                </div>
                            </div>
                            <div>
                                <p className={labelCls}>End Time</p>
                                <div
                                    className={`${fieldCls} cursor-default select-none opacity-80`}
                                >
                                    {formatUTCDateTime(booking.end_datetime)}
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {/* Players — always shown (read-only when not editable) */}
                    {!isEditable && booking.players.length > 0 ? (
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
            <div className="shrink-0 flex items-center justify-between border-t border-border px-6 py-4">
                {isCancellable && isEditable ? (
                    <button
                        type="button"
                        onClick={onCancelBooking}
                        disabled={isCancelling}
                        className="btn-destructive"
                    >
                        {isCancelling ? "Cancelling…" : "Cancel Booking"}
                    </button>
                ) : (
                    <span />
                )}
                <div className="flex items-center gap-2">
                    <button type="button" onClick={onBack} className="btn-outline">
                        Close
                    </button>
                    {isEditable ? (
                        <button
                            type="submit"
                            disabled={!isDirty || isUpdating}
                            className="btn-cta disabled:opacity-50"
                        >
                            {isUpdating ? "Saving…" : "Save Changes"}
                        </button>
                    ) : null}
                </div>
            </div>

            {showCancelConfirm ? (
                <ConfirmDeleteModal
                    title="Cancel this booking?"
                    description="The booking will be cancelled. Players will lose their reserved slots. This cannot be undone."
                    saving={isCancelling}
                    onConfirm={onConfirmCancel}
                    onCancel={onDismissCancelConfirm}
                />
            ) : null}
        </form>
    );
}
