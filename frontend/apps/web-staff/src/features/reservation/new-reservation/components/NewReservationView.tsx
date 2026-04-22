import type { FormEvent, JSX } from "react";
import { useMemo } from "react";
import { X } from "lucide-react";
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
    variant?: "page" | "modal";
    lockedCourtName?: string;
    lockedDate?: string;
    lockedStartTime?: string;
    lockedEndTime?: string;
    onFormChange: (patch: Partial<NewReservationFormState>) => void;
    onSubmit: (e: FormEvent) => void;
    onCancel: () => void;
    onClose?: () => void;
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
    variant = "page",
    lockedCourtName,
    lockedDate,
    lockedStartTime,
    lockedEndTime,
    onFormChange,
    onSubmit,
    onCancel,
    onClose,
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

    const editableFields = (
        <div className="space-y-4">
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
                    value={form.title}
                    onChange={(e) => {
                        onFormChange({ title: e.target.value });
                    }}
                />
                {titleError ? <p className="mt-1 text-xs text-destructive">{titleError}</p> : null}
            </div>

            {/* Type + Court */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label htmlFor="res-type" className={labelCls}>
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
            <div className="grid grid-cols-3 gap-3">
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
                        Start <span className="text-destructive">*</span>
                    </label>
                    <TimeInput
                        id="res-start-time"
                        className={`${fieldCls} ${timeError ? "!border-destructive" : ""}`}
                        value={form.startTime}
                        onChange={(e) => onFormChange({ startTime: e.target.value })}
                    />
                </div>
                <div>
                    <label htmlFor="res-end-time" className={labelCls}>
                        End <span className="text-destructive">*</span>
                    </label>
                    <TimeInput
                        id="res-end-time"
                        className={`${fieldCls} ${timeError ? "!border-destructive" : ""}`}
                        value={form.endTime}
                        onChange={(e) => onFormChange({ endTime: e.target.value })}
                    />
                </div>
            </div>
            {timeError ? <p className="-mt-2 text-xs text-destructive">{timeError}</p> : null}

            {/* Allowed booking types */}
            <div>
                <p className="mb-1.5 text-sm font-medium text-foreground">
                    Allowed Booking Types{" "}
                    <span className="text-xs font-normal text-muted-foreground">(optional)</span>
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
            <div>
                <div className="flex items-center gap-3">
                    <input
                        id="res-recurring"
                        type="checkbox"
                        className="h-4 w-4 rounded border-border accent-cta"
                        checked={form.isRecurring}
                        onChange={(e) => onFormChange({ isRecurring: e.target.checked })}
                    />
                    <label htmlFor="res-recurring" className="text-sm font-medium text-foreground">
                        Recurring{" "}
                        <span className="text-xs font-normal text-muted-foreground">
                            (optional)
                        </span>
                    </label>
                </div>

                {form.isRecurring ? (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="res-rrule" className={labelCls}>
                                Recurrence Rule
                                <span className="ml-1 text-xs font-normal text-muted-foreground">
                                    (RRULE)
                                </span>
                            </label>
                            <input
                                id="res-rrule"
                                type="text"
                                className={fieldCls}
                                placeholder="FREQ=WEEKLY;BYDAY=MO;COUNT=12"
                                value={form.recurrenceRule}
                                onChange={(e) => onFormChange({ recurrenceRule: e.target.value })}
                            />
                        </div>
                        <div>
                            <label htmlFor="res-rrule-end" className={labelCls}>
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
        </div>
    );

    if (variant === "modal") {
        const formattedDate = lockedDate
            ? new Date(lockedDate + "T00:00:00").toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
              })
            : "—";

        const formatTime = (t?: string): string => {
            if (!t) return "—";
            const [hRaw, min] = t.split(":").map(Number);
            const h = (hRaw ?? 0) % 24;
            const ampm = h >= 12 ? "PM" : "AM";
            const h12 = h % 12 || 12;
            return `${h12}:${String(min ?? 0).padStart(2, "0")} ${ampm}`;
        };

        return (
            <form onSubmit={onSubmit} noValidate>
                {/* Header */}
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-base font-semibold text-foreground">New Reservation</h2>
                    {onClose ? (
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close modal"
                            className="rounded-lg p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        >
                            <X size={16} />
                        </button>
                    ) : null}
                </div>

                {apiError ? (
                    <div className="mb-4">
                        <AlertToast title={apiError} variant="error" onClose={onDismissError} />
                    </div>
                ) : null}

                {/* Read-only: Court, Date, Start, End */}
                <div className="mb-4 grid grid-cols-2 gap-3">
                    <div>
                        <label className={labelCls}>
                            Court <span className="text-destructive">*</span>
                        </label>
                        <div className={`${fieldCls} cursor-default select-none opacity-80`}>
                            {lockedCourtName ?? form.courtId}
                        </div>
                    </div>
                    <div>
                        <label className={labelCls}>
                            Date <span className="text-destructive">*</span>
                        </label>
                        <div className={`${fieldCls} cursor-default select-none opacity-80`}>
                            {formattedDate}
                        </div>
                    </div>
                </div>
                <div className="mb-4 grid grid-cols-2 gap-3">
                    <div>
                        <label className={labelCls}>
                            Start <span className="text-destructive">*</span>
                        </label>
                        <div className={`${fieldCls} cursor-default select-none opacity-80`}>
                            {formatTime(lockedStartTime)}
                        </div>
                    </div>
                    <div>
                        <label className={labelCls}>
                            End <span className="text-destructive">*</span>
                        </label>
                        <div className={`${fieldCls} cursor-default select-none opacity-80`}>
                            {formatTime(lockedEndTime)}
                        </div>
                    </div>
                </div>

                {/* Editable fields: Title, Type, Allowed Booking Types, Recurring */}
                <div className="space-y-4">
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
                            value={form.title}
                            onChange={(e) => onFormChange({ title: e.target.value })}
                        />
                        {titleError ? (
                            <p className="mt-1 text-xs text-destructive">{titleError}</p>
                        ) : null}
                    </div>

                    {/* Type */}
                    <div>
                        <label htmlFor="res-type" className={labelCls}>
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

                    {/* Allowed booking types */}
                    <div>
                        <p className="mb-1.5 text-sm font-medium text-foreground">
                            Allowed Booking Types{" "}
                            <span className="text-xs font-normal text-muted-foreground">
                                (optional)
                            </span>
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
                    <div>
                        <div className="flex items-center gap-3">
                            <input
                                id="res-recurring"
                                type="checkbox"
                                className="h-4 w-4 rounded border-border accent-cta"
                                checked={form.isRecurring}
                                onChange={(e) => onFormChange({ isRecurring: e.target.checked })}
                            />
                            <label
                                htmlFor="res-recurring"
                                className="text-sm font-medium text-foreground"
                            >
                                Recurring{" "}
                                <span className="text-xs font-normal text-muted-foreground">
                                    (optional)
                                </span>
                            </label>
                        </div>
                        {form.isRecurring ? (
                            <div className="mt-3 grid grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="res-rrule" className={labelCls}>
                                        Recurrence Rule
                                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                                            (RRULE)
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
                </div>

                {/* Actions */}
                <div className="mt-5 flex items-center justify-end gap-3 border-t border-border pt-4">
                    <button type="button" onClick={onCancel} className="btn-outline">
                        Cancel
                    </button>
                    <button type="submit" disabled={isPending} className="btn-cta">
                        {isPending ? "Creating…" : "Create Reservation"}
                    </button>
                </div>
            </form>
        );
    }

    const formBody = (
        <form onSubmit={onSubmit} noValidate>
            {apiError ? (
                <div className="mb-4">
                    <AlertToast title={apiError} variant="error" onClose={onDismissError} />
                </div>
            ) : null}

            {editableFields}

            {/* Actions */}
            <div className="mt-6 flex items-center justify-end gap-3 border-t border-border pt-4">
                <button type="button" onClick={onCancel} className="btn-outline">
                    Cancel
                </button>
                <button type="submit" disabled={isPending} className="btn-cta">
                    {isPending ? "Creating…" : "Create Reservation"}
                </button>
            </div>
        </form>
    );

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

                <div className="px-5 py-6 sm:px-6">{formBody}</div>
            </section>
        </div>
    );
}
