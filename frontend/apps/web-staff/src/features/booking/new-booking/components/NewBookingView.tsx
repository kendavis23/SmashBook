import type { FormEvent, JSX } from "react";
import { useMemo } from "react";
import { RefreshCw } from "lucide-react";
import {
    Breadcrumb,
    AlertToast,
    DatePicker,
    NumberInput,
    SelectInput,
    RecurrencePicker,
    formatCurrency,
} from "@repo/ui";
import type { BookingType, TimeSlot } from "../../types";
import { BOOKING_TYPE_OPTIONS } from "../../types";
import { formatSlotTime } from "../../utils/slotTime";
import { NewBookingModalView } from "./NewBookingModalView";
import { PlayerAutocomplete } from "../../components/PlayerAutocomplete";

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
    playerUserIds: string[];
    staffProfileId: string;
    isRecurring: boolean;
    recurrenceRule: string;
    skipConflicts: boolean;
};

type Trainer = { staff_profile_id: string; full_name: string };

type Props = {
    courts: { id: string; name: string }[];
    trainers: Trainer[];
    trainersLoading: boolean;
    trainersError: boolean;
    slots: TimeSlot[];
    slotsLoading: boolean;
    form: NewBookingFormState;
    courtError: string;
    startError: string;
    onBehalfOfError: string;
    apiError: string;
    isPending: boolean;
    onFormChange: (patch: Partial<NewBookingFormState>) => void;
    onSubmit: (e: FormEvent) => void;
    onCancel: () => void;
    onDismissError: () => void;
    onRefreshSlots: () => void;
    selectedPrice: number | string | null;
    clubId?: string | null;
    mode?: NewBookingMode;
    courtName?: string;
    onClose?: () => void;
};

const typeOptions = BOOKING_TYPE_OPTIONS.filter((o) => o.value !== "");

