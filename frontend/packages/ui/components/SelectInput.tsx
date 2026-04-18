import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { type JSX, type ReactNode } from "react";

/**
 * Cross-browser consistent select.
 *
 * Safari's native `<select>` uses OS-level rendering that cannot be fully
 * styled with CSS. This component is a headless Radix UI select with our
 * design-system tokens applied, so it looks identical on Safari, Chrome,
 * Firefox, and mobile browsers.
 */
export interface SelectOption {
    value: string;
    label: string;
    /** When true, the option is shown but cannot be selected. */
    disabled?: boolean;
}

export interface SelectInputProps {
    value: string;
    onValueChange: (value: string) => void;
    options: SelectOption[];
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    name?: string;
    /**
     * When provided, prepends a "clear / all" item at the top of the dropdown.
     * Selecting it calls onValueChange("").
     */
    clearLabel?: string;
    /** Optional leading icon rendered inside the trigger on the left. */
    startIcon?: ReactNode;
    /** Extra classes appended to the trigger element. */
    className?: string;
    /** Accessible label forwarded to the trigger button. */
    "aria-label"?: string;
}

const TRIGGER_BASE =
    "flex w-full items-center gap-2 rounded-lg border border-border " +
    "bg-background px-3 py-2 text-sm text-foreground transition " +
    "focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta-ring/30 " +
    "disabled:cursor-not-allowed disabled:opacity-50 " +
    "data-[placeholder]:text-muted-foreground";

const CLEAR_SENTINEL = "__clear__";

export function SelectInput({
    value,
    onValueChange,
    options,
    placeholder = "Select…",
    disabled,
    required,
    name,
    clearLabel,
    startIcon,
    className = "",
    "aria-label": ariaLabel,
}: SelectInputProps): JSX.Element {
    function handleChange(val: string) {
        onValueChange(val === CLEAR_SENTINEL ? "" : val);
    }
    return (
        <SelectPrimitive.Root
            value={value || undefined}
            onValueChange={handleChange}
            disabled={disabled}
            required={required}
            name={name}
        >
            <SelectPrimitive.Trigger
                className={`${TRIGGER_BASE} ${className}`}
                aria-label={ariaLabel}
            >
                {startIcon != null && (
                    <span className="shrink-0 text-muted-foreground">{startIcon}</span>
                )}
                {/* grow so the value fills available space */}
                <SelectPrimitive.Value placeholder={placeholder} className="flex-1 text-left" />
                <SelectPrimitive.Icon asChild>
                    <ChevronDown size={14} className="ml-auto shrink-0 text-muted-foreground" />
                </SelectPrimitive.Icon>
            </SelectPrimitive.Trigger>

            <SelectPrimitive.Portal>
                <SelectPrimitive.Content
                    position="popper"
                    sideOffset={4}
                    className="z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-border bg-background shadow-md"
                >
                    <SelectPrimitive.Viewport className="p-1">
                        {clearLabel !== undefined && (
                            <SelectPrimitive.Item
                                value={CLEAR_SENTINEL}
                                className="relative flex w-full cursor-pointer select-none items-center rounded-md py-1.5 pl-8 pr-3 text-sm text-muted-foreground outline-none data-[highlighted]:bg-muted"
                            >
                                <SelectPrimitive.ItemText>{clearLabel}</SelectPrimitive.ItemText>
                            </SelectPrimitive.Item>
                        )}
                        {options.map((opt) => (
                            <SelectPrimitive.Item
                                key={opt.value}
                                value={opt.value}
                                disabled={opt.disabled}
                                className="relative flex w-full cursor-pointer select-none items-center rounded-md py-1.5 pl-8 pr-3 text-sm text-foreground outline-none data-[highlighted]:bg-muted data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                            >
                                <SelectPrimitive.ItemIndicator className="absolute left-2 flex items-center">
                                    <Check size={12} />
                                </SelectPrimitive.ItemIndicator>
                                <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
                            </SelectPrimitive.Item>
                        ))}
                    </SelectPrimitive.Viewport>
                </SelectPrimitive.Content>
            </SelectPrimitive.Portal>
        </SelectPrimitive.Root>
    );
}
