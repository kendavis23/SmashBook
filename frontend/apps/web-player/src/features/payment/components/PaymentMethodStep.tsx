import { type JSX, type FormEvent } from "react";
import { PaymentElement } from "@stripe/react-stripe-js";
import { formatCurrency } from "@repo/ui";
import { PaymentErrorBanner } from "./PaymentErrorBanner";

interface Props {
    amount: number;
    isConfirming: boolean;
    error: string | null;
    onSubmit: () => void;
    onDismissError: () => void;
    submitLabel?: string;
}

export function PaymentMethodStep({
    amount,
    isConfirming,
    error,
    onSubmit,
    onDismissError,
    submitLabel,
}: Props): JSX.Element {
    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        onSubmit();
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-6">
            <PaymentElement
                options={{
                    layout: "tabs",
                }}
            />

            {error ? (
                <PaymentErrorBanner message={error} onDismiss={onDismissError} />
            ) : null}

            <button
                type="submit"
                disabled={isConfirming}
                className="btn-primary flex items-center justify-center gap-2"
            >
                {isConfirming ? (
                    <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-cta-foreground/40 border-t-cta-foreground" />
                        Processing…
                    </>
                ) : (
                    submitLabel ?? `Pay ${formatCurrency(amount)}`
                )}
            </button>
        </form>
    );
}
