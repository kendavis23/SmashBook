import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Clock } from "lucide-react";
import React, { useRef, useState, type ChangeEvent, type InputHTMLAttributes, type Ref } from "react";

export type TimeInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
    ref?: Ref<HTMLInputElement>;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pad(n: number): string {
    return String(n).padStart(2, "0");
}

function parseTime(value: string): { hours: number; minutes: number } | null {
    if (!value) return null;
    const parts = value.split(":").map(Number);
    const h = parts[0];
    const m = parts[1];
    if (h === undefined || m === undefined || isNaN(h) || isNaN(m)) return null;
    return { hours: h, minutes: m };
}

function formatDisplay(value: string): string {
    const p = parseTime(value);
    if (!p) return "";
    const ampm = p.hours >= 12 ? "PM" : "AM";
    const h12 = p.hours % 12 || 12;
    return `${h12}:${pad(p.minutes)} ${ampm}`;
}

const TRIGGER_BASE =
    "flex w-full items-center justify-between gap-2 rounded-lg border border-border " +
    "bg-background px-3 py-2 text-sm transition " +
    "focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta-ring/30 " +
    "disabled:cursor-not-allowed disabled:opacity-50";

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1); // 1..12
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5); // 0,5,10…55

// ─── ScrollColumn ─────────────────────────────────────────────────────────────

interface ScrollColumnProps {
    items: number[];
    selected: number;
    onSelect: (val: number) => void;
    format?: (n: number) => string;
}

function ScrollColumn({ items, selected, onSelect, format = pad }: ScrollColumnProps) {
    return (
        <div className="flex h-48 flex-col overflow-y-auto scroll-smooth overscroll-contain">
            {items.map((item) => (
                <button
                    key={item}
                    type="button"
                    onClick={() => onSelect(item)}
                    className={`shrink-0 rounded-md py-1.5 text-center text-sm transition ${
                        item === selected
                            ? "bg-cta font-semibold text-cta-foreground"
                            : "text-foreground hover:bg-muted"
                    }`}
                >
                    {format(item)}
                </button>
            ))}
        </div>
    );
}

// ─── TimeInput ────────────────────────────────────────────────────────────────

function TimeInput({
    className = "",
    disabled,
    value,
    onChange,
    onBlur,
    placeholder,
    ref: _ref,
    ...props
}: TimeInputProps) {
    const [open, setOpen] = useState(false);
    const hiddenRef = useRef<HTMLInputElement>(null);

    function closeAndCommit() {
        setOpen(false);
        if (onBlur && hiddenRef.current) {
            onBlur({ target: hiddenRef.current } as React.FocusEvent<HTMLInputElement>);
        }
    }

    // value from InputHTMLAttributes can be string | number | string[] — we only use string
    const valueStr = typeof value === "string" ? value : "";
    const parsed = parseTime(valueStr);
    const hours24 = parsed?.hours ?? 0;
    const minutes = parsed?.minutes ?? 0;
    const ampm: "AM" | "PM" = hours24 >= 12 ? "PM" : "AM";
    const hours12 = hours24 % 12 || 12;
    const nearestMinute5 = (Math.round(minutes / 5) * 5) % 60;

    function emit(newValue: string) {
        if (!onChange || !hiddenRef.current) return;
        hiddenRef.current.value = newValue;
        // Callers use `e.target.value` — satisfy that contract with a shaped object.
        onChange({ target: hiddenRef.current } as ChangeEvent<HTMLInputElement>);
    }

    function handleHourSelect(h12: number) {
        let h24 = h12 % 12;
        if (ampm === "PM") h24 += 12;
        emit(`${pad(h24)}:${pad(minutes)}`);
    }

    function handleMinuteSelect(m: number) {
        emit(`${pad(hours24)}:${pad(m)}`);
    }

    function handleAmPm(period: "AM" | "PM") {
        let h = hours24;
        if (period === "AM" && h >= 12) h -= 12;
        if (period === "PM" && h < 12) h += 12;
        emit(`${pad(h)}:${pad(minutes)}`);
    }

    return (
        <>
            {/* Hidden input carries the value and fires native change events for callers */}
            <input ref={hiddenRef} type="hidden" value={valueStr} {...props} />

            <PopoverPrimitive.Root
                open={open}
                onOpenChange={(next) => {
                    if (disabled) return;
                    if (!next) closeAndCommit();
                    else setOpen(true);
                }}
            >
                <PopoverPrimitive.Trigger
                    type="button"
                    disabled={disabled}
                    className={`${TRIGGER_BASE} ${valueStr ? "text-foreground" : "text-muted-foreground"} ${className}`}
                >
                    <span>{valueStr ? formatDisplay(valueStr) : (placeholder ?? "--:-- --")}</span>
                    <Clock size={14} className="shrink-0 text-muted-foreground" />
                </PopoverPrimitive.Trigger>

                <PopoverPrimitive.Portal>
                    <PopoverPrimitive.Content
                        sideOffset={4}
                        align="start"
                        className="z-50 w-56 rounded-xl border border-border bg-background p-3 shadow-md"
                    >
                        {/* Column headers */}
                        <div className="mb-1 grid grid-cols-3 text-center text-xs font-medium text-muted-foreground">
                            <span>Hour</span>
                            <span>Min</span>
                            <span>AM/PM</span>
                        </div>

                        <div className="grid grid-cols-3 gap-1">
                            {/* Hours */}
                            <ScrollColumn
                                items={HOURS_12}
                                selected={hours12}
                                onSelect={handleHourSelect}
                                format={(n) => String(n)}
                            />

                            {/* Minutes */}
                            <ScrollColumn
                                items={MINUTES}
                                selected={nearestMinute5}
                                onSelect={handleMinuteSelect}
                            />

                            {/* AM / PM */}
                            <div className="flex flex-col gap-1">
                                {(["AM", "PM"] as const).map((period) => (
                                    <button
                                        key={period}
                                        type="button"
                                        onClick={() => handleAmPm(period)}
                                        className={`rounded-md py-1.5 text-center text-sm font-medium transition ${
                                            ampm === period
                                                ? "bg-cta text-cta-foreground"
                                                : "text-foreground hover:bg-muted"
                                        }`}
                                    >
                                        {period}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                            {valueStr ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        emit("");
                                        closeAndCommit();
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
                                onClick={closeAndCommit}
                                className="rounded-md bg-cta px-4 py-1.5 text-xs font-medium text-cta-foreground transition hover:bg-cta-hover"
                            >
                                Done
                            </button>
                        </div>
                    </PopoverPrimitive.Content>
                </PopoverPrimitive.Portal>
            </PopoverPrimitive.Root>
        </>
    );
}

export { TimeInput };
