import { type JSX, type FormEvent } from "react";
import { CreditCard } from "lucide-react";
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
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col px-6 pb-6 pt-5">
            <div className="mb-4 flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-muted/25 px-4 py-3">
                <div>
                    <p className="text-sm font-semibold text-foreground">New card</p>
                    <p className="text-xs text-muted-foreground">Your card is processed securely</p>
                </div>
                <p className="text-lg font-semibold text-foreground">{formatCurrency(amount)}</p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-border/70 bg-card p-4 shadow-sm">
                <PaymentElement
                    options={{
                        layout: "tabs",
                    }}
                />
            </div>

            {error ? (
                <div className="mt-4">
                    <PaymentErrorBanner message={error} onDismiss={onDismissError} />
                </div>
            ) : null}

            <button type="submit" disabled={isConfirming} className="btn-cta mt-5 min-h-11 w-full">
                {isConfirming ? (
                    <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-cta-foreground/40 border-t-cta-foreground" />
                        Processing…
                    </>
                ) : (
                    <>
                        <CreditCard size={15} />
                        {submitLabel ?? `Pay ${formatCurrency(amount)}`}
                    </>
                )}
            </button>
        </form>
    );
}
