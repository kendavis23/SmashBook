import { type JSX, type FormEvent } from "react";
import { CreditCard, LockKeyhole } from "lucide-react";
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
        <form
            onSubmit={handleSubmit}
            className="flex min-h-0 flex-1 flex-col px-5 pb-5 pt-4 sm:px-6 sm:pb-6"
        >
            {amount > 0 && (
                <div className="mb-4 rounded-lg border border-border bg-card shadow-sm">
                    <div className="flex items-center justify-between gap-4 px-5 py-4">
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground">
                                New card payment
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Enter details in the secure Stripe form below
                            </p>
                        </div>
                        <p className="shrink-0 text-xl font-semibold tracking-tight text-foreground">
                            {formatCurrency(amount)}
                        </p>
                    </div>
                </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-border bg-card shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
                    <div>
                        <p className="text-sm font-semibold text-foreground">Payment details</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            Securely processed by Stripe
                        </p>
                    </div>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-cta/10 text-cta">
                        <LockKeyhole size={15} />
                    </span>
                </div>
                <div className="p-4">
                    <PaymentElement
                        options={{
                            layout: "tabs",
                        }}
                    />
                </div>
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
