import type { FormEvent, JSX } from "react";
import { CalendarRange, X } from "lucide-react";
import { AlertToast, StatPill, TimeInput } from "@repo/ui";
import { SelectInput } from "@repo/ui";
import type { CalendarReservationType } from "../../types";
import { RESERVATION_TYPE_OPTIONS } from "../../types";
import type { NewReservationFormState } from "./NewReservationView";

const fieldCls =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground " +
    "placeholder:text-muted-foreground transition focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta-ring/30";

const labelCls = "mb-1 block text-sm font-medium text-foreground";

const BOOKING_TYPE_OPTIONS = [
    { value: "regular", label: "Regular" },
    { value: "training", label: "Training" },
    { value: "tournament", label: "Tournament" },
];

const typeOptions = RESERVATION_TYPE_OPTIONS.filter((o) => o.value !== "");

type Props = {
    form: NewReservationFormState;
    titleError: string;
    timeError: string;
    apiError: string;
    isPending: boolean;
    lockedCourtName?: string;
    lockedDate?: string;
    lockedStartTime?: string;
    onFormChange: (patch: Partial<NewReservationFormState>) => void;
    onSubmit: (e: FormEvent) => void;
    onCancel: () => void;
    onClose: () => void;
    onDismissError: () => void;
};

function formatTime(t?: string): string {
    if (!t) return "—";
    const [hRaw, min] = t.split(":").map(Number);
    const h = (hRaw ?? 0) % 24;
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${String(min ?? 0).padStart(2, "0")} ${ampm}`;
}

export function NewReservationModalView({
    form,
    titleError,
    timeError,
    apiError,
    isPending,
    lockedCourtName,
    lockedDate,
    lockedStartTime,
    onFormChange,
    onSubmit,
    onCancel,
    onClose,
    onDismissError,
}: Props): JSX.Element {
    const formattedDate = lockedDate
        ? new Date(lockedDate + "T00:00:00").toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
          })
        : "—";

    const toggleBookingType = (val: string): void => {
        const next = form.allowedBookingTypes.includes(val)
            ? form.allowedBookingTypes.filter((t) => t !== val)
            : [...form.allowedBookingTypes, val];
        onFormChange({ allowedBookingTypes: next });
    };

    return (
        <form onSubmit={onSubmit} noValidate className="flex h-full flex-col">
            {/* ── Sticky header ── */}
            <div className="shrink-0 border-b border-border px-6 pb-5 pt-6">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                            <CalendarRange size={18} />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">
                                New Reservation
                            </h2>
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
                    {/* Read-only context pills */}
                    <div className="grid grid-cols-3 gap-2">
                        <StatPill label="Court" value={lockedCourtName ?? "—"} />
                        <StatPill label="Date" value={formattedDate} />
                        <StatPill label="Start" value={formatTime(lockedStartTime)} />
                    </div>

                    {/* Title */}
                    <div>
                        <label htmlFor="res-modal-title" className={labelCls}>
                            Title <span className="text-destructive">*</span>
                        </label>
                        <input
                            id="res-modal-title"
                            type="text"
                            className={`${fieldCls} ${titleError ? "border-destructive focus:border-destructive focus:ring-destructive/20" : ""}`}
                            placeholder="e.g. Morning Training Block"
                            value={form.title}
                            onChange={(e) => onFormChange({ title: e.target.value })}
                        />
                        {titleError ? (
                            <p className="mt-1 text-xs text-destructive">{titleError}</p>
                        ) : null}
                    </div>

                    {/* Type + End Time */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="res-modal-type" className={labelCls}>
                                Type <span className="text-destructive">*</span>
                            </label>
                            <SelectInput
                                value={form.reservationType}
                                onValueChange={(v) =>
                                    onFormChange({ reservationType: v as CalendarReservationType })
                                }
                                options={typeOptions}
                            />
                        </div>
                        <div>
                            <label htmlFor="res-modal-end-time" className={labelCls}>
                                End Time <span className="text-destructive">*</span>
                            </label>
                            <TimeInput
                                id="res-modal-end-time"
                                className={`${fieldCls} ${timeError ? "!border-destructive" : ""}`}
                                value={form.endTime}
                                onChange={(e) => onFormChange({ endTime: e.target.value })}
                            />
                        </div>
                    </div>

                    {timeError ? <p className="text-xs text-destructive">{timeError}</p> : null}

                    {/* Allowed Booking Types */}
                    <div className="overflow-hidden rounded-lg border border-border p-4">
                        <p className="mb-2 text-sm font-semibold text-foreground">
                            Allowed Booking Types
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {BOOKING_TYPE_OPTIONS.map((opt) => {
                                const checked = form.allowedBookingTypes.includes(opt.value);
                                return (
                                    <label
                                        key={opt.value}
                                        className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition ${
                                            checked
                                                ? "border-cta bg-cta/10 text-cta"
                                                : "border-border bg-background text-foreground hover:bg-muted/30"
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            className="sr-only"
                                            checked={checked}
                                            onChange={() => toggleBookingType(opt.value)}
                                        />
                                        {opt.label}
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    {/* Recurring */}
                    <div className="overflow-hidden rounded-lg border border-border p-4 space-y-3">
                        <div className="flex items-center gap-3">
                            <input
                                id="res-modal-recurring"
                                type="checkbox"
                                className="h-4 w-4 rounded border-border accent-cta"
                                checked={form.isRecurring}
                                onChange={(e) => onFormChange({ isRecurring: e.target.checked })}
                            />
                            <label
                                htmlFor="res-modal-recurring"
                                className="text-sm font-medium text-foreground"
                            >
                                Enable recurring schedule
                            </label>
                        </div>
                        {form.isRecurring ? (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="res-modal-rrule" className={labelCls}>
                                        Recurrence Rule
                                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                                            (RRULE)
                                        </span>
                                    </label>
                                    <input
                                        id="res-modal-rrule"
                                        type="text"
                                        className={fieldCls}
                                        placeholder="FREQ=WEEKLY;BYDAY=MO;COUNT=12"
                                        value={form.recurrenceRule}
                                        onChange={(e) =>
                                            onFormChange({ recurrenceRule: e.target.value })
                                        }
                                    />
                                </div>
                                <div>
                                    <label htmlFor="res-modal-rrule-end" className={labelCls}>
                                        End Date
                                    </label>
                                    <input
                                        id="res-modal-rrule-end"
                                        type="date"
                                        className={fieldCls}
                                        value={form.recurrenceEndDate}
                                        onChange={(e) =>
                                            onFormChange({ recurrenceEndDate: e.target.value })
                                        }
                                    />
                                </div>
                            </div>
                        ) : null}
                    </div>
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
                    <CalendarRange size={14} />
                    {isPending ? "Creating…" : "Create Reservation"}
                </button>
            </div>
        </form>
    );
}
