import type { FormEvent, JSX } from "react";
import { useMemo, useState } from "react";
import { RefreshCw, X, ChevronDown, ChevronUp } from "lucide-react";
import {
    Breadcrumb,
    AlertToast,
    ConfirmDeleteModal,
    DatePicker,
    formatUTCDateTime,
    formatCurrency,
    SelectInput,
} from "@repo/ui";
import type { Booking, TimeSlot } from "../../types";
import { BOOKING_STATUS_COLORS, BOOKING_STATUS_LABELS, BOOKING_TYPE_LABELS } from "../../types";
import { formatSlotTime } from "../../utils/slotTime";

const fieldCls =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground " +
    "placeholder:text-muted-foreground transition focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta-ring/30";

const labelCls = "mb-1 block text-sm font-medium text-foreground";

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
    isCancelling: boolean;
    showCancelConfirm: boolean;
    onFormChange: (patch: Partial<ManageBookingFormState>) => void;
    onSubmit: (e: FormEvent) => void;
    onCancelBooking: () => void;
    onConfirmCancel: () => void;
    onDismissCancelConfirm: () => void;
    onDismissError: () => void;
    onBack: () => void;
    onRefreshSlots: () => void;
    selectedPrice: number | null;
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
    isCancelling,
    showCancelConfirm,
    onFormChange,
    onSubmit,
    onCancelBooking,
    onConfirmCancel,
    onDismissCancelConfirm,
    onDismissError,
    onBack,
    onRefreshSlots,
    selectedPrice,
    mode = "page",
    onClose,
}: Props): JSX.Element {
    const [playersExpanded, setPlayersExpanded] = useState(false);
    const [eventExpanded, setEventExpanded] = useState(false);

    const statusColors = BOOKING_STATUS_COLORS[booking.status] ?? BOOKING_STATUS_COLORS["pending"]!;
    const isCancellable = booking.status !== "cancelled" && booking.status !== "completed";
    const isEditable = booking.status !== "cancelled" && booking.status !== "completed";
    const todayStr = useMemo(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }, []);

    if (mode === "modal") {
        return (
            <div className="flex flex-col">
                {/* Modal header */}
                <div className="mb-5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-base font-semibold text-foreground">
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
                    {onClose ? (
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close modal"
                            className="shrink-0 rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        >
                            <X size={15} />
                        </button>
                    ) : null}
                </div>

                {/* API / success alerts */}
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
                            onClose={() => {}}
                        />
                    </div>
                ) : null}

                {/* Overview stat pills */}
                <div className="mb-5 grid grid-cols-4 gap-2">
                    <div className="rounded-lg bg-muted/50 px-3 py-2.5">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            Type
                        </p>
                        <p className="mt-1 truncate text-sm font-medium text-foreground">
                            {BOOKING_TYPE_LABELS[booking.booking_type] ?? booking.booking_type}
                            {booking.is_open_game ? (
                                <span className="ml-1 rounded-full bg-info/15 px-1.5 py-0.5 text-[9px] font-medium text-info">
                                    Open
                                </span>
                            ) : null}
                        </p>
                    </div>
                    <div className="rounded-lg bg-muted/50 px-3 py-2.5">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            Players
                        </p>
                        <p className="mt-1 text-sm font-medium text-foreground">
                            {booking.players.length}
                            {booking.max_players != null ? (
                                <span className="text-muted-foreground">
                                    {" "}
                                    / {booking.max_players}
                                </span>
                            ) : null}
                        </p>
                    </div>
                    <div className="rounded-lg bg-muted/50 px-3 py-2.5">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            Total
                        </p>
                        <p className="mt-1 text-sm font-medium text-foreground">
                            {formatCurrency(booking.total_price)}
                        </p>
                    </div>
                    <div className="rounded-lg bg-muted/50 px-3 py-2.5">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            Created
                        </p>
                        <p className="mt-1 truncate text-xs font-medium text-foreground">
                            {formatUTCDateTime(booking.created_at)}
                        </p>
                    </div>
                </div>

                {/* Edit form */}
                {isEditable ? (
                    <form onSubmit={onSubmit} noValidate className="space-y-5">
                        {/* Core Details */}
                        <div>
                            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Core Details
                            </p>
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
                                            {form.startTime ? formatCurrency(selectedPrice) : "—"}
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

                        {/* Players — collapsible */}
                        {booking.players.length > 0 ? (
                            <div className="overflow-hidden rounded-lg border border-border">
                                <button
                                    type="button"
                                    className="flex w-full items-center justify-between bg-muted/20 px-4 py-2.5 text-left transition hover:bg-muted/40"
                                    onClick={() => setPlayersExpanded((v) => !v)}
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

                        {/* Notes */}
                        <div>
                            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Notes
                            </p>
                            <textarea
                                rows={3}
                                className={fieldCls}
                                placeholder="Internal notes visible to staff only…"
                                value={form.notes}
                                onChange={(e) => onFormChange({ notes: e.target.value })}
                            />
                        </div>

                        {/* Event & Contact — collapsible */}
                        <div className="overflow-hidden rounded-lg border border-border">
                            <button
                                type="button"
                                className="flex w-full items-center justify-between bg-muted/20 px-4 py-2.5 text-left transition hover:bg-muted/40"
                                onClick={() => setEventExpanded((v) => !v)}
                            >
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    Event &amp; Contact{" "}
                                    <span className="text-[10px] normal-case font-normal opacity-70">
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
                                                    onFormChange({ contactName: e.target.value })
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
                                                    onFormChange({ contactEmail: e.target.value })
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

                        {/* Footer */}
                        <div className="flex items-center justify-between border-t border-border pt-4">
                            {isCancellable ? (
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
                                <button
                                    type="submit"
                                    disabled={!isDirty || isUpdating}
                                    className="btn-cta disabled:opacity-50"
                                >
                                    {isUpdating ? "Saving…" : "Save Changes"}
                                </button>
                            </div>
                        </div>
                    </form>
                ) : (
                    <div className="flex justify-end border-t border-border pt-4">
                        <button type="button" onClick={onBack} className="btn-outline">
                            Close
                        </button>
                    </div>
                )}

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

    return (
        <div className="w-full space-y-5">
            <Breadcrumb
                items={[{ label: "Bookings", href: "/bookings" }, { label: "Manage Booking" }]}
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
                        {isCancellable ? (
                            <button
                                type="button"
                                onClick={onCancelBooking}
                                disabled={isCancelling}
                                className="btn-destructive"
                            >
                                {isCancelling ? "Cancelling…" : "Cancel Booking"}
                            </button>
                        ) : null}
                    </div>
                </header>

                <div className="mt-5 space-y-4">
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

                    {/* Booking overview */}
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
                                <dd className="mt-0.5 text-sm text-foreground">
                                    {BOOKING_TYPE_LABELS[booking.booking_type] ??
                                        booking.booking_type}
                                    {booking.is_open_game ? (
                                        <span className="ml-1.5 rounded-full bg-info/15 px-1.5 py-0.5 text-[10px] font-medium text-info">
                                            Open
                                        </span>
                                    ) : null}
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

                    {/* Players */}
                    {booking.players.length > 0 ? (
                        <section className="form-section">
                            <div className="mb-4">
                                <h3 className="text-sm font-semibold text-foreground">Players</h3>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    All participants in this booking.
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

                    {/* Edit form — only shown when booking is editable */}
                    {isEditable ? (
                        <form onSubmit={onSubmit} noValidate>
                            <section className="form-section">
                                <div className="mb-4">
                                    <h3 className="text-sm font-semibold text-foreground">
                                        Core Details
                                    </h3>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Update court, start time, or other booking details.
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                                    <div>
                                        <label htmlFor="mb-court" className={labelCls}>
                                            Court
                                        </label>
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
                                        <label htmlFor="mb-date" className={labelCls}>
                                            Date
                                        </label>
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
                                                    title="Refresh available slots"
                                                    className="text-muted-foreground transition hover:text-foreground disabled:opacity-40"
                                                >
                                                    <RefreshCw
                                                        size={13}
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
                                    <div>
                                        <label className={labelCls}>Price</label>
                                        <div
                                            className={`${fieldCls} cursor-default select-none opacity-80`}
                                        >
                                            {form.startTime ? formatCurrency(selectedPrice) : "—"}
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="form-section">
                                <div className="mb-4">
                                    <h3 className="text-sm font-semibold text-foreground">
                                        Event &amp; Contact{" "}
                                        <span className="text-xs font-normal text-muted-foreground">
                                            (optional)
                                        </span>
                                    </h3>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        For corporate or tournament bookings.
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                                    <div className="md:col-span-2 xl:col-span-4">
                                        <label htmlFor="mb-event-name" className={labelCls}>
                                            Event name
                                        </label>
                                        <input
                                            id="mb-event-name"
                                            type="text"
                                            className={fieldCls}
                                            placeholder="e.g. Friday Corporate Cup"
                                            value={form.eventName}
                                            onChange={(e) =>
                                                onFormChange({ eventName: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="mb-contact-name" className={labelCls}>
                                            Contact name
                                        </label>
                                        <input
                                            id="mb-contact-name"
                                            type="text"
                                            className={fieldCls}
                                            value={form.contactName}
                                            onChange={(e) =>
                                                onFormChange({ contactName: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="mb-contact-email" className={labelCls}>
                                            Contact email
                                        </label>
                                        <input
                                            id="mb-contact-email"
                                            type="email"
                                            className={fieldCls}
                                            value={form.contactEmail}
                                            onChange={(e) =>
                                                onFormChange({ contactEmail: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="mb-contact-phone" className={labelCls}>
                                            Contact phone
                                        </label>
                                        <input
                                            id="mb-contact-phone"
                                            type="tel"
                                            className={fieldCls}
                                            value={form.contactPhone}
                                            onChange={(e) =>
                                                onFormChange({ contactPhone: e.target.value })
                                            }
                                        />
                                    </div>
                                </div>
                            </section>

                            <section className="form-section">
                                <div className="mb-4">
                                    <h3 className="text-sm font-semibold text-foreground">Notes</h3>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Internal notes visible to staff only.
                                    </p>
                                </div>
                                <textarea
                                    id="mb-notes"
                                    rows={4}
                                    className={fieldCls}
                                    placeholder="Internal notes visible to staff only…"
                                    value={form.notes}
                                    onChange={(e) => onFormChange({ notes: e.target.value })}
                                />
                            </section>

                            <div className="mt-6 flex items-center justify-end gap-3 border-t border-border pt-5">
                                <button type="button" onClick={onBack} className="btn-outline">
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
                    ) : (
                        <div className="flex justify-start pt-2">
                            <button type="button" onClick={onBack} className="btn-outline">
                                Back
                            </button>
                        </div>
                    )}
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
