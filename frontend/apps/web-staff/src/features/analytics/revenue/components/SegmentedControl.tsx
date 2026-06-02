import type { JSX } from "react";

export type SegmentOption<T extends string> = {
    value: T;
    label: string;
};

type Props<T extends string> = {
    value: T;
    options: SegmentOption<T>[];
    onChange: (next: T) => void;
    /** Option values to render disabled (e.g. a coarse grain on a short range). */
    disabled?: T[];
    ariaLabel: string;
};

/** Compact pill segmented control. Drives the granularity and basis toggles. */
export function SegmentedControl<T extends string>({
    value,
    options,
    onChange,
    disabled = [],
    ariaLabel,
}: Props<T>): JSX.Element {
    return (
        <div
            role="radiogroup"
            aria-label={ariaLabel}
            className="inline-flex items-center gap-0.5 rounded-lg border border-border/70 bg-muted/40 p-0.5"
        >
            {options.map((opt) => {
                const isActive = opt.value === value;
                const isDisabled = disabled.includes(opt.value);
                return (
                    <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={isActive}
                        disabled={isDisabled}
                        onClick={() => onChange(opt.value)}
                        className={
                            "rounded-md px-2.5 py-1 text-xs font-semibold tracking-tight transition-colors " +
                            (isActive
                                ? "bg-card text-foreground shadow-sm ring-1 ring-black/[0.04]"
                                : "text-muted-foreground hover:text-foreground") +
                            (isDisabled
                                ? " cursor-not-allowed opacity-40 hover:text-muted-foreground"
                                : "")
                        }
                    >
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}
