import type { FormEvent, JSX } from "react";
import { useMemo } from "react";
import { X } from "lucide-react";
import {
    AlertToast,
    DatePicker,
    RecurrencePicker,
    TimeInput,
    SelectInput,
    formatUTCDate,
    formatUTCTime,
} from "@repo/ui";
import type { CalendarReservation, CalendarReservationType } from "../../types";
import {
    RESERVATION_TYPE_LABELS,
    RESERVATION_TYPE_COLORS,
    RESERVATION_TYPE_OPTIONS,
} from "../../types";
import type { ManageReservationFormState } from "./ManageReservationView";

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

const BOOKING_TYPE_OPTIONS = [
    { value: "regular", label: "Regular" },
    { value: "training", label: "Training" },
    { value: "tournament", label: "Tournament" },
    { value: "guest", label: "Guest" },
];

const typeOptions = RESERVATION_TYPE_OPTIONS.filter((o) => o.value !== "");

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
    onClose: () => void;
};

export function ManageReservationModalView({
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
    onClose,
}: Props): JSX.Element {
    const colors =
        RESERVATION_TYPE_COLORS[reservation.reservation_type] ??
        RESERVATION_TYPE_COLORS["private_hire"]!;

    const courtName = useMemo(
        () => courts.find((c) => c.id === reservation.court_id)?.name ?? "—",
        [courts, reservation.court_id]
    );

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

    const formattedTimeRange = `${formatUTCTime(reservation.start_datetime)} - ${formatUTCTime(
        reservation.end_datetime
    )}`;

    return (
        <form
            onSubmit={canEdit ? onSubmit : undefined}
            noValidate
            className="flex h-full flex-col overflow-hidden rounded-xl bg-card"
        >
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-2.5">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold tracking-tight text-foreground">
                            {reservation.title}
                        </h2>
                        <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${colors.bg} ${colors.text}`}
                        >
                            {RESERVATION_TYPE_LABELS[reservation.reservation_type] ??
                                reservation.reservation_type}
                        </span>
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
            </header>

            <main className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-3">
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

                <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border/70 bg-border/70 sm:grid-cols-4">
                    <DetailItem
                        label="Type"
                        value={
                            RESERVATION_TYPE_LABELS[reservation.reservation_type] ??
                            reservation.reservation_type
                        }
                    />
                    <DetailItem label="Court" value={courtName} />
                    <DetailItem label="Date" value={formatUTCDate(reservation.start_datetime)} />
                    <DetailItem label="Time" value={formattedTimeRange} />
                </ul>

                {/* Edit form — only when editable */}
                {canEdit ? (
                    <>
                        <section className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${dividerCls}`}>
                            <div className="sm:col-span-2">
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

                            <div>
                                <label htmlFor="mr-type" className={labelCls}>
                                    Type <span className="text-destructive">*</span>
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
                                    options={courts.map((c) => ({
                                        value: c.id,
                                        label: c.name,
                                    }))}
                                />
                            </div>

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
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="mr-start-time" className={labelCls}>
                                        Start Time <span className="text-destructive">*</span>
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
                        </section>

                        <section className={sectionCls}>
                            <p className={labelCls}>Allowed Booking Types</p>
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
                        </section>

                        <section className={sectionCls}>
                            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
                                <input
                                    id="mr-recurring"
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-border accent-cta"
                                    checked={form.isRecurring}
                                    onChange={(e) =>
                                        onFormChange({ isRecurring: e.target.checked })
                                    }
                                />
                                <span className="text-sm font-medium text-foreground">
                                    Enable recurring schedule
                                </span>
                            </label>
                            {form.isRecurring ? (
                                <RecurrencePicker
                                    value={form.recurrenceRule || undefined}
                                    onChange={(rrule) => onFormChange({ recurrenceRule: rrule })}
                                />
                            ) : null}
                        </section>
                    </>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        You do not have permission to edit this reservation.
                    </p>
                )}
            </main>

            <footer className="flex shrink-0 items-center justify-between border-t border-border px-5 py-2.5">
                {canEdit ? (
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
                        Close
                    </button>
                    {canEdit ? (
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
        </form>
    );
}
