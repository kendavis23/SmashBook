import type { FormEvent, JSX } from "react";
import { useMemo } from "react";
import {
    Breadcrumb,
    AlertToast,
    DatePicker,
    TimeInput,
    formatUTCDateTime,
    SelectInput,
} from "@repo/ui";
import { Calendar, Clock, Repeat, ShieldCheck, Trash2 } from "lucide-react";
import type { CalendarReservation, CalendarReservationType } from "../../types";
import {
    RESERVATION_TYPE_LABELS,
    RESERVATION_TYPE_COLORS,
    RESERVATION_TYPE_OPTIONS,
} from "../../types";
import { ManageReservationModalView } from "./ManageReservationModalView";

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

export type ManageReservationFormState = {
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
    reservation: CalendarReservation;
    courts: { id: string; name: string }[];
    form: ManageReservationFormState;
    isDirty: boolean;
    canEdit: boolean;
    apiError: string;
    updateSuccess: boolean;
    isUpdating: boolean;
    isDeleting: boolean;
    onFormChange: (patch: Partial<ManageReservationFormState>) => void;
    onSubmit: (e: FormEvent) => void;
    onDelete: () => void;
    onDismissError: () => void;
    onBack: () => void;
    mode?: "page" | "modal";
    onClose?: () => void;
};

