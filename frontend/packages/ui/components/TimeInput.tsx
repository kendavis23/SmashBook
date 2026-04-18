import { Clock } from "lucide-react";
import { forwardRef, useId, type InputHTMLAttributes } from "react";

export type TimeInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

const TimeInput = forwardRef<HTMLInputElement, TimeInputProps>(function TimeInput(
    { className = "", disabled, ...props },
    ref
) {
    const id = useId().replace(/:/g, "");
    const scopeId = `ti-${id}`;

    return (
        <div className="relative flex w-full items-center">
            {/* Inline <style> is the only reliable way to stretch
                ::-webkit-calendar-picker-indicator in Safari. Tailwind
                pseudo-element selectors are not honoured by WebKit here. */}
            <style>{`
                #${scopeId}::-webkit-calendar-picker-indicator {
                    position: absolute;
                    inset: 0;
                    width: 100%;
                    height: 100%;
                    opacity: 0;
                    cursor: pointer;
                }
            `}</style>

            <input
                id={scopeId}
                ref={ref}
                type="time"
                disabled={disabled}
                className={[
                    "relative w-full pr-8",
                    "[&::-webkit-date-and-time-value]:text-left",
                    className,
                ]
                    .filter(Boolean)
                    .join(" ")}
                {...props}
            />

            {/* Purely decorative — pointer-events-none so every tap falls
                through to the invisible native indicator and opens the OS picker */}
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
