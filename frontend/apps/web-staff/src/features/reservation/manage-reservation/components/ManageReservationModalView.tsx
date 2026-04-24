import type { FormEvent, JSX } from "react";
import { useMemo, useState } from "react";
import { X, ShieldCheck, Repeat, ChevronDown, ChevronUp } from "lucide-react";
import {
    AlertToast,
    DatePicker,
    TimeInput,
    SelectInput,
    StatPill,
    formatUTCDateTime,
} from "@repo/ui";
import type { CalendarReservation, CalendarReservationType } from "../../types";
import {
    RESERVATION_TYPE_LABELS,
    RESERVATION_TYPE_COLORS,
    RESERVATION_TYPE_OPTIONS,
} from "../../types";
import type { ManageReservationFormState } from "./ManageReservationView";

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
    const [allowedTypesExpanded, setAllowedTypesExpanded] = useState(false);
    const [recurrenceExpanded, setRecurrenceExpanded] = useState(false);

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

    return (
        <form onSubmit={canEdit ? onSubmit : undefined} noValidate className="flex h-full flex-col">
            {/* ── Sticky header ── */}
            <div className="shrink-0 border-b border-border px-6 pb-5 pt-6">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                        <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colors.bg}`}
                        >
                            <ShieldCheck size={18} className={colors.text} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-lg font-semibold text-foreground">
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
                <div className="space-y-5">
                    {/* Error / success alerts — always first inside space-y-5 */}
                    {apiError ? (
                        <div className="mb-4">
                            <AlertToast title={apiError} variant="error" onClose={onDismissError} />
                        </div>
                    ) : null}
                    {updateSuccess ? (
                        <div className="mb-4">
                            <AlertToast
                                title="Reservation updated successfully."
                                variant="success"
                                onClose={() => {}}
                            />
                        </div>
                    ) : null}

                    {/* Read-only context pills — first content after alerts */}
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <StatPill
                            label="Type"
                            value={
                                RESERVATION_TYPE_LABELS[reservation.reservation_type] ??
                                reservation.reservation_type
                            }
                        />
                        <StatPill label="Court" value={courtName} />
                        <StatPill
                            label="Start"
                            value={formatUTCDateTime(reservation.start_datetime)}
                            type="datetime"
                        />
                        <StatPill
                            label="End"
                            value={formatUTCDateTime(reservation.end_datetime)}
                            type="datetime"
                        />
                    </div>

                    {/* Edit form — only when editable */}
                    {canEdit ? (
                        <>
                            {/* Core Details */}
                            <div>
                                <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    Core Details
                                </p>
                                <div className="space-y-3">
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
                                            onChange={(e) =>
                                                onFormChange({ title: e.target.value })
                                            }
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label htmlFor="mr-type" className={labelCls}>
                                                Reservation Type{" "}
                                                <span className="text-destructive">*</span>
                                            </label>
                                            <SelectInput
                                                value={form.reservationType}
                                                onValueChange={(v) =>
                                                    onFormChange({
                                                        reservationType:
                                                            v as CalendarReservationType,
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
                                    </div>

                                    <div className="grid grid-cols-3 gap-3">
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
                                                Start Time{" "}
                                                <span className="text-destructive">*</span>
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
                                                onChange={(e) =>
                                                    onFormChange({ endTime: e.target.value })
                                                }
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Allowed Booking Types — collapsible */}
                            <div className="overflow-hidden rounded-lg border border-border">
                                <button
                                    type="button"
                                    className="flex w-full items-center justify-between bg-muted/20 px-4 py-3 text-left transition hover:bg-muted/40"
                                    onClick={() => setAllowedTypesExpanded((v) => !v)}
                                    aria-expanded={allowedTypesExpanded}
                                >
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                        Allowed Booking Types{" "}
                                        <span className="text-[10px] font-normal normal-case opacity-70">
                                            (optional)
                                        </span>
                                    </span>
                                    {allowedTypesExpanded ? (
                                        <ChevronUp size={13} className="text-muted-foreground" />
                                    ) : (
                                        <ChevronDown size={13} className="text-muted-foreground" />
                                    )}
                                </button>
                                {allowedTypesExpanded ? (
                                    <div className="border-t border-border p-4">
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
                                                            onChange={() =>
                                                                toggleBookingType(opt.value)
                                                            }
                                                        />
                                                        {opt.label}
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : null}
                            </div>

                            {/* Recurrence — collapsible */}
                            <div className="overflow-hidden rounded-lg border border-border">
                                <button
                                    type="button"
                                    className="flex w-full items-center justify-between bg-muted/20 px-4 py-3 text-left transition hover:bg-muted/40"
                                    onClick={() => setRecurrenceExpanded((v) => !v)}
                                    aria-expanded={recurrenceExpanded}
                                >
                                    <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                        <Repeat size={12} />
                                        Recurrence{" "}
                                        <span className="text-[10px] font-normal normal-case opacity-70">
                                            (optional)
                                        </span>
                                    </span>
                                    {recurrenceExpanded ? (
                                        <ChevronUp size={13} className="text-muted-foreground" />
                                    ) : (
                                        <ChevronDown size={13} className="text-muted-foreground" />
                                    )}
                                </button>
                                {recurrenceExpanded ? (
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
                                                Enable recurring schedule
                                            </label>
                                        </div>
                                        {form.isRecurring ? (
                                            <div className="grid grid-cols-2 gap-3">
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
                                                        onChange={(e) =>
                                                            onFormChange({
                                                                recurrenceRule: e.target.value,
                                                            })
                                                        }
                                                    />
                                                </div>
                                                <div>
                                                    <label
                                                        htmlFor="mr-rrule-end"
                                                        className={labelCls}
                                                    >
                                                        End Date
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
                                    </div>
                                ) : null}
                            </div>
                        </>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            You do not have permission to edit this reservation.
                        </p>
                    )}
                </div>
            </div>

            {/* ── Sticky footer ── */}
            <div className="shrink-0 flex items-center justify-between border-t border-border px-6 py-4">
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
            </div>
        </form>
    );
}
