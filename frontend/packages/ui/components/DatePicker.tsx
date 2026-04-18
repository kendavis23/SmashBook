/**
 * DatePicker       — value: "YYYY-MM-DD"
 * DateTimePicker   — value: "YYYY-MM-DDTHH:MM"  (matches datetime-local input format)
 *
 * Both replace the native `<input type="date">` and `<input type="datetime-local">`
 * whose calendar UIs differ substantially between Chrome, Safari, and Firefox.
 * These components use @radix-ui/react-popover + a hand-built calendar grid so
 * the UI is pixel-perfect across all browsers.
 */

import * as PopoverPrimitive from "@radix-ui/react-popover";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { type JSX, useState } from "react";

// ─── Shared constants ────────────────────────────────────────────────────────

const MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
] as const;

const DAY_HEADERS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

const TRIGGER_BASE =
    "flex w-full items-center justify-between gap-2 rounded-lg border border-border " +
    "bg-background px-3 py-2 text-sm transition " +
    "focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta-ring/30 " +
    "disabled:cursor-not-allowed disabled:opacity-50";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pad(n: number): string {
    return String(n).padStart(2, "0");
}

function buildGrid(year: number, month: number): Array<number | null> {
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const grid: Array<number | null> = Array<null>(firstDow).fill(null);
    for (let d = 1; d <= daysInMonth; d++) grid.push(d);
    return grid;
}

function parseDate(value: string): { year: number; month: number; day: number } | null {
    if (!value) return null;
    const parts = value.split("-").map(Number);
    const y = parts[0] ?? 0;
    const m = parts[1] ?? 0;
    const d = parts[2] ?? 0;
    if (!y || !m || !d) return null;
    return { year: y, month: m - 1, day: d };
}

function parseDateTime(
    value: string
): { year: number; month: number; day: number; hours: number; minutes: number } | null {
    if (!value) return null;
    const [datePart = "", timePart = "00:00"] = value.split("T");
    const parsed = parseDate(datePart);
    if (!parsed) return null;
    const timeParts = timePart.split(":").map(Number);
    const hh = timeParts[0] ?? 0;
    const mm = timeParts[1] ?? 0;
    return { ...parsed, hours: hh, minutes: mm };
}

function formatDateDisplay(value: string): string {
    const p = parseDate(value);
    if (!p) return "";
    const monthName = MONTH_NAMES[p.month] ?? "";
    return `${monthName.slice(0, 3)} ${p.day}, ${p.year}`;
}

function formatDateTimeDisplay(value: string): string {
    const p = parseDateTime(value);
    if (!p) return "";
    const ampm = p.hours >= 12 ? "PM" : "AM";
    const h12 = p.hours % 12 || 12;
    const monthName = MONTH_NAMES[p.month] ?? "";
    return `${monthName.slice(0, 3)} ${p.day}, ${p.year}, ${h12}:${pad(p.minutes)} ${ampm}`;
}

// ─── Shared calendar grid UI ─────────────────────────────────────────────────

interface CalendarGridProps {
    viewYear: number;
    viewMonth: number;
    selectedDateStr: string; // "YYYY-MM-DD" or ""
    onPrevMonth: () => void;
    onNextMonth: () => void;
    onSelectDay: (day: number) => void;
}

