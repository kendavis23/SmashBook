import { Clock } from "lucide-react";
import { forwardRef, type InputHTMLAttributes } from "react";

/**
 * Cross-browser consistent time input.
 *
 * Strategy: keep the browser's native `::-webkit-calendar-picker-indicator`
 * in its natural position but invisible (`opacity-0`). A Lucide Clock icon is
 * overlaid on top with `pointer-events-none`, so user taps pass straight
 * through to the native, invisible indicator underneath — opening the system
 * time picker (Safari scroll-wheel, Chrome dropdown, Firefox clock) without
 * any JavaScript `showPicker()` call, which is unreliable in iOS Safari.
 *
 * `appearance-none` is intentionally NOT applied: in Safari it strips the
 * segmented HH:MM AM/PM editor and icon entirely.
 *
 * Pass `className` for visual styling (e.g. `input-base` or `fieldCls`).
 */
export type TimeInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

const TimeInput = forwardRef<HTMLInputElement, TimeInputProps>(function TimeInput(
    { className = "", disabled, ...props },
    ref
) {
    return (
        <div className="relative flex w-full items-center">
            <input
                ref={ref}
                type="time"
                disabled={disabled}
                className={[
                    "w-full pr-8",
                    // Left-align the time value (Chrome can centre it without this)
                    "[&::-webkit-date-and-time-value]:text-left",
                    // The native indicator stays in its natural right-side position
                    // but is invisible. Our Clock icon sits directly over it with
                    // pointer-events-none, so taps fall through to the native
                    // indicator and open the OS picker.
                    "[&::-webkit-calendar-picker-indicator]:opacity-0",
                    "[&::-webkit-calendar-picker-indicator]:cursor-pointer",
                    className,
                ]
                    .filter(Boolean)
                    .join(" ")}
                {...props}
            />

            {/* Decorative overlay — pointer-events-none so taps fall through
                to the invisible native indicator and open the system picker */}
            <span
                aria-hidden
                className={`pointer-events-none absolute right-2.5 flex items-center transition-opacity ${
                    disabled ? "opacity-40" : "opacity-60"
                }`}
            >
                <Clock size={14} className="text-muted-foreground" />
            </span>
        </div>
    );
});

TimeInput.displayName = "TimeInput";

export { TimeInput };
