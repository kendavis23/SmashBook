import { type InputHTMLAttributes, type Ref, type WheelEvent } from "react";

/**
 * Cross-browser consistent number input.
 * Enforces `type="number"` so callers never forget it.
 * Spinner arrows are preserved so step-based increment/decrement works in all
 * browsers. Pass `className` for visual styling (e.g. `input-base` or `fieldCls`).
 *
 * Scrolling the mouse wheel over a focused number input silently mutates its
 * value by `step` per tick (e.g. 19 → 18.99 → 18.94). We blur on wheel so a
 * scroll never changes the value out from under the user.
 */
export type NumberInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
    ref?: Ref<HTMLInputElement>;
};

function NumberInput({ className = "", ref, onWheel, ...props }: NumberInputProps) {
    function handleWheel(e: WheelEvent<HTMLInputElement>): void {
        // Drop focus so the browser's wheel-to-step behaviour can't fire.
        e.currentTarget.blur();
        onWheel?.(e);
    }
    return <input ref={ref} type="number" className={className} onWheel={handleWheel} {...props} />;
}

export { NumberInput };
