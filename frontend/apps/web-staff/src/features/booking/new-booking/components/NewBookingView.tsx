import type { FormEvent, JSX } from "react";
import { useMemo, useState } from "react";
import { RefreshCw, X, ChevronDown, ChevronRight } from "lucide-react";
import {
    Breadcrumb,
    AlertToast,
    DatePicker,
    NumberInput,
    SelectInput,
    formatCurrency,
} from "@repo/ui";
import type { BookingType, TimeSlot } from "../../types";
import { BOOKING_TYPE_OPTIONS } from "../../types";
import { formatSlotTime } from "../../utils/slotTime";

export type NewBookingMode = "page" | "modal";

const fieldCls =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground " +
    "placeholder:text-muted-foreground transition focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta-ring/30";

const labelCls = "mb-1 block text-sm font-medium text-foreground";

export type NewBookingFormState = {
    courtId: string;
    bookingType: BookingType;
    bookingDate: string;
    startTime: string;
    isOpenGame: boolean;
    maxPlayers: string;
    notes: string;
    anchorSkill: string;
    skillMin: string;
    skillMax: string;
    eventName: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    onBehalfOf: string;
};

type Props = {
    courts: { id: string; name: string }[];
    slots: TimeSlot[];
    slotsLoading: boolean;
    form: NewBookingFormState;
    courtError: string;
    startError: string;
    apiError: string;
    isPending: boolean;
    onFormChange: (patch: Partial<NewBookingFormState>) => void;
    onSubmit: (e: FormEvent) => void;
    onCancel: () => void;
    onDismissError: () => void;
    onRefreshSlots: () => void;
    selectedPrice: number | null;
    mode?: NewBookingMode;
    courtName?: string;
    onClose?: () => void;
};

const typeOptions = BOOKING_TYPE_OPTIONS.filter((o) => o.value !== "");

