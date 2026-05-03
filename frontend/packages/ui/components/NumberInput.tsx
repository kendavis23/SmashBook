import { type InputHTMLAttributes, type Ref } from "react";

/**
 * Cross-browser consistent number input.
 * Enforces `type="number"` so callers never forget it.
 * Spinner arrows are preserved so step-based increment/decrement works in all
 * browsers. Pass `className` for visual styling (e.g. `input-base` or `fieldCls`).
 */
export type NumberInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
    ref?: Ref<HTMLInputElement>;
};

function NumberInput({ className = "", ref, ...props }: NumberInputProps) {
    return <input ref={ref} type="number" className={className} {...props} />;
}

export { NumberInput };
