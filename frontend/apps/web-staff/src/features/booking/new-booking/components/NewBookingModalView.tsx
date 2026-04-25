import type { FormEvent, JSX } from "react";
import { useState } from "react";
import { CalendarDays, X, ChevronDown, ChevronRight } from "lucide-react";
import { AlertToast, NumberInput, SelectInput, StatPill, formatCurrency } from "@repo/ui";
import type { BookingType } from "../../types";
import { BOOKING_TYPE_OPTIONS } from "../../types";
import { formatSlotTime } from "../../utils/slotTime";
import type { NewBookingFormState } from "./NewBookingView";

const fieldCls =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground " +
    "placeholder:text-muted-foreground transition focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta-ring/30";

const labelCls = "mb-1 block text-sm font-medium text-foreground";

const typeOptions = BOOKING_TYPE_OPTIONS.filter((o) => o.value !== "");

type Props = {
    courtName: string;
    trainers: { id: string }[];
    form: NewBookingFormState;
    apiError: string;
    isPending: boolean;
    selectedPrice: number | null;
    onFormChange: (patch: Partial<NewBookingFormState>) => void;
    onSubmit: (e: FormEvent) => void;
    onCancel: () => void;
    onDismissError: () => void;
    onClose: () => void;
};

export function NewBookingModalView({
    courtName,
    trainers,
    form,
    apiError,
    isPending,
    selectedPrice,
    onFormChange,
    onSubmit,
    onCancel,
    onDismissError,
    onClose,
}: Props): JSX.Element {
    const [skillOpen, setSkillOpen] = useState(false);
    const [eventOpen, setEventOpen] = useState(false);

    const formattedDate = form.bookingDate
        ? new Date(form.bookingDate + "T00:00:00").toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
          })
        : "—";

    const formattedTime = form.startTime ? formatSlotTime(form.startTime) : "—";
    const formattedPrice = form.startTime ? (formatCurrency(selectedPrice) ?? "—") : "—";

    return (
        <form onSubmit={onSubmit} noValidate className="flex h-full flex-col">
            {/* ── Sticky header ── */}
            <div className="shrink-0 border-b border-border px-6 pb-5 pt-6">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                            <CalendarDays size={18} />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">New Booking</h2>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                Review the details and fill in the remaining information.
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
                    {/* Context pills — Court, Date, Start Time, Price */}
                    <div className="grid grid-cols-4 gap-2">
                        <StatPill label="Court" value={courtName} />
                        <StatPill label="Date" value={formattedDate} />
                        <StatPill label="Start Time" value={formattedTime} />
                        <StatPill label="Price" value={formattedPrice} />
                    </div>

                    {/* Booking Type + Max Players */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>
                                Booking Type <span className="text-destructive">*</span>
                            </label>
                            <SelectInput
                                value={form.bookingType}
                                onValueChange={(v) =>
                                    onFormChange({ bookingType: v as BookingType })
                                }
                                options={typeOptions}
                            />
                        </div>
                        <div>
                            <label htmlFor="bk-max-players" className={labelCls}>
                                Max Players <span className="text-destructive">*</span>
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
                    </div>

                    {/* Notes */}
                    <div>
                        <label className={labelCls}>Notes</label>
                        <textarea
                            rows={3}
                            className={fieldCls}
                            placeholder="Internal notes visible to staff only…"
                            value={form.notes}
                            onChange={(e) => onFormChange({ notes: e.target.value })}
                        />
                    </div>

                    {/* On behalf of */}
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

                    {/* Staff (Trainer) */}
                    <div>
                        <label htmlFor="bk-staff-id" className={labelCls}>
                            Staff (Trainer)
                        </label>
                        <SelectInput
                            value={form.staffProfileId}
                            onValueChange={(v) => onFormChange({ staffProfileId: v })}
                            options={trainers.map((t) => ({ value: t.id, label: t.id }))}
                            placeholder={trainers.length === 0 ? "No trainers available" : "Select trainer…"}
                            disabled={trainers.length === 0}
                        />
                    </div>

                    {/* Collapsible: Open Game & Skill Level — regular bookings only */}
                    {form.bookingType === "regular" ? (
                        <div className="overflow-hidden rounded-lg border border-border">
                            <button
                                type="button"
                                onClick={() => setSkillOpen((o) => !o)}
                                className="flex w-full items-center justify-between bg-muted/20 px-4 py-3 text-left transition hover:bg-muted/40"
                                aria-expanded={skillOpen}
                            >
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    Open Game &amp; Skill Level{" "}
                                    <span className="text-[10px] font-normal normal-case text-muted-foreground">
                                        (optional)
                                    </span>
                                </span>
                                {skillOpen ? (
                                    <ChevronDown size={13} className="text-muted-foreground" />
                                ) : (
                                    <ChevronRight size={13} className="text-muted-foreground" />
                                )}
                            </button>
                            {skillOpen ? (
                                <div className="space-y-3 border-t border-border p-4">
                                    <p className="text-xs text-muted-foreground">
                                        Mark as open and set skill range requirements for matchmaking.
                                    </p>
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
                                    <div className="grid grid-cols-3 gap-4">
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
                                                onChange={(e) =>
                                                    onFormChange({ anchorSkill: e.target.value })
                                                }
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
                                                onChange={(e) =>
                                                    onFormChange({ skillMin: e.target.value })
                                                }
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
                                                onChange={(e) =>
                                                    onFormChange({ skillMax: e.target.value })
                                                }
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    ) : null}

                    {/* Collapsible: Event & Contact — corporate or tournament only */}
                    {form.bookingType === "corporate_event" ||
                    form.bookingType === "tournament" ? (
                    <div className="overflow-hidden rounded-lg border border-border">
                        <button
                            type="button"
                            onClick={() => setEventOpen((o) => !o)}
                            className="flex w-full items-center justify-between bg-muted/20 px-4 py-3 text-left transition hover:bg-muted/40"
                            aria-expanded={eventOpen}
                        >
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Event &amp; Contact{" "}
                                <span className="text-[10px] font-normal normal-case text-muted-foreground">
                                    (optional)
                                </span>
                            </span>
                            {eventOpen ? (
                                <ChevronDown size={13} className="text-muted-foreground" />
                            ) : (
                                <ChevronRight size={13} className="text-muted-foreground" />
                            )}
                        </button>
                        {eventOpen ? (
                            <div className="space-y-3 border-t border-border p-4">
                                <p className="text-xs text-muted-foreground">
                                    For corporate or tournament bookings.
                                </p>
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
                                        onChange={(e) =>
                                            onFormChange({ eventName: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
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
                            </div>
                        ) : null}
                    </div>
                    ) : null}
                </div>
            </div>

            {/* ── Sticky footer ── */}
            <div className="shrink-0 flex items-center justify-end gap-3 border-t border-border px-6 py-4">
                <button type="button" onClick={onCancel} className="btn-outline">
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isPending}
                    className="btn-cta flex items-center gap-2"
                >
                    <CalendarDays size={14} />
                    {isPending ? "Creating…" : "Create Booking"}
                </button>
            </div>
        </form>
    );
}
