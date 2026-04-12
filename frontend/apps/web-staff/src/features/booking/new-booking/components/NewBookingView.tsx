import type { FormEvent, JSX } from "react";
import { Breadcrumb, AlertToast } from "@repo/ui";
import type { BookingType, TimeSlot } from "../../types";
import { BOOKING_TYPE_OPTIONS } from "../../types";

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
}: Props): JSX.Element {
    const courtSelected = Boolean(form.courtId);
    const today = new Date().toISOString().slice(0, 10);

    return (
        <div className="w-full space-y-5">
            <Breadcrumb
                items={[{ label: "Bookings", href: "/bookings" }, { label: "New Booking" }]}
            />

            <section className="w-full rounded-xl border border-border bg-card px-6 py-6 shadow-sm sm:px-8">
                <header className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
                    <h1 className="text-xl font-semibold text-foreground">New Booking</h1>
                </header>

                <div className="mt-5">
                    {apiError ? (
                        <div className="mb-5">
                            <AlertToast title={apiError} variant="error" onClose={onDismissError} />
                        </div>
                    ) : null}

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
                                {/* Row 1: Court | Booking Type | Max Players */}
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                    {/* Court */}
                                    <div>
                                        <label htmlFor="bk-court" className={labelCls}>
                                            Court <span className="text-destructive">*</span>
                                        </label>
                                        <select
                                            id="bk-court"
                                            className={`${fieldCls} ${courtError ? "border-destructive" : ""}`}
                                            value={form.courtId}
                                            onChange={(e) =>
                                                onFormChange({
                                                    courtId: e.target.value,
                                                    bookingDate: "",
                                                    startTime: "",
                                                })
                                            }
                                        >
                                            {courts.length === 0 ? (
                                                <option value="">No courts available</option>
                                            ) : (
                                                courts.map((c) => (
                                                    <option key={c.id} value={c.id}>
                                                        {c.name}
                                                    </option>
                                                ))
                                            )}
                                        </select>
                                        {courtError ? (
                                            <p className="mt-1 text-xs text-destructive">
                                                {courtError}
                                            </p>
                                        ) : null}
                                    </div>

                                    {/* Booking type */}
                                    <div>
                                        <label htmlFor="bk-type" className={labelCls}>
                                            Booking Type
                                        </label>
                                        <select
                                            id="bk-type"
                                            className={fieldCls}
                                            value={form.bookingType}
                                            onChange={(e) =>
                                                onFormChange({
                                                    bookingType: e.target.value as BookingType,
                                                })
                                            }
                                        >
                                            {typeOptions.map((opt) => (
                                                <option key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Max players */}
                                    <div>
                                        <label htmlFor="bk-max-players" className={labelCls}>
                                            Max Players
                                        </label>
                                        <input
                                            id="bk-max-players"
                                            type="number"
                                            min="1"
                                            max="10"
                                            className={fieldCls}
                                            value={form.maxPlayers}
                                            onChange={(e) =>
                                                onFormChange({ maxPlayers: e.target.value })
                                            }
                                        />
                                    </div>
                                </div>

                                {/* Row 2: Date | Start Time | Open game */}
                                <div className="mt-4 flex flex-wrap items-end gap-4">
                                    {/* Date */}
                                    <div className="w-44 shrink-0">
                                        <label htmlFor="bk-date" className={labelCls}>
                                            Date <span className="text-destructive">*</span>
                                        </label>
                                        <input
                                            id="bk-date"
                                            type="date"
                                            min={today}
                                            disabled={!courtSelected}
                                            className={`${fieldCls} ${!courtSelected ? "cursor-not-allowed opacity-50" : ""} ${startError && !form.bookingDate ? "border-destructive" : ""}`}
                                            value={form.bookingDate}
                                            onChange={(e) =>
                                                onFormChange({
                                                    bookingDate: e.target.value,
                                                    startTime: "",
                                                })
                                            }
                                        />
                                    </div>

                                    {/* Start time */}
                                    <div className="w-44 shrink-0">
                                        <label htmlFor="bk-start-time" className={labelCls}>
                                            Start Time <span className="text-destructive">*</span>
                                        </label>
                                        {!courtSelected || !form.bookingDate ? (
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
                                            <select
                                                id="bk-start-time"
                                                className={`${fieldCls} ${startError && !form.startTime ? "border-destructive" : ""}`}
                                                value={form.startTime}
                                                onChange={(e) =>
                                                    onFormChange({ startTime: e.target.value })
                                                }
                                            >
                                                <option value="" disabled>
                                                    Select time
                                                </option>
                                                {slots.map((slot) => (
                                                    <option
                                                        key={slot.start_time}
                                                        value={slot.start_time}
                                                        disabled={!slot.is_available}
                                                    >
                                                        {slot.start_time}
                                                        {!slot.is_available
                                                            ? " — Booked"
                                                            : slot.price_label
                                                              ? ` — ${slot.price_label}`
                                                              : ""}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                        {startError ? (
                                            <p className="mt-1 text-xs text-destructive">
                                                {startError}
                                            </p>
                                        ) : null}
                                    </div>

                                    {/* Open game */}
                                    <div className="pb-2">
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
                                </div>
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
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                    <div>
                                        <label htmlFor="bk-anchor-skill" className={labelCls}>
                                            Anchor
                                        </label>
                                        <input
                                            id="bk-anchor-skill"
                                            type="number"
                                            min="0"
                                            step="0.1"
                                            className={fieldCls}
                                            placeholder="3.5"
                                            value={form.anchorSkill}
                                            onChange={(e) =>
                                                onFormChange({ anchorSkill: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="bk-skill-min" className={labelCls}>
                                            Min
                                        </label>
                                        <input
                                            id="bk-skill-min"
                                            type="number"
                                            min="0"
                                            step="0.1"
                                            className={fieldCls}
                                            placeholder="2.5"
                                            value={form.skillMin}
                                            onChange={(e) =>
                                                onFormChange({ skillMin: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="bk-skill-max" className={labelCls}>
                                            Max
                                        </label>
                                        <input
                                            id="bk-skill-max"
                                            type="number"
                                            min="0"
                                            step="0.1"
                                            className={fieldCls}
                                            placeholder="4.5"
                                            value={form.skillMax}
                                            onChange={(e) =>
                                                onFormChange({ skillMax: e.target.value })
                                            }
                                        />
                                    </div>
                                </div>
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
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                                    <div className="md:col-span-2 xl:col-span-4">
                                        <label htmlFor="bk-event-name" className={labelCls}>
                                            Event name
                                        </label>
                                        <input
                                            id="bk-event-name"
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
                                        <label htmlFor="bk-contact-name" className={labelCls}>
                                            Contact name
                                        </label>
                                        <input
                                            id="bk-contact-name"
                                            type="text"
                                            className={fieldCls}
                                            value={form.contactName}
                                            onChange={(e) =>
                                                onFormChange({ contactName: e.target.value })
                                            }
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
                                            onChange={(e) =>
                                                onFormChange({ contactEmail: e.target.value })
                                            }
                                        />
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
                                            onChange={(e) =>
                                                onFormChange({ contactPhone: e.target.value })
                                            }
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
                                            onChange={(e) =>
                                                onFormChange({ onBehalfOf: e.target.value })
                                            }
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* Notes */}
                            <section className="form-section">
                                <div className="mb-4">
                                    <h3 className="text-sm font-semibold text-foreground">Notes</h3>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Internal notes visible to staff only.
                                    </p>
                                </div>
                                <textarea
                                    id="bk-notes"
                                    rows={4}
                                    className={fieldCls}
                                    placeholder="Internal notes visible to staff only…"
                                    value={form.notes}
                                    onChange={(e) => onFormChange({ notes: e.target.value })}
                                />
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
