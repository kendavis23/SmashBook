import type { FormEvent, JSX } from "react";
import { useMemo } from "react";
import {
    Breadcrumb,
    AlertToast,
    DatePicker,
    RecurrencePicker,
    TimeInput,
    formatUTCDate,
    formatUTCTime,
    SelectInput,
} from "@repo/ui";
import { CalendarDays, Clock3, Repeat, ShieldCheck, Trash2 } from "lucide-react";
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

const sectionShellCls =
    "rounded-xl border border-border/80 bg-card/95 p-4 shadow-sm shadow-black/5 sm:p-5";

const sectionHeaderCls =
    "mb-4 flex items-start justify-between gap-3 border-b border-border/60 pb-3";

const sectionKickerCls = "text-[11px] font-semibold uppercase tracking-wide text-cta";

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

    const courtName = useMemo(
        () => courts.find((court) => court.id === reservation.court_id)?.name ?? "—",
        [courts, reservation.court_id]
    );

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
                <RecurrencePicker
                    value={form.recurrenceRule || undefined}
                    onChange={(rrule) => onFormChange({ recurrenceRule: rrule })}
                />
            ) : null}
        </div>
    );

    return (
        <div className="w-full space-y-5">
            <Breadcrumb
                items={[{ label: "Reservations", onClick: onBack }, { label: reservation.title }]}
            />

            <section className="w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg shadow-black/5">
                <header className="relative overflow-hidden border-b border-border bg-muted/15 px-4 py-4 sm:px-6">
                    <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.14),transparent_42%)] sm:block" />
                    <div className="relative flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div className="min-w-0">
                            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-sm">
                                <CalendarDays size={13} className="text-cta" />
                                Manage reservation
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                                    {reservation.title}
                                </h1>
                                <span
                                    className={`rounded-full px-3 py-1 text-xs font-medium ${colors.bg} ${colors.text}`}
                                >
                                    {RESERVATION_TYPE_LABELS[reservation.reservation_type] ??
                                        reservation.reservation_type}
                                </span>
                                {reservation.is_recurring ? (
                                    <span className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                                        <Repeat size={12} />
                                        Recurring
                                    </span>
                                ) : null}
                            </div>
                        </div>

                        {canEdit ? (
                            <button
                                type="button"
                                onClick={onDelete}
                                disabled={isDeleting}
                                className="btn-destructive whitespace-nowrap"
                            >
                                <Trash2 size={14} />
                                {isDeleting ? "Deleting…" : "Delete Reservation"}
                            </button>
                        ) : null}
                    </div>
                </header>

                <div className="bg-background/40 px-4 py-5 sm:px-6">
                    <div className="space-y-4">
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

                        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)]">
                            <div>
                                {canEdit ? (
                                    <form onSubmit={onSubmit} noValidate>
                                        <div className="space-y-4">
                                            <section className={sectionShellCls}>
                                                <div className={sectionHeaderCls}>
                                                    <div>
                                                        <p className={sectionKickerCls}>Details</p>
                                                        <h3 className="mt-1 text-base font-semibold text-foreground">
                                                            Core Details
                                                        </h3>
                                                        <p className="mt-1 text-sm text-muted-foreground">
                                                            Update the title, type, court, and
                                                            schedule.
                                                        </p>
                                                    </div>
                                                    <Clock3
                                                        size={18}
                                                        className="mt-1 text-muted-foreground"
                                                    />
                                                </div>
                                                {coreDetailsSection}
                                            </section>

                                            <section className={sectionShellCls}>
                                                <div className={sectionHeaderCls}>
                                                    <div>
                                                        <p className={sectionKickerCls}>
                                                            Booking rules
                                                        </p>
                                                        <h3 className="mt-1 text-base font-semibold text-foreground">
                                                            Allowed Booking Types{" "}
                                                            <span className="text-xs font-normal text-muted-foreground">
                                                                (optional)
                                                            </span>
                                                        </h3>
                                                        <p className="mt-1 text-sm text-muted-foreground">
                                                            Restrict which booking types are
                                                            permitted during this reservation.
                                                        </p>
                                                    </div>
                                                    <ShieldCheck
                                                        size={18}
                                                        className="mt-1 text-muted-foreground"
                                                    />
                                                </div>
                                                {allowedTypesSection}
                                            </section>

                                            <section className={sectionShellCls}>
                                                <div className={sectionHeaderCls}>
                                                    <div>
                                                        <p className={sectionKickerCls}>Schedule</p>
                                                        <h3 className="mt-1 text-base font-semibold text-foreground">
                                                            Recurring{" "}
                                                            <span className="text-xs font-normal text-muted-foreground">
                                                                (optional)
                                                            </span>
                                                        </h3>
                                                        <p className="mt-1 text-sm text-muted-foreground">
                                                            Configure whether this reservation
                                                            repeats on a schedule.
                                                        </p>
                                                    </div>
                                                    <Repeat
                                                        size={18}
                                                        className="mt-1 text-muted-foreground"
                                                    />
                                                </div>
                                                {recurrenceSection}
                                            </section>
                                        </div>

                                        <div className="mt-5 flex items-center justify-end gap-3 border-t border-border/70 pt-5">
                                            <button
                                                type="button"
                                                onClick={onBack}
                                                className="btn-outline"
                                            >
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
                                        <button
                                            type="button"
                                            onClick={onBack}
                                            className="btn-outline"
                                        >
                                            Back
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-5">
                                <section className={sectionShellCls}>
                                    <div className={sectionHeaderCls}>
                                        <div>
                                            <p className={sectionKickerCls}>Details</p>
                                            <h3 className="mt-1 text-base font-semibold text-foreground">
                                                Overview
                                            </h3>
                                        </div>
                                    </div>
                                    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2.5">
                                            <dt className="text-xs font-medium text-muted-foreground">
                                                Type
                                            </dt>
                                            <dd className="mt-0.5 text-sm text-foreground">
                                                {RESERVATION_TYPE_LABELS[
                                                    reservation.reservation_type
                                                ] ?? reservation.reservation_type}
                                            </dd>
                                        </div>
                                        <div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2.5">
                                            <dt className="text-xs font-medium text-muted-foreground">
                                                Court
                                            </dt>
                                            <dd className="mt-0.5 text-sm text-foreground">
                                                {courtName}
                                            </dd>
                                        </div>
                                        <div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2.5">
                                            <dt className="text-xs font-medium text-muted-foreground">
                                                Date
                                            </dt>
                                            <dd className="mt-0.5 text-sm text-foreground">
                                                {formatUTCDate(reservation.start_datetime)}
                                            </dd>
                                        </div>
                                        <div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2.5">
                                            <dt className="text-xs font-medium text-muted-foreground">
                                                Time
                                            </dt>
                                            <dd className="mt-0.5 text-sm text-foreground">
                                                {formatUTCTime(reservation.start_datetime)} -{" "}
                                                {formatUTCTime(reservation.end_datetime)}
                                            </dd>
                                        </div>
                                        <div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2.5">
                                            <dt className="text-xs font-medium text-muted-foreground">
                                                Recurring
                                            </dt>
                                            <dd className="mt-0.5 text-sm text-foreground">
                                                {reservation.is_recurring ? "Yes" : "No"}
                                            </dd>
                                        </div>
                                        <div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2.5">
                                            <dt className="text-xs font-medium text-muted-foreground">
                                                Allowed types
                                            </dt>
                                            <dd className="mt-0.5 text-sm text-foreground">
                                                {reservation.allowed_booking_types?.length
                                                    ? reservation.allowed_booking_types.join(", ")
                                                    : "Any"}
                                            </dd>
                                        </div>
                                    </dl>
                                </section>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
