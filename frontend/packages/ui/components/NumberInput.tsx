import { forwardRef, type InputHTMLAttributes } from "react";

/**
 * Cross-browser consistent number input.
 * Enforces `type="number"` so callers never forget it.
 * Spinner arrows are preserved so step-based increment/decrement works in all
 * browsers. Pass `className` for visual styling (e.g. `input-base` or `fieldCls`).
 */
export type NumberInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(
    { className = "", ...props },
    ref
) {
    return <input ref={ref} type="number" className={className} {...props} />;
});

NumberInput.displayName = "NumberInput";

export { NumberInput };
