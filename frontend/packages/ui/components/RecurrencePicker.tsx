/**
 * RecurrencePicker — builds a valid RFC 5545 RRULE string via structured UI.
 *
 * No manual text input. Parses an existing `value` RRULE string to pre-fill
 * the form in edit mode. Calls `onChange` on every state change and `onSave`
 * when the user confirms.
 */

import { type JSX, useEffect, useState } from "react";
import { RRule, Weekday, rrulestr } from "rrule";
import type { ByWeekday } from "rrule";
import { ChevronDown, RotateCcw } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Frequency = "daily" | "weekly" | "monthly";
type EndType = "count" | "until";

interface RecurrenceState {
    frequency: Frequency;
    interval: number;
    byWeekday: number[]; // 0=MO … 6=SU (RRule.MO.weekday values)
    endType: EndType;
    count: number;
    until: string; // "YYYY-MM-DD"
}

export interface RecurrencePickerProps {
    /** Existing RRULE string for edit mode pre-fill (e.g. "FREQ=WEEKLY;BYDAY=MO;COUNT=12") */
    value?: string;
    /** Called with the new RRULE string on every state change — wire to form state */
    onChange: (rruleString: string) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FREQ_OPTIONS: { value: Frequency; label: string }[] = [
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
];

const WEEKDAYS: { label: string; weekday: number }[] = [
    { label: "Mon", weekday: RRule.MO.weekday },
    { label: "Tue", weekday: RRule.TU.weekday },
    { label: "Wed", weekday: RRule.WE.weekday },
    { label: "Thu", weekday: RRule.TH.weekday },
    { label: "Fri", weekday: RRule.FR.weekday },
    { label: "Sat", weekday: RRule.SA.weekday },
    { label: "Sun", weekday: RRule.SU.weekday },
];

const FREQ_MAP: Record<Frequency, number> = {
    daily: RRule.DAILY,
    weekly: RRule.WEEKLY,
    monthly: RRule.MONTHLY,
};

const FREQ_LABEL_MAP: Record<Frequency, string> = {
    daily: "day",
    weekly: "week",
    monthly: "month",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pad(n: number): string {
    return String(n).padStart(2, "0");
}

function todayStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function buildRRule(state: RecurrenceState): string {
    const options: ConstructorParameters<typeof RRule>[0] = {
        freq: FREQ_MAP[state.frequency],
        interval: state.interval,
    };

    if (state.frequency === "weekly" && state.byWeekday.length > 0) {
        const ALL_RRULE_DAYS: Weekday[] = [
            RRule.MO,
            RRule.TU,
            RRule.WE,
            RRule.TH,
            RRule.FR,
            RRule.SA,
            RRule.SU,
        ];
        options.byweekday = state.byWeekday
            .map((w) => ALL_RRULE_DAYS[w])
            .filter((d): d is Weekday => d !== undefined);
    }

    if (state.endType === "count" && state.count > 0) {
        options.count = state.count;
    } else if (state.endType === "until" && state.until) {
        const parts = state.until.split("-").map(Number);
        const y = parts[0] ?? 2030;
        const m = (parts[1] ?? 1) - 1;
        const d = parts[2] ?? 1;
        options.until = new Date(Date.UTC(y, m, d, 23, 59, 59));
    }

    const raw = new RRule(options).toString();
    // Strip the "RRULE:" prefix that the library adds
    return raw.startsWith("RRULE:") ? raw.slice(6) : raw;
}

function humanize(state: RecurrenceState): string {
    const freq = FREQ_LABEL_MAP[state.frequency];
    const every = state.interval === 1 ? `every ${freq}` : `every ${state.interval} ${freq}s`;

    let days = "";
    if (state.frequency === "weekly" && state.byWeekday.length > 0) {
        const labels = state.byWeekday
            .map((w) => WEEKDAYS.find((d) => d.weekday === w)?.label ?? "")
            .filter(Boolean)
            .join(", ");
        days = ` on ${labels}`;
    }

    let end = "";
    if (state.endType === "count") {
        end = ` for ${state.count} occurrence${state.count !== 1 ? "s" : ""}`;
    } else if (state.endType === "until" && state.until) {
        end = ` until ${state.until}`;
    }

    return `Repeats ${every}${days}${end}`;
}

function parseExisting(value: string): Partial<RecurrenceState> {
    try {
        const rule = rrulestr(`RRULE:${value}`);
        const opts = rule.origOptions;

        let frequency: Frequency = "weekly";
        if (opts.freq === RRule.DAILY) frequency = "daily";
        else if (opts.freq === RRule.MONTHLY) frequency = "monthly";

        const byWeekday: number[] = Array.isArray(opts.byweekday)
            ? opts.byweekday.map((w: ByWeekday) => {
                  if (typeof w === "number") return w;
                  if (typeof w === "string") return Weekday.fromStr(w).weekday;
                  return w.weekday;
              })
            : [];

        const endType: EndType = opts.until != null ? "until" : "count";

        const until =
            opts.until instanceof Date
                ? `${opts.until.getUTCFullYear()}-${pad(opts.until.getUTCMonth() + 1)}-${pad(opts.until.getUTCDate())}`
                : "";

        return {
            frequency,
            interval: typeof opts.interval === "number" ? Math.max(1, opts.interval) : 1,
            byWeekday,
            endType,
            count: typeof opts.count === "number" ? opts.count : 1,
            until,
        };
    } catch {
        return {};
    }
}

function defaultState(): RecurrenceState {
    return {
        frequency: "weekly",
        interval: 1,
        byWeekday: [RRule.MO.weekday],
        endType: "count",
        count: 1,
        until: "",
    };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const labelCls = "block text-xs font-medium text-muted-foreground mb-1.5";
const inputCls =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground " +
    "focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta-ring/30 transition";

interface SelectProps {
    label?: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (v: string) => void;
}

function InlineSelect({ label, value, options, onChange }: SelectProps): JSX.Element {
    return (
        <div>
            {label ? <span className={labelCls}>{label}</span> : null}
            <div className="relative">
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className={`${inputCls} appearance-none pr-8`}
                >
                    {options.map((o) => (
                        <option key={o.value} value={o.value}>
                            {o.label}
                        </option>
                    ))}
                </select>
                <ChevronDown
                    size={14}
                    className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
            </div>
        </div>
    );
}

interface DayButtonProps {
    label: string;
    active: boolean;
    onClick: () => void;
}

function DayButton({ label, active, onClick }: DayButtonProps): JSX.Element {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold transition ${
                active
                    ? "bg-cta text-cta-foreground"
                    : "border border-border bg-background text-foreground hover:bg-muted"
            }`}
            aria-pressed={active}
        >
            {label}
        </button>
    );
}

interface RadioProps {
    id: string;
    name: string;
    checked: boolean;
    onChange: () => void;
    label: string;
}

function RadioOption({ id, name, checked, onChange, label }: RadioProps): JSX.Element {
    return (
        <label
            htmlFor={id}
            className="flex cursor-pointer items-center gap-2 text-sm text-foreground whitespace-nowrap"
        >
            <input
                id={id}
                type="radio"
                name={name}
                checked={checked}
                onChange={onChange}
                className="accent-cta"
            />
            {label}
        </label>
    );
}

// ─── RecurrencePicker ─────────────────────────────────────────────────────────

export function RecurrencePicker({ value, onChange }: RecurrencePickerProps): JSX.Element {
    const [state, setState] = useState<RecurrenceState>(() => ({
        ...defaultState(),
        ...(value ? parseExisting(value) : {}),
    }));
    const [weekdayError, setWeekdayError] = useState(false);

    function patch(partial: Partial<RecurrenceState>): void {
        setState((prev) => {
            const next = { ...prev, ...partial };
            onChange(buildRRule(next));
            return next;
        });
    }

    // Re-parse if controlled value changes externally
    useEffect(() => {
        if (value) {
            setState((prev) => ({ ...prev, ...parseExisting(value) }));
        }
    }, [value]);

    function toggleWeekday(weekday: number): void {
        const next = state.byWeekday.includes(weekday)
            ? state.byWeekday.filter((w) => w !== weekday)
            : [...state.byWeekday, weekday];
        if (next.length === 0) {
            setWeekdayError(true);
            return;
        }
        setWeekdayError(false);
        patch({ byWeekday: next });
    }

    const summary = humanize(state);

    return (
        <div className="flex flex-col gap-5">
            {/* ── Frequency + Interval ── */}
            <div className="grid grid-cols-2 gap-3">
                <InlineSelect
                    label="Repeats"
                    value={state.frequency}
                    options={FREQ_OPTIONS}
                    onChange={(v) => {
                        setWeekdayError(false);
                        patch({ frequency: v as Frequency });
                    }}
                />
                <div>
                    <span className={labelCls}>Every</span>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            min={1}
                            max={99}
                            value={state.interval}
                            onChange={(e) => {
                                const v = Math.max(1, parseInt(e.target.value, 10) || 1);
                                patch({ interval: v });
                            }}
                            className={`${inputCls} w-20`}
                            aria-label="Repeat interval"
                        />
                        <span className="text-sm text-muted-foreground">
                            {FREQ_LABEL_MAP[state.frequency]}
                            {state.interval > 1 ? "s" : ""}
                        </span>
                    </div>
                </div>
            </div>

            {/* ── Weekday selector (weekly only) ── */}
            {state.frequency === "weekly" && (
                <div>
                    <span className={labelCls}>Repeat on</span>
                    <div className="flex flex-wrap gap-2">
                        {WEEKDAYS.map(({ label, weekday }) => (
                            <DayButton
                                key={weekday}
                                label={label}
                                active={state.byWeekday.includes(weekday)}
                                onClick={() => toggleWeekday(weekday)}
                            />
                        ))}
                    </div>
                    {weekdayError && (
                        <p className="mt-1.5 text-xs text-destructive">Select at least one day.</p>
                    )}
                </div>
            )}

            {/* ── End condition ── */}
            <div>
                <span className={labelCls}>Ends</span>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    {/* After N occurrences */}
                    <div className="flex items-center gap-2">
                        <RadioOption
                            id="rp-end-count"
                            name="rp-end"
                            checked={state.endType === "count"}
                            onChange={() => patch({ endType: "count" })}
                            label="After"
                        />
                        <input
                            type="number"
                            min={1}
                            max={999}
                            value={state.count}
                            disabled={state.endType !== "count"}
                            onChange={(e) => {
                                const v = Math.max(1, parseInt(e.target.value, 10) || 1);
                                patch({ count: v, endType: "count" });
                            }}
                            className={`${inputCls} w-20 disabled:cursor-not-allowed disabled:opacity-50`}
                            aria-label="Occurrence count"
                        />
                        <span className="text-sm text-muted-foreground">
                            occurrence{state.count !== 1 ? "s" : ""}
                        </span>
                    </div>

                    <span className="text-muted-foreground/40 text-sm select-none">|</span>

                    {/* On a specific date */}
                    <div className="flex items-center gap-2">
                        <RadioOption
                            id="rp-end-until"
                            name="rp-end"
                            checked={state.endType === "until"}
                            onChange={() =>
                                patch({ endType: "until", until: state.until || todayStr() })
                            }
                            label="On date"
                        />
                        <input
                            type="date"
                            value={state.until}
                            disabled={state.endType !== "until"}
                            min={todayStr()}
                            onChange={(e) => patch({ until: e.target.value, endType: "until" })}
                            className={`${inputCls} w-40 disabled:cursor-not-allowed disabled:opacity-50`}
                            aria-label="End date"
                        />
                    </div>
                </div>
            </div>

            {/* ── Live preview ── */}
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-4 py-3">
                <RotateCcw size={13} className="shrink-0 text-muted-foreground" />
                <p className="text-sm text-foreground">{summary}</p>
            </div>
        </div>
    );
}