export default function NewBookingView({
    courts,
    trainers,
    trainersLoading,
    trainersError,
    slots,
    slotsLoading,
    form,
    courtError,
    startError,
    apiError,
    isPending,
    onBehalfOfError,
    onFormChange,
    onSubmit,
    onCancel,
    onDismissError,
    onRefreshSlots,
    selectedPrice,
    clubId,
    mode = "page",
    courtName,
    onClose,
}: Props): JSX.Element {
    const courtSelected = Boolean(form.courtId);
    const todayStr = useMemo(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }, []);
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
                    <SelectInput
                        value={form.courtId}
                        onValueChange={(courtId) =>
                            onFormChange({ courtId, bookingDate: "", startTime: "" })
                        }
                        options={courts.map((c) => ({ value: c.id, label: c.name }))}
                        placeholder={courts.length === 0 ? "No courts available" : "Select court…"}
                        disabled={courts.length === 0}
                        className={courtError ? "!border-destructive" : ""}
                    />
                    {courtError ? (
                        <p className="mt-1 text-xs text-destructive">{courtError}</p>
                    ) : null}
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

            {/* Row 3: Max Players | Price */}
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
            </div>

            {!form.isOpenGame ||
            form.bookingType === "lesson_individual" ||
            form.bookingType === "lesson_group" ? (
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* On behalf of */}
                    {!form.isOpenGame ? (
                        <div>
                            <label htmlFor="bk-on-behalf" className={labelCls}>
                                On behalf of <span className="text-destructive">*</span>
                            </label>
                            <PlayerAutocomplete
                                label="On behalf of"
                                inputId="bk-on-behalf"
                                clubId={clubId}
                                value={form.onBehalfOf}
                                onChange={(playerId) => onFormChange({ onBehalfOf: playerId })}
                                error={Boolean(onBehalfOfError)}
                            />
                            {onBehalfOfError ? (
                                <p className="mt-1 text-xs text-destructive">{onBehalfOfError}</p>
                            ) : null}
                        </div>
                    ) : null}

                    {/* Staff (Trainer) — lesson types only */}
                    {form.bookingType === "lesson_individual" ||
                    form.bookingType === "lesson_group" ? (
                        <div>
                            <label htmlFor="bk-staff-id" className={labelCls}>
                                Staff (Trainer)
                                <span className="ml-1 font-normal text-muted-foreground">
                                    - Lesson assigned to the trainer.
                                </span>
                            </label>
                            {!form.startTime ? (
                                <div className={`${fieldCls} cursor-not-allowed opacity-50`}>
                                    <span className="text-muted-foreground">
                                        Select a time slot first
                                    </span>
                                </div>
                            ) : trainersLoading ? (
                                <div className={`${fieldCls} opacity-60`}>
                                    <span className="text-muted-foreground">Loading trainers…</span>
                                </div>
                            ) : trainersError ? (
                                <div className={`${fieldCls} opacity-60`}>
                                    <span className="text-muted-foreground">
                                        Failed to load trainers
                                    </span>
                                </div>
                            ) : (
                                <SelectInput
                                    value={form.staffProfileId}
                                    onValueChange={(v) => onFormChange({ staffProfileId: v })}
                                    options={trainers.map((t) => ({
                                        value: t.staff_profile_id,
                                        label: t.full_name,
                                    }))}
                                    placeholder={
                                        trainers.length === 0
                                            ? "No trainers available"
                                            : "Select trainer…"
                                    }
                                    disabled={trainers.length === 0}
                                />
                            )}
                        </div>
                    ) : null}
                </div>
            ) : null}

            {/* Add Players */}
            {!form.isOpenGame ? (
                <div className="mt-4">
                    <label className={labelCls}>
                        Add Players
                        <span className="ml-1 font-normal text-muted-foreground">
                            - Staff can add players.
                        </span>
                    </label>
                    {form.playerUserIds.map((uid, index) => (
                        <div key={index} className="mb-2 flex items-center gap-2">
                            <div className="min-w-0 flex-1">
                                <PlayerAutocomplete
                                    label={`Invited player ${index + 1}`}
                                    clubId={clubId}
                                    value={uid}
                                    onChange={(playerId) => {
                                        const next = [...form.playerUserIds];
                                        next[index] = playerId;
                                        onFormChange({ playerUserIds: next });
                                    }}
                                />
                            </div>
                            <button
                                type="button"
                                aria-label={`Remove invited player ${index + 1}`}
                                onClick={() => {
                                    const next = form.playerUserIds.filter((_, i) => i !== index);
                                    onFormChange({ playerUserIds: next });
                                }}
                                className="shrink-0 rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={() => onFormChange({ playerUserIds: [...form.playerUserIds, ""] })}
                        className="mt-1 text-sm text-cta hover:underline"
                    >
                        + Invite Player
                    </button>
                </div>
            ) : null}

            {/* Notes */}
            <div className="mt-4">
                <label htmlFor="bk-notes" className={labelCls}>
                    Notes
                </label>
                <textarea
                    id="bk-notes"
                    rows={4}
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
        </div>
    );

    if (mode === "modal") {
        return (
            <NewBookingModalView
                courtName={courtName ?? form.courtId}
                trainers={trainers}
                trainersLoading={trainersLoading}
                trainersError={trainersError}
                form={form}
                apiError={apiError}
                onBehalfOfError={onBehalfOfError}
                isPending={isPending}
                selectedPrice={selectedPrice}
                clubId={clubId}
                onFormChange={onFormChange}
                onSubmit={onSubmit}
                onCancel={onCancel}
                onDismissError={onDismissError}
                onClose={onClose ?? onCancel}
            />
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

                            {/* Open Game & Skill Level — regular bookings only */}
                            {form.bookingType === "regular" ? (
                                <section className="form-section">
                                    <div className="mb-4">
                                        <h3 className="text-sm font-semibold text-foreground">
                                            Open Game &amp; Skill Level{" "}
                                            <span className="text-xs font-normal text-muted-foreground">
                                                (optional)
                                            </span>
                                        </h3>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Mark as open and set skill range requirements for
                                            matchmaking.
                                        </p>
                                    </div>
                                    <div className="mb-4">
                                        <label className="flex cursor-pointer items-center gap-2">
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 rounded border-border accent-cta"
                                                checked={form.isOpenGame}
                                                onChange={(e) =>
                                                    onFormChange({ isOpenGame: e.target.checked })
                                                }
                                                aria-label="Mark as open game"
                                            />
                                            <span className="text-sm font-medium text-foreground">
                                                Open game
                                            </span>
                                        </label>
                                    </div>
                                    {optionalSkillFields}
                                </section>
                            ) : null}

                            {/* Event / contact  */}
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

                            {/* Recurring — non-regular bookings only */}
                            {form.bookingType !== "regular" ? (
                                <section className="form-section">
                                    <div className="mb-4">
                                        <h3 className="text-sm font-semibold text-foreground">
                                            Recurrence{" "}
                                            <span className="text-xs font-normal text-muted-foreground">
                                                (optional)
                                            </span>
                                        </h3>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Create a series of bookings from a repeating schedule.
                                        </p>
                                    </div>

                                    <label className="flex cursor-pointer items-center gap-2">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-border accent-cta"
                                            checked={form.isRecurring}
                                            onChange={(e) =>
                                                onFormChange({ isRecurring: e.target.checked })
                                            }
                                            aria-label="Enable recurring booking"
                                        />
                                        <span className="text-sm font-medium text-foreground">
                                            Repeat this booking
                                        </span>
                                    </label>

                                    {form.isRecurring ? (
                                        <div className="mt-4 space-y-4">
                                            <RecurrencePicker
                                                value={form.recurrenceRule}
                                                onChange={(rule) =>
                                                    onFormChange({ recurrenceRule: rule })
                                                }
                                            />
                                            <label className="flex cursor-pointer items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4 rounded border-border accent-cta"
                                                    checked={form.skipConflicts}
                                                    onChange={(e) =>
                                                        onFormChange({
                                                            skipConflicts: e.target.checked,
                                                        })
                                                    }
                                                    aria-label="Skip conflicting slots"
                                                />
                                                <span className="text-sm text-foreground">
                                                    Skip conflicting slots
                                                </span>
                                            </label>
                                        </div>
                                    ) : null}
                                </section>
                            ) : null}
                        </div>

                        {/* Actions */}
                        <div className="mt-8 flex items-center justify-end gap-3 border-t border-border pt-5">
                            <button type="button" onClick={onCancel} className="btn-outline">
                                Cancel
                            </button>
                            <button type="submit" disabled={isPending} className="btn-cta">
                                {isPending
                                    ? form.isRecurring
                                        ? "Creating series…"
                                        : "Creating…"
                                    : form.isRecurring
                                      ? "Create Series"
                                      : "Create Booking"}
                            </button>
                        </div>
                    </form>
                </div>
            </section>
        </div>
    );
}
