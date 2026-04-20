import type { FormEvent, JSX } from "react";
import { useMemo } from "react";
import { Breadcrumb, AlertToast, DatePicker, TimeInput, SelectInput } from "@repo/ui";
import type { CalendarReservationType, Court } from "../../types";
import { RESERVATION_TYPE_OPTIONS } from "../../types";

const fieldCls =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground " +
    "placeholder:text-muted-foreground transition focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta-ring/30";

const labelCls = "mb-1 block text-sm font-medium text-foreground";

const BOOKING_TYPE_OPTIONS = [
    { value: "regular", label: "Regular" },
    { value: "training", label: "Training" },
    { value: "tournament", label: "Tournament" },
    { value: "guest", label: "Guest" },
];

export type NewReservationFormState = {
    title: string;
    reservationType: CalendarReservationType;
    courtId: string;
    date: string;
    startTime: string;
    endTime: string;
    allowedBookingTypes: string[];
    isRecurring: boolean;
    recurrenceRule: string;
    recurrenceEndDate: string;
};

type Props = {
    courts: Court[];
    form: NewReservationFormState;
    titleError: string;
    timeError: string;
    apiError: string;
    isPending: boolean;
    onFormChange: (patch: Partial<NewReservationFormState>) => void;
    onSubmit: (e: FormEvent) => void;
    onCancel: () => void;
    onDismissError: () => void;
};

const typeOptions = RESERVATION_TYPE_OPTIONS.filter((o) => o.value !== "");

