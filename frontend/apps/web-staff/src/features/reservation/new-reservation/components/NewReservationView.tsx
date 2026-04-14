import type { FormEvent, JSX } from "react";
import { Breadcrumb, AlertToast } from "@repo/ui";
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
    startDatetime: string;
    endDatetime: string;
    anchorSkillLevel: string;
    skillRangeAbove: string;
    skillRangeBelow: string;
    allowedBookingTypes: string[];
    isRecurring: boolean;
    recurrenceRule: string;
    recurrenceEndDate: string;
};

type Props = {
    courts: Court[];
    form: NewReservationFormState;
    titleError: string;
    dateError: string;
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
    dateError,
    apiError,
    isPending,
    onFormChange,
    onSubmit,
    onCancel,
    onDismissError,
}: Props): JSX.Element {
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

            <section className="w-full rounded-xl border border-border bg-card px-6 py-6 shadow-sm sm:px-8">
                <header className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
                    <h1 className="text-xl font-semibold text-foreground">New Reservation</h1>
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
                                            Reservation Type
                                        </label>
                                        <select
                                            id="res-type"
                                            className={fieldCls}
                                            value={form.reservationType}
                                            onChange={(e) =>
                                                onFormChange({
                                                    reservationType: e.target
                                                        .value as CalendarReservationType,
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

                                    <div>
                                        <label htmlFor="res-court" className={labelCls}>
                                            Court
                                            <span className="ml-1 text-xs font-normal text-muted-foreground">
                                                (optional)
                                            </span>
                                        </label>
                                        <select
                                            id="res-court"
                                            className={fieldCls}
                                            value={form.courtId}
                                            onChange={(e) =>
                                                onFormChange({ courtId: e.target.value })
                                            }
                                        >
                                            <option value="">All courts</option>
                                            {courts.map((court) => (
                                                <option key={court.id} value={court.id}>
                                                    {court.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Start / End */}
                                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label htmlFor="res-start" className={labelCls}>
                                            Start <span className="text-destructive">*</span>
                                        </label>
                                        <input
                                            id="res-start"
                                            type="datetime-local"
                                            className={`${fieldCls} ${dateError ? "border-destructive focus:border-destructive focus:ring-destructive/20" : ""}`}
                                            value={form.startDatetime}
                                            onChange={(e) => {
                                                onFormChange({ startDatetime: e.target.value });
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="res-end" className={labelCls}>
                                            End <span className="text-destructive">*</span>
                                        </label>
                                        <input
                                            id="res-end"
                                            type="datetime-local"
                                            className={`${fieldCls} ${dateError ? "border-destructive focus:border-destructive focus:ring-destructive/20" : ""}`}
                                            value={form.endDatetime}
                                            onChange={(e) => {
                                                onFormChange({ endDatetime: e.target.value });
                                            }}
                                        />
                                    </div>
                                </div>
                                {dateError ? (
                                    <p className="mt-1 text-xs text-destructive">{dateError}</p>
                                ) : null}
                            </section>

                            {/* Skill level */}
                            <section className="form-section">
                                <div className="mb-4">
                                    <h3 className="text-sm font-semibold text-foreground">
                                        Skill Level Filter{" "}
                                        <span className="text-xs font-normal text-muted-foreground">
                                            (optional)
                                        </span>
                                    </h3>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Restrict this reservation to players within a skill range.
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                    <div>
                                        <label htmlFor="res-anchor-skill" className={labelCls}>
                                            Anchor
                                        </label>
                                        <input
                                            id="res-anchor-skill"
                                            type="number"
                                            min="0"
                                            step="0.1"
                                            className={fieldCls}
                                            placeholder="e.g. 3.5"
                                            value={form.anchorSkillLevel}
                                            onChange={(e) =>
                                                onFormChange({ anchorSkillLevel: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="res-skill-above" className={labelCls}>
                                            Range Above
                                        </label>
                                        <input
                                            id="res-skill-above"
                                            type="number"
                                            min="0"
                                            step="0.1"
                                            className={fieldCls}
                                            placeholder="e.g. 1.0"
                                            value={form.skillRangeAbove}
                                            onChange={(e) =>
                                                onFormChange({ skillRangeAbove: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="res-skill-below" className={labelCls}>
                                            Range Below
                                        </label>
                                        <input
                                            id="res-skill-below"
                                            type="number"
                                            min="0"
                                            step="0.1"
                                            className={fieldCls}
                                            placeholder="e.g. 1.0"
                                            value={form.skillRangeBelow}
                                            onChange={(e) =>
                                                onFormChange({ skillRangeBelow: e.target.value })
                                            }
                                        />
                                    </div>
                                </div>
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
                                                placeholder="FREQ=WEEKLY;BYDAY=MO"
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
                                            <input
                                                id="res-rrule-end"
                                                type="date"
                                                className={fieldCls}
                                                value={form.recurrenceEndDate}
                                                onChange={(e) =>
                                                    onFormChange({
                                                        recurrenceEndDate: e.target.value,
                                                    })
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
