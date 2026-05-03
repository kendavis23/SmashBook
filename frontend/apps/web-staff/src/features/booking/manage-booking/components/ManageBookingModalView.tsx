import type { FormEvent, JSX } from "react";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCw, RotateCcw, Search, UserRound, X } from "lucide-react";
import {
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
import { PlayerAutocomplete } from "../../components/PlayerAutocomplete";
import type { ManageBookingFormState } from "./ManageBookingView";

const fieldCls =
    "w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground " +
    "placeholder:text-muted-foreground transition focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta-ring/30";

const labelCls = "mb-1 block text-xs font-medium text-foreground";

const dividerCls = "border-t-2 border-border/20 pt-3";
const sectionCls = `space-y-2 ${dividerCls}`;

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

const MODAL_PAGE_SIZE = 4;

function PlayersTable({ players }: { players: Booking["players"] }): JSX.Element {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(0);

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

    const sorted = [...players].sort((a, b) => {
        const rankA = a.role === "organiser" ? 0 : a.invite_status === "accepted" ? 1 : 2;
        const rankB = b.role === "organiser" ? 0 : b.invite_status === "accepted" ? 1 : 2;
        return rankA - rankB;
    });
    const filtered = search.trim()
        ? sorted.filter((p) => p.full_name.toLowerCase().includes(search.toLowerCase()))
        : sorted;
    const totalPages = Math.ceil(filtered.length / MODAL_PAGE_SIZE);
    const currentPage = filtered.length === 0 ? 0 : Math.min(page, totalPages - 1);
    const paged = filtered.slice(currentPage * MODAL_PAGE_SIZE, currentPage * MODAL_PAGE_SIZE + MODAL_PAGE_SIZE);

    return (
        <div className="overflow-hidden rounded-lg border border-border/70 bg-background">
            <div className="flex items-center gap-2 border-b border-border/70 bg-muted/15 px-2.5 py-1.5">
                <UserRound size={13} className="shrink-0 text-muted-foreground" />
                <span className="flex-1 text-xs font-semibold text-foreground">Player details</span>
                <div className="relative">
                    <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search…"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                        className="w-32 rounded border border-border bg-background py-0.5 pl-5 pr-2 text-[11px] placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-cta/50"
                    />
                </div>
            </div>
            <div className="divide-y divide-border">
                {paged.length === 0 ? (
                    <p className="py-3 text-center text-xs text-muted-foreground">No players found.</p>
                ) : paged.map((p) => {
                    const isAccepted = p.invite_status === "accepted";
                    return (
                        <div
                            key={p.id}
                            className={`flex items-center gap-3 px-3 py-2.5 ${isAccepted ? "bg-success/8" : ""}`}
                        >
                            <span
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                                    isAccepted
                                        ? "bg-success/15 text-success ring-1 ring-success/30"
                                        : "bg-muted text-muted-foreground"
                                }`}
                            >
                                {getInitials(p.full_name)}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-foreground">
                                    {p.full_name}
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
            {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border/60 px-3 py-1.5">
                    <span className="text-[11px] text-muted-foreground">
                        {currentPage * MODAL_PAGE_SIZE + 1}–{Math.min((currentPage + 1) * MODAL_PAGE_SIZE, filtered.length)} of {filtered.length}
                    </span>
                    <div className="flex items-center gap-0.5">
                        <button
                            type="button"
                            onClick={() => setPage(currentPage - 1)}
                            disabled={currentPage === 0}
                            className="rounded p-0.5 text-muted-foreground hover:bg-muted disabled:opacity-40"
                        >
                            <ChevronLeft size={13} />
                        </button>
                        <span className="min-w-[2.5rem] text-center text-[11px] text-muted-foreground">
                            {currentPage + 1} / {totalPages}
                        </span>
                        <button
                            type="button"
                            onClick={() => setPage(currentPage + 1)}
                            disabled={currentPage >= totalPages - 1}
                            className="rounded p-0.5 text-muted-foreground hover:bg-muted disabled:opacity-40"
                        >
                            <ChevronRight size={13} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

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
    clubId?: string | null;
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
    clubId,
}: Props): JSX.Element {
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
            className="flex h-full flex-col overflow-hidden rounded-xl bg-card"
        >
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-2.5">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold tracking-tight text-foreground">
                            {booking.court_name}
                        </h2>
                        <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusColors.bg} ${statusColors.text}`}
                        >
                            {BOOKING_STATUS_LABELS[booking.status] ?? booking.status}
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
                {updateSuccess ? (
                    <AlertToast
                        title="Booking updated successfully."
                        variant="success"
                        onClose={onDismissSuccess}
                    />
                ) : null}

                <ul
                    className={`grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border/70 bg-border/70 ${
                        booking.is_open_game ? "sm:grid-cols-4" : "sm:grid-cols-3"
                    }`}
                >
                    <DetailItem
                        label="Type"
                        value={BOOKING_TYPE_LABELS[booking.booking_type] ?? booking.booking_type}
                    />
                    <DetailItem
                        label="Players"
                        value={
                            booking.max_players != null
                                ? `${booking.max_players - booking.slots_available} / ${booking.max_players}`
                                : String(booking.players.length)
                        }
                    />
                    <DetailItem label="Total" value={formatCurrency(booking.total_price)} />
                    {booking.is_open_game ? (
                        <DetailItem
                            label="Open Game"
                            value={
                                booking.min_skill_level != null || booking.max_skill_level != null
                                    ? `Skill ${booking.min_skill_level ?? "—"} – ${booking.max_skill_level ?? "—"}`
                                    : "Open"
                            }
                        />
                    ) : null}
                </ul>

                {/* Invite Player — only for pending open games */}
                {booking.is_open_game && booking.status === "pending" ? (
                    <div>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                            <div className="min-w-0 sm:w-[70%]">
                                <label className={labelCls} htmlFor="booking-modal-player-id">
                                    Player
                                </label>
                                <PlayerAutocomplete
                                    inputId="booking-modal-player-id"
                                    label="Player"
                                    clubId={clubId}
                                    value={playerId}
                                    disabled={isInviting}
                                    onChange={setPlayerId}
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
                        <section className={dividerCls}>
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
                                            <label className="text-xs font-medium text-foreground">
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
                        </section>

                        {/* Players */}
                        {booking.players.length > 0 ? (
                            <section className={sectionCls}>
                                <div className="flex items-center justify-between gap-2">
                                    <p className={labelCls}>Players</p>
                                    <span className="text-[11px] text-muted-foreground">
                                        {booking.players.length}
                                    </span>
                                </div>
                                <PlayersTable players={booking.players} />
                            </section>
                        ) : null}

                        {/* Event & Contact */}
                        <section className={`space-y-3 ${dividerCls}`}>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div className="sm:col-span-2">
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
                                    onChange={(e) => onFormChange({ contactPhone: e.target.value })}
                                />
                            </div>
                        </section>

                        {/* Notes */}
                        <section className={sectionCls}>
                            <label htmlFor="mb-notes" className={labelCls}>
                                Notes{" "}
                                <span className="font-normal text-muted-foreground">
                                    (optional)
                                </span>
                            </label>
                            <textarea
                                id="mb-notes"
                                rows={2}
                                className={fieldCls}
                                placeholder="Internal notes visible to staff only..."
                                value={form.notes}
                                onChange={(e) => onFormChange({ notes: e.target.value })}
                            />
                        </section>
                    </>
                ) : null}

                {/* Read-only court details when not editable */}
                {!isEditable ? (
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <p className={labelCls}>Court</p>
                            <div className={`${fieldCls} cursor-default select-none opacity-80`}>
                                {booking.court_name}
                            </div>
                        </div>
                        <div>
                            <p className={labelCls}>Price</p>
                            <div className={`${fieldCls} cursor-default select-none opacity-80`}>
                                {formatCurrency(booking.total_price)}
                            </div>
                        </div>
                        <div>
                            <p className={labelCls}>Date</p>
                            <div className={`${fieldCls} cursor-default select-none opacity-80`}>
                                {formatUTCDateTime(booking.start_datetime)}
                            </div>
                        </div>
                        <div>
                            <p className={labelCls}>End Time</p>
                            <div className={`${fieldCls} cursor-default select-none opacity-80`}>
                                {formatUTCDateTime(booking.end_datetime)}
                            </div>
                        </div>
                    </div>
                ) : null}

                {/* Players — always shown (read-only when not editable) */}
                {!isEditable && booking.players.length > 0 ? (
                    <section className={sectionCls}>
                        <div className="flex items-center justify-between gap-2">
                            <p className={labelCls}>Players</p>
                            <span className="inline-flex h-6 items-center rounded-full bg-cta/10 px-2.5 text-[11px] font-semibold text-cta ring-1 ring-cta/20">
                                {booking.players.length}
                            </span>
                        </div>
                        <PlayersTable players={booking.players} />
                    </section>
                ) : null}
            </main>

            <footer className="flex shrink-0 items-center justify-between border-t border-border px-5 py-2.5">
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
            </footer>

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