export default function NewReservationView({
    courts,
    form,
    titleError,
    timeError,
    apiError,
    isPending,
    onFormChange,
    onSubmit,
    onCancel,
    onDismissError,
}: Props): JSX.Element {
    const todayStr = useMemo(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }, []);

    const toggleBookingType = (val: string): void => {
        const next = form.allowedBookingTypes.includes(val)
            ? form.allowedBookingTypes.filter((t) => t !== val)
            : [...form.allowedBookingTypes, val];
        onFormChange({ allowedBookingTypes: next });
    };

    return (
        <div className="w-full space-y-5">
            <Breadcrumb
                items={[
                    { label: "Reservations", href: "/reservations" },
                    { label: "New Reservation" },
                ]}
            />

            <section className="card-surface overflow-hidden">
                <header className="border-b border-border bg-muted/10 px-5 py-4 sm:px-6">
                    <h1 className="text-lg font-semibold tracking-tight text-foreground">
                        New Reservation
                    </h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Block court time for training, tournaments, or maintenance.
                    </p>
                </header>

                <div className="px-5 py-6 sm:px-6">
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
                                        Set the title, type, court, and time window for this
                                        reservation.
                                    </p>
                                </div>

                                {/* Title */}
                                <div className="mb-4">
                                    <label htmlFor="res-title" className={labelCls}>
                                        Title <span className="text-destructive">*</span>
                                    </label>
                                    <input
                                        id="res-title"
                                        type="text"
                                        className={`${fieldCls} ${titleError ? "border-destructive focus:border-destructive focus:ring-destructive/20" : ""}`}
                                        placeholder="e.g. Morning Training Block"
                                        value={form.title}
                                        onChange={(e) => {
                                            onFormChange({ title: e.target.value });
                                        }}
                                    />
                                    {titleError ? (
                                        <p className="mt-1 text-xs text-destructive">
                                            {titleError}
                                        </p>
                                    ) : null}
                                </div>

                                {/* Type + Court */}
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label htmlFor="res-type" className={labelCls}>
                                            Reservation Type{" "}
                                            <span className="text-destructive">*</span>
                                        </label>
                                        <SelectInput
                                            value={form.reservationType}
                                            onValueChange={(v) =>
                                                onFormChange({
                                                    reservationType: v as CalendarReservationType,
                                                })
                                            }
                                            options={typeOptions}
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="res-court" className={labelCls}>
                                            Court <span className="text-destructive">*</span>
                                        </label>
                                        <SelectInput
                                            value={form.courtId}
                                            onValueChange={(v) => onFormChange({ courtId: v })}
                                            options={courts.map((court) => ({
                                                value: court.id,
                                                label: court.name,
                                            }))}
                                        />
                                    </div>
                                </div>

                                {/* Date / Start / End time */}
                                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                                    <div>
                                        <label htmlFor="res-date" className={labelCls}>
                                            Date <span className="text-destructive">*</span>
                                        </label>
                                        <DatePicker
                                            value={form.date}
                                            onChange={(v) => onFormChange({ date: v })}
                                            minDate={todayStr}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="res-start-time" className={labelCls}>
                                            Start Time <span className="text-destructive">*</span>
                                        </label>
                                        <TimeInput
                                            id="res-start-time"
                                            className={`${fieldCls} ${timeError ? "!border-destructive" : ""}`}
                                            value={form.startTime}
                                            onChange={(e) =>
                                                onFormChange({ startTime: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="res-end-time" className={labelCls}>
                                            End Time <span className="text-destructive">*</span>
                                        </label>
                                        <TimeInput
                                            id="res-end-time"
                                            className={`${fieldCls} ${timeError ? "!border-destructive" : ""}`}
                                            value={form.endTime}
                                            onChange={(e) =>
                                                onFormChange({ endTime: e.target.value })
                                            }
                                        />
                                    </div>
                                </div>
                                {timeError ? (
                                    <p className="mt-1 text-xs text-destructive">{timeError}</p>
                                ) : null}
                            </section>

                            {/* Allowed booking types */}
                            <section className="form-section">
                                <div className="mb-4">
                                    <h3 className="text-sm font-semibold text-foreground">
                                        Allowed Booking Types{" "}
                                        <span className="text-xs font-normal text-muted-foreground">
                                            (optional)
                                        </span>
                                    </h3>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Limit which booking types are permitted during this
                                        reservation window.
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {BOOKING_TYPE_OPTIONS.map((opt) => {
                                        const checked = form.allowedBookingTypes.includes(
                                            opt.value
                                        );
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
                            </section>

                            {/* Recurring */}
                            <section className="form-section">
                                <div className="mb-4">
                                    <h3 className="text-sm font-semibold text-foreground">
                                        Recurrence{" "}
                                        <span className="text-xs font-normal text-muted-foreground">
                                            (optional)
                                        </span>
                                    </h3>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Repeat this reservation on a schedule.
                                    </p>
                                </div>

                                <div className="flex items-center gap-3">
                                    <input
                                        id="res-recurring"
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-border accent-cta"
                                        checked={form.isRecurring}
                                        onChange={(e) =>
                                            onFormChange({ isRecurring: e.target.checked })
                                        }
                                    />
                                    <label
                                        htmlFor="res-recurring"
                                        className="text-sm font-medium text-foreground"
                                    >
                                        Recurring
                                    </label>
                                </div>

                                {form.isRecurring ? (
                                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div>
                                            <label htmlFor="res-rrule" className={labelCls}>
                                                Recurrence Rule
                                                <span className="ml-1 text-xs font-normal text-muted-foreground">
                                                    (RRULE format)
                                                </span>
                                            </label>
                                            <input
                                                id="res-rrule"
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
                                            <label htmlFor="res-rrule-end" className={labelCls}>
                                                Recurrence End Date
                                            </label>
                                            <DatePicker
                                                value={form.recurrenceEndDate}
                                                onChange={(v) =>
                                                    onFormChange({ recurrenceEndDate: v })
                                                }
                                            />
                                        </div>
                                    </div>
                                ) : null}
                            </section>
                        </div>

                        {/* Actions */}
                        <div className="mt-8 flex items-center justify-end gap-3 border-t border-border pt-5">
                            <button type="button" onClick={onCancel} className="btn-outline">
                                Cancel
                            </button>
                            <button type="submit" disabled={isPending} className="btn-cta">
                                {isPending ? "Creating…" : "Create Reservation"}
                            </button>
                        </div>
                    </form>
                </div>
            </section>
        </div>
    );
}
