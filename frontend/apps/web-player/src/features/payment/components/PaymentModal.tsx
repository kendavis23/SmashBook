import { useEffect, useState, useCallback, type JSX } from "react";
import { Elements, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { config } from "@repo/config";
import { useListPaymentMethods, useCreatePaymentIntent, useCreateSetupIntent } from "@repo/player-domain/hooks";
import type { PaymentModalProps, PaymentStep } from "../types";
import { PaymentMethodStep } from "./PaymentMethodStep";
import { PaymentSuccessStep } from "./PaymentSuccessStep";
import { PaymentErrorBanner } from "./PaymentErrorBanner";

const stripePromise = loadStripe(config.stripePublishableKey);

// Must live inside <Elements> so useStripe/useElements work
function StripeForm({
    amount,
    onSuccess,
}: {
    amount: number;
    onSuccess: (amount: number, currency: string) => void;
}): JSX.Element {
    const stripe = useStripe();
    const elements = useElements();
    const queryClient = useQueryClient();
    const [isConfirming, setIsConfirming] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = useCallback(async () => {
        if (!stripe || !elements) return;
        setIsConfirming(true);
        setError(null);

        const { error: stripeError } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: `${window.location.origin}/bookings`,
            },
            redirect: "if_required",
        });

        setIsConfirming(false);

        if (stripeError) {
            setError(stripeError.message ?? "Payment failed.");
            return;
        }

        queryClient.invalidateQueries({ queryKey: ["player", "bookings"] });
        onSuccess(amount, "gbp");
    }, [stripe, elements, amount, queryClient, onSuccess]);

    return (
        <PaymentMethodStep
            amount={amount}
            isConfirming={isConfirming}
            error={error}
            onSubmit={() => void handleSubmit()}
            onDismissError={() => setError(null)}
        />
    );
}

// SetupIntent version — used for add_card context
function StripeSetupForm({
    onSuccess,
}: {
    onSuccess: () => void;
}): JSX.Element {
    const stripe = useStripe();
    const elements = useElements();
    const queryClient = useQueryClient();
    const [isConfirming, setIsConfirming] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = useCallback(async () => {
        if (!stripe || !elements) return;
        setIsConfirming(true);
        setError(null);

        const { error: stripeError } = await stripe.confirmSetup({
            elements,
            confirmParams: {
                return_url: `${window.location.origin}/settings/payment-methods`,
            },
            redirect: "if_required",
        });

        setIsConfirming(false);

        if (stripeError) {
            setError(stripeError.message ?? "Failed to save card.");
            return;
        }

        queryClient.invalidateQueries({ queryKey: ["player", "payment-methods"] });
        onSuccess();
    }, [stripe, elements, queryClient, onSuccess]);

    return (
        <PaymentMethodStep
            amount={0}
            isConfirming={isConfirming}
            error={error}
            onSubmit={() => void handleSubmit()}
            onDismissError={() => setError(null)}
            submitLabel="Save card"
        />
    );
}

export function PaymentModal({ context, onClose }: PaymentModalProps): JSX.Element {
    const [step, setStep] = useState<PaymentStep>({ id: "loading" });
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [amount, setAmount] = useState(0);
    const [currency, setCurrency] = useState("gbp");

    const { data: paymentMethods, isLoading: methodsLoading } = useListPaymentMethods();
    const createPaymentIntent = useCreatePaymentIntent();
    const createSetupIntent = useCreateSetupIntent();

    useEffect(() => {
        if (methodsLoading) return;

        async function init() {
            if (context.type === "booking") {
                const defaultMethod = paymentMethods?.find((m) => m.is_default) ?? null;
                try {
                    const intent = await createPaymentIntent.mutateAsync({
                        booking_id: context.booking.booking_id,
                        payment_method_id: defaultMethod?.id ?? null,
                    });
                    setClientSecret(intent.client_secret);
                    setAmount(intent.amount);
                    setCurrency(intent.currency);
                    setStep(
                        (paymentMethods?.length ?? 0) > 0
                            ? { id: "select_method", methods: paymentMethods! }
                            : { id: "new_card" }
                    );
                } catch (err) {
                    setStep({
                        id: "error",
                        message:
                            (err as { message?: string })?.message ??
                            "Unable to start payment — please try again.",
                    });
                }
            } else {
                try {
                    const intent = await createSetupIntent.mutateAsync();
                    setClientSecret(intent.client_secret);
                    setStep({ id: "new_card" });
                } catch (err) {
                    setStep({
                        id: "error",
                        message:
                            (err as { message?: string })?.message ??
                            "Unable to set up card — please try again.",
                    });
                }
            }
        }

        void init();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [methodsLoading]);

    const handlePaySuccess = useCallback(
        (successAmount: number, successCurrency: string) => {
            setStep({ id: "success", amount: successAmount, currency: successCurrency });
        },
        []
    );

    const handleSetupSuccess = useCallback(() => {
        setStep({ id: "success", amount: 0, currency });
    }, [currency]);

    const title =
        context.type === "booking"
            ? "Pay for booking"
            : "Add payment method";

    const showForm =
        clientSecret &&
        (step.id === "select_method" || step.id === "new_card" || step.id === "confirming");

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label={title}
        >
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden="true"
            />
            <div className="relative z-10 flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
                <div className="flex items-center justify-between border-b border-border px-6 py-4">
                    <h2 className="text-base font-semibold text-foreground">{title}</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        aria-label="Close"
                    >
                        <X size={15} />
                    </button>
                </div>

                {step.id === "loading" ? (
                    <div className="flex items-center justify-center gap-3 py-16">
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-cta" />
                        <span className="text-sm text-muted-foreground">Preparing payment…</span>
                    </div>
                ) : step.id === "error" ? (
                    <div className="p-6">
                        <PaymentErrorBanner message={step.message} />
                        <button type="button" onClick={onClose} className="btn-outline mt-4 w-full">
                            Close
                        </button>
                    </div>
                ) : step.id === "success" ? (
                    <PaymentSuccessStep
                        amount={step.amount}
                        currency={step.currency}
                        onClose={onClose}
                    />
                ) : showForm ? (
                    <Elements
                        stripe={stripePromise}
                        options={{
                            clientSecret,
                            appearance: {
                                theme: "stripe",
                                variables: { borderRadius: "8px" },
                            },
                        }}
                    >
                        {context.type === "booking" ? (
                            <StripeForm amount={amount} onSuccess={handlePaySuccess} />
                        ) : (
                            <StripeSetupForm onSuccess={handleSetupSuccess} />
                        )}
                    </Elements>
                ) : null}
            </div>
        </div>
    );
}