export default function ManageReservationView({
    reservation,
    courts,
    form,
    isDirty,
    canEdit,
    apiError,
    updateSuccess,
    isUpdating,
    isDeleting,
    onFormChange,
    onSubmit,
    onDelete,
    onDismissError,
    onBack,
    mode = "page",
    onClose,
}: Props): JSX.Element {
    const colors =
        RESERVATION_TYPE_COLORS[reservation.reservation_type] ??
        RESERVATION_TYPE_COLORS["private_hire"]!;

    const todayStr = useMemo(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }, []);

    // Delegate immediately — no modal layout in this file
    if (mode === "modal") {
        return (
            <ManageReservationModalView
                reservation={reservation}
                courts={courts}
                form={form}
                isDirty={isDirty}
                canEdit={canEdit}
                apiError={apiError}
                updateSuccess={updateSuccess}
                isUpdating={isUpdating}
                isDeleting={isDeleting}
                onFormChange={onFormChange}
                onSubmit={onSubmit}
                onDelete={onDelete}
                onDismissError={onDismissError}
                onBack={onBack}
                onClose={onClose ?? onBack}
            />
        );
    }

    const toggleBookingType = (val: string): void => {
        const next = form.allowedBookingTypes.includes(val)
            ? form.allowedBookingTypes.filter((t) => t !== val)
            : [...form.allowedBookingTypes, val];
        onFormChange({ allowedBookingTypes: next });
    };

    const coreDetailsSection = (
        <div className="space-y-4">
            <div>
                <label htmlFor="mr-title" className={labelCls}>
                    Title <span className="text-destructive">*</span>
                </label>
                <input
                    id="mr-title"
                    type="text"
                    className={fieldCls}
                    placeholder="e.g. Morning Training Block"
                    value={form.title}
                    onChange={(e) => onFormChange({ title: e.target.value })}
                />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                    <label htmlFor="mr-type" className={labelCls}>
                        Reservation Type <span className="text-destructive">*</span>
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
                    <label htmlFor="mr-court" className={labelCls}>
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                    <label htmlFor="mr-date" className={labelCls}>
                        Date <span className="text-destructive">*</span>
                    </label>
                    <DatePicker
                        value={form.date}
                        onChange={(v) => onFormChange({ date: v })}
                        minDate={todayStr}
                    />
                </div>
                <div>
                    <label htmlFor="mr-start-time" className={labelCls}>
                        Start Time <span className="text-destructive">*</span>
                    </label>
                    <TimeInput
                        id="mr-start-time"
                        className={fieldCls}
                        value={form.startTime}
                        onChange={(e) => onFormChange({ startTime: e.target.value })}
                    />
                </div>
                <div>
                    <label htmlFor="mr-end-time" className={labelCls}>
                        End Time <span className="text-destructive">*</span>
                    </label>
                    <TimeInput
                        id="mr-end-time"
                        className={fieldCls}
                        value={form.endTime}
                        onChange={(e) => onFormChange({ endTime: e.target.value })}
                    />
                </div>
            </div>
        </div>
    );

    const allowedTypesSection = (
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
    );

    const recurrenceSection = (
        <div className="space-y-3">
            <div className="flex items-center gap-3">
                <input
                    id="mr-recurring"
                    type="checkbox"
                    className="h-4 w-4 rounded border-border accent-cta"
                    checked={form.isRecurring}
                    onChange={(e) => onFormChange({ isRecurring: e.target.checked })}
                />
                <label htmlFor="mr-recurring" className="text-sm font-medium text-foreground">
                    Enable recurring schedule
                </label>
            </div>

            {form.isRecurring ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label htmlFor="mr-rrule" className={labelCls}>
                            Recurrence Rule
                            <span className="ml-1 text-xs font-normal text-muted-foreground">
                                (RRULE)
                            </span>
                        </label>
                        <input
                            id="mr-rrule"
                            type="text"
                            className={fieldCls}
                            placeholder="FREQ=WEEKLY;BYDAY=MO;COUNT=12"
                            value={form.recurrenceRule}
                            onChange={(e) => onFormChange({ recurrenceRule: e.target.value })}
                        />
                    </div>
                    <div>
                        <label htmlFor="mr-rrule-end" className={labelCls}>
                            End Date
                        </label>
                        <DatePicker
                            value={form.recurrenceEndDate}
                            onChange={(v) => onFormChange({ recurrenceEndDate: v })}
                        />
                    </div>
                </div>
            ) : null}
        </div>
    );

    // ── Page mode ────────────────────────────────────────────────────────────
    return (
        <div className="w-full space-y-5">
            <Breadcrumb
                items={[
                    { label: "Reservations", onClick: onBack },
                    { label: reservation.title },
                ]}
            />

            {/* Page header card */}
            <div className="card-surface overflow-hidden">
                <div className="flex flex-col gap-4 border-b border-border bg-muted/10 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-lg font-semibold tracking-tight text-foreground">
                                {reservation.title}
                            </h1>
                            <span
                                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${colors.bg} ${colors.text}`}
                            >
                                {RESERVATION_TYPE_LABELS[reservation.reservation_type] ??
                                    reservation.reservation_type}
                            </span>
                            {reservation.is_recurring ? (
                                <span className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                                    <Repeat size={10} />
                                    Recurring
                                </span>
                            ) : null}
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <Calendar size={12} />
                                {formatUTCDateTime(reservation.start_datetime)}
                            </span>
                            <span className="flex items-center gap-1">
                                <Clock size={12} />
                                {formatUTCDateTime(reservation.end_datetime)}
                            </span>
                        </div>
                    </div>

                    {canEdit ? (
                        <button
                            type="button"
                            onClick={onDelete}
                            disabled={isDeleting}
                            className="btn-destructive flex shrink-0 items-center gap-1.5"
                        >
                            <Trash2 size={14} />
                            {isDeleting ? "Deleting…" : "Delete Reservation"}
                        </button>
                    ) : null}
                </div>

                {/* Alerts */}
                {apiError || updateSuccess ? (
                    <div className="px-5 pt-4 sm:px-6">
                        {apiError ? (
                            <AlertToast title={apiError} variant="error" onClose={onDismissError} />
                        ) : null}
                        {updateSuccess ? (
                            <AlertToast
                                title="Reservation updated successfully."
                                variant="success"
                                onClose={() => {}}
                            />
                        ) : null}
                    </div>
                ) : null}

                {/* Form body */}
                <div className="px-5 py-6 sm:px-6">
                    {canEdit ? (
                        <form onSubmit={onSubmit} noValidate>
                            <div className="space-y-4">
                                {/* Core Details */}
                                <section className="form-section">
                                    <div className="mb-4 flex items-start gap-2.5">
                                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-cta/10">
                                            <Calendar size={14} className="text-cta" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold text-foreground">
                                                Core Details
                                            </h3>
                                            <p className="mt-0.5 text-sm text-muted-foreground">
                                                Update the title, type, court, and schedule.
                                            </p>
                                        </div>
                                    </div>
                                    {coreDetailsSection}
                                </section>

                                {/* Allowed Booking Types */}
                                <section className="form-section">
                                    <div className="mb-4 flex items-start gap-2.5">
                                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-cta/10">
                                            <ShieldCheck size={14} className="text-cta" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold text-foreground">
                                                Allowed Booking Types{" "}
                                                <span className="text-xs font-normal text-muted-foreground">
                                                    (optional)
                                                </span>
                                            </h3>
                                            <p className="mt-0.5 text-sm text-muted-foreground">
                                                Restrict which booking types are permitted during
                                                this reservation.
                                            </p>
                                        </div>
                                    </div>
                                    {allowedTypesSection}
                                </section>

                                {/* Recurrence */}
                                <section className="form-section">
                                    <div className="mb-4 flex items-start gap-2.5">
                                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-cta/10">
                                            <Repeat size={14} className="text-cta" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold text-foreground">
                                                Recurring{" "}
                                                <span className="text-xs font-normal text-muted-foreground">
                                                    (optional)
                                                </span>
                                            </h3>
                                            <p className="mt-0.5 text-sm text-muted-foreground">
                                                Configure whether this reservation repeats on a
                                                schedule.
                                            </p>
                                        </div>
                                    </div>
                                    {recurrenceSection}
                                </section>
                            </div>

                            <div className="mt-8 flex items-center justify-end gap-3 border-t border-border pt-5">
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
            </div>
        </div>
    );
}
