import { useCreateCalendarReservation, useUpdateCalendarReservation } from "../../hooks";
import type {
    CalendarReservation,
    CalendarReservationInput,
    CalendarReservationType,
    Court,
} from "../../types";
import { RESERVATION_TYPE_OPTIONS } from "../../types";
import {
    AlertToast,
    DatePicker,
    DateTimePicker,
    datetimeLocalToUTC,
    NumberInput,
    SelectInput,
} from "@repo/ui";
import { X } from "lucide-react";
import type { FormEvent, JSX } from "react";
import { useState } from "react";
import { createPortal } from "react-dom";

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

type Props = {
    clubId: string;
    courts: Court[];
    onClose: () => void;
    onSuccess?: (message: string) => void;
    initialData?: CalendarReservation;
};

function toLocalDateTimeValue(iso: string): string {
    return iso.slice(0, 16);
}

function parseOptionalNumber(val: string): number | null {
    const n = parseFloat(val);
    return isNaN(n) ? null : n;
}

export default function ReservationModal({
    clubId,
    courts,
    onClose,
    onSuccess,
    initialData,
}: Props): JSX.Element {
    const isEdit = !!initialData;

    const [title, setTitle] = useState(initialData?.title ?? "");
    const [reservationType, setReservationType] = useState<CalendarReservationType>(
        initialData?.reservation_type ?? "private_hire"
    );
    const [courtId, setCourtId] = useState(initialData?.court_id ?? "");
    const [startDatetime, setStartDatetime] = useState(
        initialData ? toLocalDateTimeValue(initialData.start_datetime) : ""
    );
    const [endDatetime, setEndDatetime] = useState(
        initialData ? toLocalDateTimeValue(initialData.end_datetime) : ""
    );
    const [anchorSkillLevel, setAnchorSkillLevel] = useState(
        initialData?.anchor_skill_level !== null && initialData?.anchor_skill_level !== undefined
            ? String(initialData.anchor_skill_level)
            : ""
    );
    const [skillRangeAbove, setSkillRangeAbove] = useState(
        initialData?.skill_range_above !== null && initialData?.skill_range_above !== undefined
            ? String(initialData.skill_range_above)
            : ""
    );
    const [skillRangeBelow, setSkillRangeBelow] = useState(
        initialData?.skill_range_below !== null && initialData?.skill_range_below !== undefined
            ? String(initialData.skill_range_below)
            : ""
    );
    const [allowedBookingTypes, setAllowedBookingTypes] = useState<string[]>(
        initialData?.allowed_booking_types ?? []
    );
    const [isRecurring, setIsRecurring] = useState(initialData?.is_recurring ?? false);
    const [recurrenceRule, setRecurrenceRule] = useState(initialData?.recurrence_rule ?? "");
    const [recurrenceEndDate, setRecurrenceEndDate] = useState(
        initialData?.recurrence_end_date ?? ""
    );

    const [titleError, setTitleError] = useState("");
    const [dateError, setDateError] = useState("");

    const createMutation = useCreateCalendarReservation(clubId);
    const updateMutation = useUpdateCalendarReservation(clubId, initialData?.id ?? "");

    const active = isEdit ? updateMutation : createMutation;
    const isPending = active.isPending;
    const apiError = (active.error as Error | null)?.message ?? "";

    const validate = (): boolean => {
        let valid = true;
        if (!title.trim()) {
            setTitleError("Title is required.");
            valid = false;
        } else {
            setTitleError("");
        }
        if (!startDatetime || !endDatetime) {
            setDateError("Start and end date/time are required.");
            valid = false;
        } else if (startDatetime >= endDatetime) {
            setDateError("End date/time must be after start.");
            valid = false;
        } else {
            setDateError("");
        }
        return valid;
    };

    const toggleBookingType = (val: string): void => {
        setAllowedBookingTypes((prev) =>
            prev.includes(val) ? prev.filter((t) => t !== val) : [...prev, val]
        );
    };

    const handleSubmit = (e: FormEvent): void => {
        e.preventDefault();
        if (!validate()) return;

        const skillFields = {
            anchor_skill_level: parseOptionalNumber(anchorSkillLevel),
            skill_range_above: parseOptionalNumber(skillRangeAbove),
            skill_range_below: parseOptionalNumber(skillRangeBelow),
            allowed_booking_types: allowedBookingTypes.length > 0 ? allowedBookingTypes : null,
        };

        if (isEdit) {
            updateMutation.mutate(
                {
                    court_id: courtId || null,
                    reservation_type: reservationType,
                    title: title.trim(),
                    start_datetime: datetimeLocalToUTC(startDatetime),
                    end_datetime: datetimeLocalToUTC(endDatetime),
                    ...skillFields,
                    is_recurring: isRecurring,
                    recurrence_rule: recurrenceRule || null,
                    recurrence_end_date: recurrenceEndDate || null,
                },
                {
                    onSuccess: () => {
                        onClose();
                        onSuccess?.("Reservation updated successfully.");
                    },
                }
            );
        } else {
            const payload: CalendarReservationInput = {
                club_id: clubId,
                court_id: courtId || null,
                reservation_type: reservationType,
                title: title.trim(),
                start_datetime: datetimeLocalToUTC(startDatetime),
                end_datetime: datetimeLocalToUTC(endDatetime),
                ...skillFields,
                is_recurring: isRecurring,
                recurrence_rule: recurrenceRule || null,
                recurrence_end_date: recurrenceEndDate || null,
            };
            createMutation.mutate(payload, {
                onSuccess: () => {
                    onClose();
                    onSuccess?.("Reservation created successfully.");
                },
            });
        }
    };

    const typeOptions = RESERVATION_TYPE_OPTIONS.filter((o) => o.value !== "");

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border px-6 py-4">
                    <h2 className="text-base font-semibold text-foreground">
                        {isEdit ? "Edit reservation" : "New reservation"}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        aria-label="Close modal"
                    >
                        <X size={16} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} noValidate>
                    <div className="max-h-[70vh] overflow-y-auto space-y-4 px-6 py-5">
                        {apiError ? (
                            <AlertToast
                                title={apiError}
                                variant="error"
                                onClose={() => active.reset()}
                            />
                        ) : null}

                        {/* Title */}
                        <div>
                            <label htmlFor="res-title" className={labelCls}>
                                Title <span className="text-destructive">*</span>
                            </label>
                            <input
                                id="res-title"
                                type="text"
                                className={`${fieldCls} ${titleError ? "border-destructive focus:border-destructive focus:ring-destructive/20" : ""}`}
                                placeholder="e.g. Morning Training Block"
                                value={title}
                                onChange={(e) => {
                                    setTitle(e.target.value);
                                    if (titleError) setTitleError("");
                                }}
                            />
                            {titleError ? (
                                <p className="mt-1 text-xs text-destructive">{titleError}</p>
                            ) : null}
                        </div>

                        {/* Type */}
                        <div>
                            <label htmlFor="res-type" className={labelCls}>
                                Reservation Type
                            </label>
                            <SelectInput
                                value={reservationType}
                                onValueChange={(v) =>
                                    setReservationType(v as CalendarReservationType)
                                }
                                options={typeOptions}
                            />
                        </div>

                        {/* Court */}
                        <div>
                            <label htmlFor="res-court" className={labelCls}>
                                Court
                                <span className="ml-1 text-xs text-muted-foreground">
                                    (optional — leave blank to apply to all courts)
                                </span>
                            </label>
                            <SelectInput
                                value={courtId}
                                onValueChange={setCourtId}
                                options={courts.map((court) => ({
                                    value: court.id,
                                    label: court.name,
                                }))}
                                placeholder="All courts"
                                clearLabel="All courts"
                            />
                        </div>

                        {/* Start / End datetimes */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label htmlFor="res-start" className={labelCls}>
                                    Start <span className="text-destructive">*</span>
                                </label>
                                <DateTimePicker
                                    value={startDatetime}
                                    onChange={(v) => {
                                        setStartDatetime(v);
                                        if (dateError) setDateError("");
                                    }}
                                    className={
                                        dateError
                                            ? "border-destructive focus:border-destructive focus:ring-destructive/20"
                                            : ""
                                    }
                                />
                            </div>
                            <div>
                                <label htmlFor="res-end" className={labelCls}>
                                    End <span className="text-destructive">*</span>
                                </label>
                                <DateTimePicker
                                    value={endDatetime}
                                    onChange={(v) => {
                                        setEndDatetime(v);
                                        if (dateError) setDateError("");
                                    }}
                                    className={
                                        dateError
                                            ? "border-destructive focus:border-destructive focus:ring-destructive/20"
                                            : ""
                                    }
                                />
                            </div>
                        </div>
                        {dateError ? <p className="text-xs text-destructive">{dateError}</p> : null}

                        {/* Skill Level group */}
                        <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
                            <p className="mb-3 text-sm font-semibold text-foreground">
                                Skill Level Filter
                            </p>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label htmlFor="res-anchor-skill" className={labelCls}>
                                        Anchor
                                    </label>
                                    <NumberInput
                                        id="res-anchor-skill"
                                        min={0}
                                        step={0.1}
                                        className={fieldCls}
                                        placeholder="e.g. 3.5"
                                        value={anchorSkillLevel}
                                        onChange={(e) => setAnchorSkillLevel(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="res-skill-above" className={labelCls}>
                                        Range Above
                                    </label>
                                    <NumberInput
                                        id="res-skill-above"
                                        min={0}
                                        step={0.1}
                                        className={fieldCls}
                                        placeholder="e.g. 1.0"
                                        value={skillRangeAbove}
                                        onChange={(e) => setSkillRangeAbove(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="res-skill-below" className={labelCls}>
                                        Range Below
                                    </label>
                                    <NumberInput
                                        id="res-skill-below"
                                        min={0}
                                        step={0.1}
                                        className={fieldCls}
                                        placeholder="e.g. 1.0"
                                        value={skillRangeBelow}
                                        onChange={(e) => setSkillRangeBelow(e.target.value)}
                                    />
                                </div>
                            </div>
                            <p className="mt-1.5 text-xs text-muted-foreground">
                                Leave blank if no skill filter applies.
                            </p>
                        </div>

                        {/* Allowed booking types */}
                        <div>
                            <p className={labelCls}>
                                Allowed Booking Types
                                <span className="ml-1 text-xs font-normal text-muted-foreground">
                                    (optional)
                                </span>
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {BOOKING_TYPE_OPTIONS.map((opt) => {
                                    const checked = allowedBookingTypes.includes(opt.value);
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

                        {/* Recurring toggle */}
                        <div className="flex items-center gap-3">
                            <input
                                id="res-recurring"
                                type="checkbox"
                                className="h-4 w-4 rounded border-border accent-cta"
                                checked={isRecurring}
                                onChange={(e) => setIsRecurring(e.target.checked)}
                            />
                            <label
                                htmlFor="res-recurring"
                                className="text-sm font-medium text-foreground"
                            >
                                Recurring
                            </label>
                        </div>

                        {isRecurring ? (
                            <>
                                <div>
                                    <label htmlFor="res-rrule" className={labelCls}>
                                        Recurrence Rule
                                        <span className="ml-1 text-xs text-muted-foreground">
                                            (RRULE format, e.g. FREQ=WEEKLY;BYDAY=MO)
                                        </span>
                                    </label>
                                    <input
                                        id="res-rrule"
                                        type="text"
                                        className={fieldCls}
                                        placeholder="FREQ=WEEKLY;BYDAY=MO"
                                        value={recurrenceRule}
                                        onChange={(e) => setRecurrenceRule(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="res-rrule-end" className={labelCls}>
                                        Recurrence End Date
                                    </label>
                                    <DatePicker
                                        value={recurrenceEndDate}
                                        onChange={setRecurrenceEndDate}
                                    />
                                </div>
                            </>
                        ) : null}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
                        <button type="button" onClick={onClose} className="btn-outline">
                            Cancel
                        </button>
                        <button type="submit" disabled={isPending} className="btn-cta">
                            {isPending
                                ? isEdit
                                    ? "Updating…"
                                    : "Creating…"
                                : isEdit
                                  ? "Update Reservation"
                                  : "Create Reservation"}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
