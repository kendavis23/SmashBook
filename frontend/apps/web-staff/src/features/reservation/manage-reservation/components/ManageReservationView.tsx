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
import { X } from "lucide-react";
import type { CalendarReservation, CalendarReservationType } from "../../types";
import {
    RESERVATION_TYPE_LABELS,
    RESERVATION_TYPE_COLORS,
    RESERVATION_TYPE_OPTIONS,
} from "../../types";

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

    const toggleBookingType = (val: string): void => {
        const next = form.allowedBookingTypes.includes(val)
            ? form.allowedBookingTypes.filter((t) => t !== val)
            : [...form.allowedBookingTypes, val];
        onFormChange({ allowedBookingTypes: next });
    };

    const formBody = (
        <>
            {apiError ? (
                <div className="mb-4">
                    <AlertToast title={apiError} variant="error" onClose={onDismissError} />
                </div>
            ) : null}
            {updateSuccess ? (
                <AlertToast
                    title="Reservation updated successfully."
                    variant="success"
                    onClose={() => {
                        /* auto-dismiss handled by container */
                    }}
                />
            ) : null}

            {canEdit ? (
                <form onSubmit={onSubmit} noValidate className="space-y-5">
                    {/* Core details */}
                    <div>
                        <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Core Details
                        </p>

                        <div className="space-y-3">
                            <div>
                                <label htmlFor="mr-title" className={labelCls}>
                                    Title
                                </label>
                                <input
                                    id="mr-title"
                                    type="text"
                                    className={fieldCls}
                                    value={form.title}
                                    onChange={(e) => onFormChange({ title: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="mr-type" className={labelCls}>
                                        Reservation Type <span className="text-destructive">*</span>
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

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label htmlFor="mr-date" className={labelCls}>
                                        Date
                                    </label>
                                    <DatePicker
                                        value={form.date}
                                        onChange={(v) => onFormChange({ date: v })}
                                        minDate={todayStr}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="mr-start-time" className={labelCls}>
                                        Start Time
                                    </label>
                                    <TimeInput
                                        id="mr-start-time"
                                        className={fieldCls}
                                        value={form.startTime}
                                        onChange={(e) =>
                                            onFormChange({ startTime: e.target.value })
                                        }
                                    />
                                </div>
                                <div>
                                    <label htmlFor="mr-end-time" className={labelCls}>
                                        End Time
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
                    </div>

                    {/* Allowed booking types */}
                    <div className="overflow-hidden rounded-lg border border-border">
                        <div className="bg-muted/20 px-4 py-2.5">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Allowed Booking Types
                            </span>
                        </div>
                        <div className="border-t border-border p-4">
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
                    </div>

                    {/* Recurring */}
                    <div className="overflow-hidden rounded-lg border border-border">
                        <div className="bg-muted/20 px-4 py-2.5">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Recurrence
                            </span>
                        </div>
                        <div className="space-y-3 border-t border-border p-4">
                            <div className="flex items-center gap-3">
                                <input
                                    id="mr-recurring"
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-border accent-cta"
                                    checked={form.isRecurring}
                                    onChange={(e) =>
                                        onFormChange({ isRecurring: e.target.checked })
                                    }
                                />
                                <label
                                    htmlFor="mr-recurring"
                                    className="text-sm font-medium text-foreground"
                                >
                                    Recurring
                                </label>
                            </div>

                            {form.isRecurring ? (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label htmlFor="mr-rrule" className={labelCls}>
                                            Recurrence Rule
                                        </label>
                                        <input
                                            id="mr-rrule"
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
                                        <label htmlFor="mr-rrule-end" className={labelCls}>
                                            Recurrence End Date
                                        </label>
                                        <DatePicker
                                            value={form.recurrenceEndDate}
                                            onChange={(v) => onFormChange({ recurrenceEndDate: v })}
                                        />
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between border-t border-border pt-4">
                        {mode === "modal" && canEdit ? (
                            <button
                                type="button"
                                onClick={onDelete}
                                disabled={isDeleting}
                                className="btn-destructive"
                            >
                                {isDeleting ? "Deleting…" : "Delete Reservation"}
                            </button>
                        ) : (
                            <span />
                        )}
                        <div className="flex items-center gap-2">
                            <button type="button" onClick={onBack} className="btn-outline">
                                {mode === "modal" ? "Close" : "Back"}
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
                <div className="flex justify-start pt-2">
                    <button type="button" onClick={onBack} className="btn-outline">
                        {mode === "modal" ? "Close" : "Back"}
                    </button>
                </div>
            )}
        </>
    );

    if (mode === "modal") {
        return (
            <div className="flex flex-col">
                {/* Header */}
                <div className="mb-5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-base font-semibold text-foreground">
                                {reservation.title}
                            </h2>
                            <span
                                className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${colors.bg} ${colors.text}`}
                            >
                                {RESERVATION_TYPE_LABELS[reservation.reservation_type] ??
                                    reservation.reservation_type}
                            </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            {formatUTCDateTime(reservation.start_datetime)} &ndash;{" "}
                            {formatUTCDateTime(reservation.end_datetime)}
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

                {formBody}
            </div>
        );
    }

    return (
        <div className="w-full space-y-5">
            <Breadcrumb
                items={[
                    { label: "Reservations", href: "/reservations" },
                    { label: "Manage Reservation" },
                ]}
            />

            <section className="w-full rounded-xl border border-border bg-card px-6 py-6 shadow-sm sm:px-8">
                <header className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold text-foreground">
                            {reservation.title}
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {formatUTCDateTime(reservation.start_datetime)} &ndash;{" "}
                            {formatUTCDateTime(reservation.end_datetime)}
                        </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${colors.bg} ${colors.text}`}
                        >
                            {RESERVATION_TYPE_LABELS[reservation.reservation_type] ??
                                reservation.reservation_type}
                        </span>
                        {canEdit ? (
                            <button
                                type="button"
                                onClick={onDelete}
                                disabled={isDeleting}
                                className="btn-destructive"
                            >
                                {isDeleting ? "Deleting…" : "Delete Reservation"}
                            </button>
                        ) : null}
                    </div>
                </header>

                <div className="mt-5 space-y-4">{formBody}</div>
            </section>
        </div>
    );
}