function CalendarGrid({
    viewYear,
    viewMonth,
    selectedDateStr,
    onPrevMonth,
    onNextMonth,
    onSelectDay,
}: CalendarGridProps): JSX.Element {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    const grid = buildGrid(viewYear, viewMonth);

    return (
        <>
            {/* Month navigation */}
            <div className="mb-3 flex items-center justify-between">
                <button
                    type="button"
                    onClick={onPrevMonth}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-foreground hover:bg-muted"
                >
                    <ChevronLeft size={14} />
                </button>
                <span className="text-sm font-semibold text-foreground">
                    {MONTH_NAMES[viewMonth] ?? ""} {viewYear}
                </span>
                <button
                    type="button"
                    onClick={onNextMonth}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-foreground hover:bg-muted"
                >
                    <ChevronRight size={14} />
                </button>
            </div>

            {/* Day-of-week headers */}
            <div className="mb-1 grid grid-cols-7 text-center">
                {DAY_HEADERS.map((h) => (
                    <span key={h} className="py-1 text-xs font-medium text-muted-foreground">
                        {h}
                    </span>
                ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 text-center">
                {grid.map((day, idx) => {
                    if (day === null) return <span key={`e-${idx}`} />;
                    const dayStr = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`;
                    const isSelected = selectedDateStr === dayStr;
                    const isToday = todayStr === dayStr;
                    return (
                        <button
                            key={day}
                            type="button"
                            onClick={() => onSelectDay(day)}
                            className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm transition ${
                                isSelected
                                    ? "bg-cta font-semibold text-cta-foreground"
                                    : isToday
                                      ? "border border-cta font-medium text-cta hover:bg-muted"
                                      : "text-foreground hover:bg-muted"
                            }`}
                        >
                            {day}
                        </button>
                    );
                })}
            </div>
        </>
    );
}

// ─── DatePicker ──────────────────────────────────────────────────────────────

export interface DatePickerProps {
    /** "YYYY-MM-DD" or empty string */
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

export function DatePicker({
    value,
    onChange,
    placeholder = "Pick a date",
    disabled,
    className = "",
}: DatePickerProps): JSX.Element {
    const today = new Date();
    const parsed = parseDate(value);
    const [viewYear, setViewYear] = useState(parsed?.year ?? today.getFullYear());
    const [viewMonth, setViewMonth] = useState(parsed?.month ?? today.getMonth());
    const [open, setOpen] = useState(false);

    function prevMonth() {
        if (viewMonth === 0) {
            setViewYear((y) => y - 1);
            setViewMonth(11);
        } else {
            setViewMonth((m) => m - 1);
        }
    }

    function nextMonth() {
        if (viewMonth === 11) {
            setViewYear((y) => y + 1);
            setViewMonth(0);
        } else {
            setViewMonth((m) => m + 1);
        }
    }

    function handleSelectDay(day: number) {
        onChange(`${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`);
        setOpen(false);
    }

    return (
        <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
            <PopoverPrimitive.Trigger
                type="button"
                disabled={disabled}
                className={`${TRIGGER_BASE} ${value ? "text-foreground" : "text-muted-foreground"} ${className}`}
            >
                <span>{value ? formatDateDisplay(value) : placeholder}</span>
                <CalendarDays size={14} className="shrink-0 text-muted-foreground" />
            </PopoverPrimitive.Trigger>

            <PopoverPrimitive.Portal>
                <PopoverPrimitive.Content
                    sideOffset={4}
                    align="start"
                    className="z-50 w-72 rounded-xl border border-border bg-background p-4 shadow-md"
                >
                    <CalendarGrid
                        viewYear={viewYear}
                        viewMonth={viewMonth}
                        selectedDateStr={value}
                        onPrevMonth={prevMonth}
                        onNextMonth={nextMonth}
                        onSelectDay={handleSelectDay}
                    />
                    {value && (
                        <div className="mt-3 flex justify-end border-t border-border pt-3">
                            <button
                                type="button"
                                onClick={() => {
                                    onChange("");
                                    setOpen(false);
                                }}
                                className="text-xs text-muted-foreground transition hover:text-foreground"
                            >
                                Clear
                            </button>
                        </div>
                    )}
                </PopoverPrimitive.Content>
            </PopoverPrimitive.Portal>
        </PopoverPrimitive.Root>
    );
}

// ─── DateTimePicker ───────────────────────────────────────────────────────────

export interface DateTimePickerProps {
    /** "YYYY-MM-DDTHH:MM" or empty string — same format as datetime-local input */
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

export function DateTimePicker({
    value,
    onChange,
    placeholder = "Pick date & time",
    disabled,
    className = "",
}: DateTimePickerProps): JSX.Element {
    const today = new Date();
    const parsed = parseDateTime(value);
    const [viewYear, setViewYear] = useState(parsed?.year ?? today.getFullYear());
    const [viewMonth, setViewMonth] = useState(parsed?.month ?? today.getMonth());
    const [open, setOpen] = useState(false);

    // Derive the date portion of the current value ("YYYY-MM-DD" or "")
    const datePart = value ? (value.split("T")[0] ?? "") : "";
    const parsedTime = parsed ?? { hours: 0, minutes: 0 };

    const rawHours = parsedTime.hours;
    const ampm = rawHours >= 12 ? "PM" : "AM";
    const display12 = rawHours % 12 || 12;

    function handleAmPmChange(newAmPm: "AM" | "PM") {
        let h = parsedTime.hours;
        if (newAmPm === "AM" && h >= 12) h -= 12;
        if (newAmPm === "PM" && h < 12) h += 12;
        const currentDate = datePart || `${viewYear}-${pad(viewMonth + 1)}-01`;
        onChange(`${currentDate}T${pad(h)}:${pad(parsedTime.minutes)}`);
    }

    function prevMonth() {
        if (viewMonth === 0) {
            setViewYear((y) => y - 1);
            setViewMonth(11);
        } else {
            setViewMonth((m) => m - 1);
        }
    }

    function nextMonth() {
        if (viewMonth === 11) {
            setViewYear((y) => y + 1);
            setViewMonth(0);
        } else {
            setViewMonth((m) => m + 1);
        }
    }

    function handleSelectDay(day: number) {
        const newDate = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`;
        const hh = parsed?.hours ?? 0;
        const mm = parsed?.minutes ?? 0;
        onChange(`${newDate}T${pad(hh)}:${pad(mm)}`);
        // Don't close — let the user also pick the time
    }

    function handleTimeChange(field: "hours12" | "minutes", rawValue: string) {
        const currentDate = datePart || `${viewYear}-${pad(viewMonth + 1)}-01`;
        if (field === "hours12") {
            let h12 = Math.max(1, Math.min(12, parseInt(rawValue, 10) || 1));
            let h24 = h12 % 12;
            if (ampm === "PM") h24 += 12;
            onChange(`${currentDate}T${pad(h24)}:${pad(parsedTime.minutes)}`);
        } else {
            const mm = Math.max(0, Math.min(59, parseInt(rawValue, 10) || 0));
            onChange(`${currentDate}T${pad(parsedTime.hours)}:${pad(mm)}`);
        }
    }

    const selectCls =
        "appearance-none w-14 rounded-md border border-border bg-background px-2 py-1 text-center text-sm text-foreground " +
        "focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta-ring/30";

    return (
        <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
            <PopoverPrimitive.Trigger
                type="button"
                disabled={disabled}
                className={`${TRIGGER_BASE} ${value ? "text-foreground" : "text-muted-foreground"} ${className}`}
            >
                <span>{value ? formatDateTimeDisplay(value) : placeholder}</span>
                <CalendarDays size={14} className="shrink-0 text-muted-foreground" />
            </PopoverPrimitive.Trigger>

            <PopoverPrimitive.Portal>
                <PopoverPrimitive.Content
                    sideOffset={4}
                    align="start"
                    className="z-50 w-80 rounded-xl border border-border bg-background p-4 shadow-md"
                >
                    <CalendarGrid
                        viewYear={viewYear}
                        viewMonth={viewMonth}
                        selectedDateStr={datePart}
                        onPrevMonth={prevMonth}
                        onNextMonth={nextMonth}
                        onSelectDay={handleSelectDay}
                    />

                    {/* Footer */}
                    <div className="mt-3 border-t border-border pt-3 space-y-2">
                        {/* Time controls */}
                        <div className="flex items-center gap-2">
                            <span className="w-8 shrink-0 text-xs font-medium text-muted-foreground">
                                Time
                            </span>
                            <div className="flex flex-1 items-center gap-1.5">
                                <input
                                    type="number"
                                    min={1}
                                    max={12}
                                    value={pad(display12)}
                                    onChange={(e) => handleTimeChange("hours12", e.target.value)}
                                    className={selectCls}
                                    aria-label="Hour"
                                />
                                <span className="text-sm font-semibold text-foreground">:</span>
                                <input
                                    type="number"
                                    min={0}
                                    max={59}
                                    value={pad(parsedTime.minutes)}
                                    onChange={(e) => handleTimeChange("minutes", e.target.value)}
                                    className={selectCls}
                                    aria-label="Minute"
                                />
                                <div className="flex overflow-hidden rounded-md border border-border text-xs font-medium">
                                    {(["AM", "PM"] as const).map((period) => (
                                        <button
                                            key={period}
                                            type="button"
                                            onClick={() => handleAmPmChange(period)}
                                            className={`px-3 py-1.5 transition ${ampm === period ? "bg-cta text-cta-foreground" : "text-foreground hover:bg-muted"}`}
                                        >
                                            {period}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        {/* Actions */}
                        <div className="flex items-center justify-between">
                            {value ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        onChange("");
                                        setOpen(false);
                                    }}
                                    className="text-xs text-muted-foreground transition hover:text-foreground"
                                >
                                    Clear
                                </button>
                            ) : (
                                <span />
                            )}
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="rounded-md bg-cta px-4 py-1.5 text-xs font-medium text-cta-foreground transition hover:bg-cta-hover"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </PopoverPrimitive.Content>
            </PopoverPrimitive.Portal>
        </PopoverPrimitive.Root>
    );
}
