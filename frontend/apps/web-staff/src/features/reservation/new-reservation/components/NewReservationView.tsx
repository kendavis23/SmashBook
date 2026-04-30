import type { FormEvent, JSX } from "react";
import { useMemo } from "react";
import { CalendarRange, Clock3, RefreshCw } from "lucide-react";
import {
    Breadcrumb,
    AlertToast,
    DatePicker,
    TimeInput,
    SelectInput,
    RecurrencePicker,
} from "@repo/ui";
import type { CalendarReservationType, Court } from "../../types";
import { RESERVATION_TYPE_OPTIONS } from "../../types";
import { NewReservationModalView } from "./NewReservationModalView";

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
    mode?: "page" | "modal";
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
    mode = "page",
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

    const selectedCourtName =
        courts.find((court) => court.id === form.courtId)?.name ?? "Not selected";

    const formattedDate = form.date
        ? new Date(form.date + "T00:00:00").toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
          })
        : "Not selected";

    const coreDetailsSection = (
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/70 bg-muted/10 px-3 py-3">
                <input
                    id="res-recurring"
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
                    value={form.recurrenceRule || undefined}
                    onChange={(rrule) => onFormChange({ recurrenceRule: rrule })}
                />
            ) : null}
        </div>
    );

    if (mode === "modal") {
        return (
            <NewReservationModalView
                form={form}
                titleError={titleError}
                timeError={timeError}
                apiError={apiError}
                isPending={isPending}
                lockedCourtName={lockedCourtName}
                lockedDate={lockedDate}
                lockedStartTime={lockedStartTime}
                lockedEndTime={lockedEndTime}
                onFormChange={onFormChange}
                onSubmit={onSubmit}
                onCancel={onCancel}
                onClose={onClose ?? onCancel}
                onDismissError={onDismissError}
            />
        );
    }

    return (
        <div className="w-full space-y-5">
            <Breadcrumb
                items={[
                    { label: "Reservations", href: "/reservations" },
                    { label: "New Reservation" },
                ]}
            />

            <section className="card-surface overflow-hidden">
                <header className="relative overflow-hidden border-b border-border bg-muted/15 px-4 py-4 sm:px-6">
                    <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.14),transparent_42%)] sm:block" />
                    <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="max-w-2xl">
                            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-sm">
                                <CalendarRange size={13} className="text-cta" />
                                Court reservation setup
                            </div>
                            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                                New Reservation
                            </h1>
                        </div>
                        <div className="grid w-full grid-cols-2 gap-2 sm:max-w-sm lg:w-auto lg:flex-none">
                            <div className="rounded-lg border border-border/70 bg-background/85 px-3 py-2.5 shadow-sm">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    Court
                                </p>
                                <p className="mt-1 truncate text-sm font-semibold text-foreground">
                                    {selectedCourtName}
                                </p>
                            </div>
                            <div className="rounded-lg border border-cta/20 bg-cta/5 px-3 py-2.5 shadow-sm">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    Date
                                </p>
                                <p className="mt-1 text-sm font-semibold text-cta">
                                    {formattedDate}
                                </p>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="bg-background/40 px-4 py-5 sm:px-6">
                    <form onSubmit={onSubmit} noValidate>
                        {apiError ? (
                            <div className="mb-4">
                                <AlertToast
                                    title={apiError}
                                    variant="error"
                                    onClose={onDismissError}
                                />
                            </div>
                        ) : null}

                        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,0.85fr)]">
                            <section className={sectionShellCls}>
                                <div className={sectionHeaderCls}>
                                    <div>
                                        <p className={sectionKickerCls}>Details</p>
                                        <h3 className="mt-1 text-base font-semibold text-foreground">
                                            Core Details
                                        </h3>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Set the title, type, court, and time for this
                                            reservation.
                                        </p>
                                    </div>
                                    <Clock3 size={18} className="mt-1 text-muted-foreground" />
                                </div>
                                {coreDetailsSection}
                            </section>

                            <div className="space-y-5">
                                <section className={sectionShellCls}>
                                    <div className={sectionHeaderCls}>
                                        <div>
                                            <p className={sectionKickerCls}>Booking access</p>
                                            <h3 className="mt-1 text-base font-semibold text-foreground">
                                                Allowed Booking Types{" "}
                                                <span className="text-xs font-normal text-muted-foreground">
                                                    (optional)
                                                </span>
                                            </h3>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                Restrict which booking types are permitted during
                                                this reservation.
                                            </p>
                                        </div>
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
                                                Configure whether this reservation repeats on a
                                                schedule.
                                            </p>
                                        </div>
                                        <RefreshCw
                                            size={18}
                                            className="mt-1 text-muted-foreground"
                                        />
                                    </div>
                                    {recurrenceSection}
                                </section>
                            </div>
                        </div>

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
