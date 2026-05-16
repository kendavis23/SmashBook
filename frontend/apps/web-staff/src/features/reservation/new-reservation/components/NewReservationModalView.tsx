import type { FormEvent, JSX } from "react";
import { CalendarDays, CalendarRange, Clock, MapPin, Tag, X } from "lucide-react";
import { AlertToast, RecurrencePicker, SelectInput, TimeInput, formatUTCDate } from "@repo/ui";
import type { CalendarReservationType } from "../../types";
import { RESERVATION_TYPE_OPTIONS } from "../../types";
import type { NewReservationFormState } from "./NewReservationView";

const fieldCls =
    "w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground " +
    "placeholder:text-muted-foreground transition focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta-ring/30";

const labelCls = "mb-1 block text-xs font-medium text-foreground";

const dividerCls = "border-t-2 border-border/20 pt-3";
const sectionCls = `space-y-2 ${dividerCls}`;

const BOOKING_TYPE_OPTIONS = [
    { value: "regular", label: "Regular" },
    { value: "training", label: "Training" },
    { value: "tournament", label: "Tournament" },
];

const typeOptions = RESERVATION_TYPE_OPTIONS.filter((o) => o.value !== "");

function DetailItem({
    icon,
    label,
    value,
    color,
    bg,
    ring,
}: {
    icon: JSX.Element;
    label: string;
    value: string;
    color: string;
    bg: string;
    ring: string;
}): JSX.Element {
    return (
        <div className="flex min-w-0 items-center gap-3 rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5">
            <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${bg} ${color} ${ring}`}
            >
                {icon}
            </div>
            <div className="min-w-0 flex flex-col gap-0.5">
                <span className="text-[9px] font uppercase tracking-wider text-muted-foreground">
                    {label}
                </span>
                <span className="break-words text-sm font leading-tight text-foreground">
                    {value}
                </span>
            </div>
        </div>
    );
}

type Props = {
    form: NewReservationFormState;
    titleError: string;
    timeError: string;
    apiError: string;
    isPending: boolean;
    lockedCourtName?: string;
    lockedDate?: string;
    lockedStartTime?: string;
    lockedEndTime?: string;
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

function formatTimeRange(start?: string, end?: string): string {
    if (!start && !end) return "—";
    return `${formatTime(start)} - ${formatTime(end)}`;
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
    lockedEndTime,
    onFormChange,
    onSubmit,
    onCancel,
    onClose,
    onDismissError,
}: Props): JSX.Element {
    const formattedDate = lockedDate ? formatUTCDate(lockedDate + "T00:00:00Z") : "—";
    const reservationTypeLabel =
        typeOptions.find((option) => option.value === form.reservationType)?.label ??
        form.reservationType;

    const toggleBookingType = (val: string): void => {
        const next = form.allowedBookingTypes.includes(val)
            ? form.allowedBookingTypes.filter((t) => t !== val)
            : [...form.allowedBookingTypes, val];
        onFormChange({ allowedBookingTypes: next });
    };

    return (
        <form
            onSubmit={onSubmit}
            noValidate
            className="flex h-full flex-col overflow-hidden rounded-xl bg-card"
        >
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-2.5">
                <div className="min-w-0">
                    <h2 className="text-base font-semibold tracking-tight text-foreground">
                        New Reservation
                    </h2>
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

                <div className="grid grid-cols-2 gap-2">
                    <DetailItem
                        icon={<MapPin size={13} />}
                        label="Court"
                        value={lockedCourtName ?? "—"}
                        color="text-violet-600"
                        bg="bg-violet-500/10"
                        ring="ring-violet-500/15"
                    />
                    <DetailItem
                        icon={<CalendarDays size={13} />}
                        label="Date"
                        value={formattedDate}
                        color="text-blue-600"
                        bg="bg-blue-500/10"
                        ring="ring-blue-500/15"
                    />
                    <DetailItem
                        icon={<Clock size={13} />}
                        label="Time"
                        value={formatTimeRange(lockedStartTime, lockedEndTime)}
                        color="text-amber-600"
                        bg="bg-amber-500/10"
                        ring="ring-amber-500/15"
                    />
                    <DetailItem
                        icon={<Tag size={13} />}
                        label="Type"
                        value={reservationTypeLabel}
                        color="text-cta"
                        bg="bg-cta/10"
                        ring="ring-cta/15"
                    />
                </div>

                <section className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${dividerCls}`}>
                    <div className="sm:col-span-2">
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
                    {timeError ? (
                        <p className="sm:col-span-2 text-xs text-destructive">{timeError}</p>
                    ) : null}
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
                            id="res-modal-recurring"
                            type="checkbox"
                            className="h-4 w-4 rounded border-border accent-cta"
                            checked={form.isRecurring}
                            onChange={(e) => onFormChange({ isRecurring: e.target.checked })}
                        />
                        <span className="text-sm font-medium text-foreground">
                            Enable recurring schedule
                        </span>
                    </label>
                    {form.isRecurring ? (
                        <RecurrencePicker
                            value={form.recurrenceRule}
                            onChange={(rrule) => onFormChange({ recurrenceRule: rrule })}
                        />
                    ) : null}
                </section>
            </main>

            <footer className="flex shrink-0 items-center justify-end gap-3 border-t border-border px-5 py-2.5">
                <button type="button" onClick={onCancel} className="btn-outline">
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isPending}
                    className="btn-cta flex items-center gap-2"
                >
                    <CalendarRange size={14} />
                    {isPending ? "Creating..." : "Create Reservation"}
                </button>
            </footer>
        </form>
    );
}