export default function NewBookingView({
    courts,
    slots,
    slotsLoading,
    form,
    courtError,
    startError,
    apiError,
    isPending,
    onFormChange,
    onSubmit,
    onCancel,
    onDismissError,
    onRefreshSlots,
    selectedPrice,
    mode = "page",
    courtName,
    onClose,
}: Props): JSX.Element {
    const courtSelected = Boolean(form.courtId);
    const todayStr = useMemo(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }, []);
    const [skillOpen, setSkillOpen] = useState(false);
    const [eventOpen, setEventOpen] = useState(false);

    const coreFields = (
        <>
            {apiError ? (
                <div className="mb-4">
                    <AlertToast title={apiError} variant="error" onClose={onDismissError} />
                </div>
            ) : null}

            {/* Row 1: Court | Booking Type */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Court */}
                <div>
                    <label htmlFor="bk-court" className={labelCls}>
                        Court <span className="text-destructive">*</span>
                    </label>
                    {mode === "modal" && courtName ? (
                        <div className={`${fieldCls} cursor-default select-none opacity-80`}>
                            {courtName}
                        </div>
                    ) : (
                        <>
                            <SelectInput
                                value={form.courtId}
                                onValueChange={(courtId) =>
                                    onFormChange({ courtId, bookingDate: "", startTime: "" })
                                }
                                options={courts.map((c) => ({ value: c.id, label: c.name }))}
                                placeholder={
                                    courts.length === 0 ? "No courts available" : "Select court…"
                                }
                                disabled={courts.length === 0}
                                className={courtError ? "!border-destructive" : ""}
                            />
                            {courtError ? (
                                <p className="mt-1 text-xs text-destructive">{courtError}</p>
                            ) : null}
                        </>
                    )}
                </div>

                {/* Booking type */}
                <div>
                    <label htmlFor="bk-type" className={labelCls}>
                        Booking Type
                    </label>
                    <SelectInput
                        value={form.bookingType}
                        onValueChange={(v) => onFormChange({ bookingType: v as BookingType })}
                        options={typeOptions}
                    />
                </div>
            </div>

            {/* Row 2: Date | Start Time */}
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Date */}
                <div>
                    <label htmlFor="bk-date" className={labelCls}>
                        Date <span className="text-destructive">*</span>
                    </label>
                    <DatePicker
                        value={form.bookingDate}
                        onChange={(v) => onFormChange({ bookingDate: v, startTime: "" })}
                        disabled={!courtSelected}
                        minDate={todayStr}
                        className={startError && !form.bookingDate ? "!border-destructive" : ""}
                    />
                </div>

                {/* Start time */}
                <div>
                    <div className="mb-1 flex items-center justify-between">
                        <label className="text-sm font-medium text-foreground">
                            Start Time <span className="text-destructive">*</span>
                        </label>
                        {courtSelected && form.bookingDate ? (
                            <button
                                type="button"
                                onClick={onRefreshSlots}
                                disabled={slotsLoading}
                                title="Refresh available slots"
                                className="text-muted-foreground transition hover:text-foreground disabled:opacity-40"
                            >
                                <RefreshCw
                                    size={13}
                                    className={slotsLoading ? "animate-spin" : ""}
                                />
                            </button>
                        ) : null}
                    </div>
                    {!courtSelected || !form.bookingDate ? (
                        <div className={`${fieldCls} cursor-not-allowed opacity-50`}>
                            <span className="text-muted-foreground">—</span>
                        </div>
                    ) : slotsLoading ? (
                        <div className={`${fieldCls} opacity-60`}>
                            <span className="text-muted-foreground">Loading…</span>
                        </div>
                    ) : slots.length === 0 ? (
                        <div className={`${fieldCls} opacity-60`}>
                            <span className="text-muted-foreground">No slots</span>
                        </div>
                    ) : (
                        <SelectInput
                            value={form.startTime}
                            onValueChange={(v) => onFormChange({ startTime: v })}
                            placeholder="Select time"
                            options={slots.map((slot) => ({
                                value: slot.start_time,
                                label:
                                    formatSlotTime(slot.start_time) +
                                    (!slot.is_available ? " — Booked" : ""),
                                disabled: !slot.is_available,
                            }))}
                            className={startError && !form.startTime ? "!border-destructive" : ""}
                        />
                    )}
                    {startError ? (
                        <p className="mt-1 text-xs text-destructive">{startError}</p>
                    ) : null}
                </div>
            </div>

            {/* Row 3: Max Players | Price | Open game */}
            <div className="mt-4 flex flex-wrap items-end gap-4">
                {/* Max players */}
                <div className="w-32 shrink-0">
                    <label htmlFor="bk-max-players" className={labelCls}>
                        Max Players
                    </label>
                    <NumberInput
                        id="bk-max-players"
                        min={1}
                        max={10}
                        className={fieldCls}
                        value={form.maxPlayers}
                        onChange={(e) => onFormChange({ maxPlayers: e.target.value })}
                    />
                </div>

                {/* Price */}
                <div className="w-32 shrink-0">
                    <label className={labelCls}>Price</label>
                    <div className={`${fieldCls} cursor-default select-none opacity-80`}>
                        {form.startTime ? formatCurrency(selectedPrice) : "—"}
                    </div>
                </div>

                {/* Open game */}
                <div className="pb-2">
                    <label className="flex cursor-pointer items-center gap-2">
                        <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-border accent-cta"
                            checked={form.isOpenGame}
                            onChange={(e) => onFormChange({ isOpenGame: e.target.checked })}
                            aria-label="Mark as open game"
                        />
                        <span className="text-sm font-medium text-foreground">Open game</span>
                    </label>
                </div>
            </div>

            {/* Notes */}
            <div className="mt-4">
                <label htmlFor="bk-notes" className={labelCls}>
                    Notes
                </label>
                <textarea
                    id="bk-notes"
                    rows={mode === "modal" ? 2 : 4}
                    className={fieldCls}
                    placeholder="Internal notes visible to staff only…"
                    value={form.notes}
                    onChange={(e) => onFormChange({ notes: e.target.value })}
                />
            </div>
        </>
    );

    const optionalSkillFields = (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
                <label htmlFor="bk-anchor-skill" className={labelCls}>
                    Anchor
                </label>
                <NumberInput
                    id="bk-anchor-skill"
                    min={0}
                    step={0.1}
                    className={fieldCls}
                    placeholder="3.5"
                    value={form.anchorSkill}
                    onChange={(e) => onFormChange({ anchorSkill: e.target.value })}
                />
            </div>
            <div>
                <label htmlFor="bk-skill-min" className={labelCls}>
                    Min
                </label>
                <NumberInput
                    id="bk-skill-min"
                    min={0}
                    step={0.1}
                    className={fieldCls}
                    placeholder="2.5"
                    value={form.skillMin}
                    onChange={(e) => onFormChange({ skillMin: e.target.value })}
                />
            </div>
            <div>
                <label htmlFor="bk-skill-max" className={labelCls}>
                    Max
                </label>
                <NumberInput
                    id="bk-skill-max"
                    min={0}
                    step={0.1}
                    className={fieldCls}
                    placeholder="4.5"
                    value={form.skillMax}
                    onChange={(e) => onFormChange({ skillMax: e.target.value })}
                />
            </div>
        </div>
    );

    const optionalEventFields = (
        <div className="space-y-4">
            <div>
                <label htmlFor="bk-event-name" className={labelCls}>
                    Event name
                </label>
                <input
                    id="bk-event-name"
                    type="text"
                    className={fieldCls}
                    placeholder="e.g. Friday Corporate Cup"
                    value={form.eventName}
                    onChange={(e) => onFormChange({ eventName: e.target.value })}
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="bk-contact-name" className={labelCls}>
                        Contact name
                    </label>
                    <input
                        id="bk-contact-name"
                        type="text"
                        className={fieldCls}
                        value={form.contactName}
                        onChange={(e) => onFormChange({ contactName: e.target.value })}
                    />
                </div>
                <div>
                    <label htmlFor="bk-contact-email" className={labelCls}>
                        Contact email
                    </label>
                    <input
                        id="bk-contact-email"
                        type="email"
                        className={fieldCls}
                        value={form.contactEmail}
                        onChange={(e) => onFormChange({ contactEmail: e.target.value })}
                    />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="bk-contact-phone" className={labelCls}>
                        Contact phone
                    </label>
                    <input
                        id="bk-contact-phone"
                        type="tel"
                        className={fieldCls}
                        value={form.contactPhone}
                        onChange={(e) => onFormChange({ contactPhone: e.target.value })}
                    />
                </div>
                <div>
                    <label htmlFor="bk-on-behalf" className={labelCls}>
                        On behalf of (user ID)
                    </label>
                    <input
                        id="bk-on-behalf"
                        type="text"
                        className={fieldCls}
                        placeholder="Player user ID"
                        value={form.onBehalfOf}
                        onChange={(e) => onFormChange({ onBehalfOf: e.target.value })}
                    />
                </div>
            </div>
        </div>
    );

    if (mode === "modal") {
        const formattedDate = form.bookingDate
            ? new Date(form.bookingDate + "T00:00:00").toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
              })
            : "—";

        return (
            <form onSubmit={onSubmit} noValidate>
                {/* Modal header with X close button */}
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-base font-semibold text-foreground">New Booking</h2>
                    {onClose ? (
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close modal"
                            className="rounded-lg p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        >
                            <X size={16} />
                        </button>
                    ) : null}
                </div>

                {apiError ? (
                    <div className="mb-4">
                        <AlertToast title={apiError} variant="error" onClose={onDismissError} />
                    </div>
                ) : null}

                {/* Read-only: Court, Date, Start Time */}
                <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label className={labelCls}>
                            Court <span className="text-destructive">*</span>
                        </label>
                        <div className={`${fieldCls} cursor-default select-none opacity-80`}>
                            {courtName ?? form.courtId}
                        </div>
                    </div>
                    <div>
                        <label className={labelCls}>Booking Type</label>
                        <SelectInput
                            value={form.bookingType}
                            onValueChange={(v) => onFormChange({ bookingType: v as BookingType })}
                            options={typeOptions}
                        />
                    </div>
                </div>

                <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label className={labelCls}>
                            Date <span className="text-destructive">*</span>
                        </label>
                        <div className={`${fieldCls} cursor-default select-none opacity-80`}>
                            {formattedDate}
                        </div>
                    </div>
                    <div>
                        <label className={labelCls}>
                            Start Time <span className="text-destructive">*</span>
                        </label>
                        <div className={`${fieldCls} cursor-default select-none opacity-80`}>
                            {form.startTime ? formatSlotTime(form.startTime) : "—"}
                        </div>
                    </div>
                </div>

                {/* Editable: Max Players, Price, Open game */}
                <div className="mb-4 flex flex-wrap items-end gap-4">
                    <div className="w-32 shrink-0">
                        <label htmlFor="bk-max-players" className={labelCls}>
                            Max Players
                        </label>
                        <NumberInput
                            id="bk-max-players"
                            min={1}
                            max={10}
                            className={fieldCls}
                            value={form.maxPlayers}
                            onChange={(e) => onFormChange({ maxPlayers: e.target.value })}
                        />
                    </div>
                    <div className="w-32 shrink-0">
                        <label className={labelCls}>Price</label>
                        <div className={`${fieldCls} cursor-default select-none opacity-80`}>
                            {form.startTime ? formatCurrency(selectedPrice) : "—"}
                        </div>
                    </div>
                    <div className="pb-2">
                        <label className="flex cursor-pointer items-center gap-2">
                            <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-border accent-cta"
                                checked={form.isOpenGame}
                                onChange={(e) => onFormChange({ isOpenGame: e.target.checked })}
                                aria-label="Mark as open game"
                            />
                            <span className="text-sm font-medium text-foreground">Open game</span>
                        </label>
                    </div>
                </div>

                {/* Notes */}
                <div className="mb-4">
                    <label htmlFor="bk-notes" className={labelCls}>
                        Notes
                    </label>
                    <textarea
                        id="bk-notes"
                        rows={2}
                        className={fieldCls}
                        placeholder="Internal notes visible to staff only…"
                        value={form.notes}
                        onChange={(e) => onFormChange({ notes: e.target.value })}
                    />
                </div>

                {/* Collapsible: Skill Level */}
                <div className="mt-4 rounded-lg border border-border">
                    <button
                        type="button"
                        onClick={() => setSkillOpen((o) => !o)}
                        className="flex w-full items-center justify-between px-3 py-2.5 text-left"
                        aria-expanded={skillOpen}
                    >
                        <span className="text-sm font-medium text-foreground">
                            Skill Level{" "}
                            <span className="text-xs font-normal text-muted-foreground">
                                (optional)
                            </span>
                        </span>
                        {skillOpen ? (
                            <ChevronDown size={14} className="text-muted-foreground" />
                        ) : (
                            <ChevronRight size={14} className="text-muted-foreground" />
                        )}
                    </button>
                    {skillOpen ? (
                        <div className="border-t border-border px-3 pb-3 pt-3">
                            <p className="mb-3 text-xs text-muted-foreground">
                                Set skill range requirements for matchmaking.
                            </p>
                            {optionalSkillFields}
                        </div>
                    ) : null}
                </div>

                {/* Collapsible: Event & Contact */}
                <div className="mt-2 rounded-lg border border-border">
                    <button
                        type="button"
                        onClick={() => setEventOpen((o) => !o)}
                        className="flex w-full items-center justify-between px-3 py-2.5 text-left"
                        aria-expanded={eventOpen}
                    >
                        <span className="text-sm font-medium text-foreground">
                            Event &amp; Contact{" "}
                            <span className="text-xs font-normal text-muted-foreground">
                                (optional)
                            </span>
                        </span>
                        {eventOpen ? (
                            <ChevronDown size={14} className="text-muted-foreground" />
                        ) : (
                            <ChevronRight size={14} className="text-muted-foreground" />
                        )}
                    </button>
                    {eventOpen ? (
                        <div className="border-t border-border px-3 pb-3 pt-3">
                            <p className="mb-3 text-xs text-muted-foreground">
                                For corporate or tournament bookings.
                            </p>
                            {optionalEventFields}
                        </div>
                    ) : null}
                </div>

                <div className="mt-5 flex items-center justify-end gap-3 border-t border-border pt-4">
                    <button type="button" onClick={onCancel} className="btn-outline">
                        Cancel
                    </button>
                    <button type="submit" disabled={isPending} className="btn-cta">
                        {isPending ? "Creating…" : "Create Booking"}
                    </button>
                </div>
            </form>
        );
    }

    return (
        <div className="w-full space-y-5">
            <Breadcrumb
                items={[{ label: "Bookings", href: "/bookings" }, { label: "New Booking" }]}
            />

            <section className="card-surface overflow-hidden">
                <header className="border-b border-border bg-muted/10 px-5 py-4 sm:px-6">
                    <h1 className="text-lg font-semibold tracking-tight text-foreground">
                        New Booking
                    </h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Create a new court booking for your club.
                    </p>
                </header>

                <div className="px-5 py-6 sm:px-6">
                    <form onSubmit={onSubmit} noValidate>
                        <div className="space-y-4">
                            {/* Core details */}
                            <section className="form-section">
                                <div className="mb-4">
                                    <h3 className="text-sm font-semibold text-foreground">
                                        Core Details
                                    </h3>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Select the court, type, and start time for this booking.
                                    </p>
                                </div>
                                {coreFields}
                            </section>

                            {/* Skill level */}
                            <section className="form-section">
                                <div className="mb-4">
                                    <h3 className="text-sm font-semibold text-foreground">
                                        Skill Level{" "}
                                        <span className="text-xs font-normal text-muted-foreground">
                                            (optional)
                                        </span>
                                    </h3>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Set skill range requirements for matchmaking.
                                    </p>
                                </div>
                                {optionalSkillFields}
                            </section>

                            {/* Event / contact */}
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
                                {optionalEventFields}
                            </section>
                        </div>

                        {/* Actions */}
                        <div className="mt-8 flex items-center justify-end gap-3 border-t border-border pt-5">
                            <button type="button" onClick={onCancel} className="btn-outline">
                                Cancel
                            </button>
                            <button type="submit" disabled={isPending} className="btn-cta">
                                {isPending ? "Creating…" : "Create Booking"}
                            </button>
                        </div>
                    </form>
                </div>
            </section>
        </div>
    );
}
