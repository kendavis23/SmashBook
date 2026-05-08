import { useEffect, useState, useCallback, useRef, type JSX } from "react";
import { Elements, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useQueryClient } from "@tanstack/react-query";
import { X, CreditCard } from "lucide-react";
import { formatCurrency } from "@repo/ui";
import { config } from "@repo/config";
import { useListPaymentMethods, useCreatePaymentIntent } from "@repo/player-domain/hooks";
import type { PaymentModalProps, PaymentStep } from "../types";
import { PaymentMethodStep } from "./PaymentMethodStep";
import { PaymentSuccessStep } from "./PaymentSuccessStep";
import { PaymentErrorBanner } from "./PaymentErrorBanner";
import { SelectMethodStep } from "./SelectMethodStep";

const stripePromise = loadStripe(config.stripePublishableKey);

// ─── New-card form — needs <Elements> for useStripe/useElements ───────────────

function NewCardForm({
    amount,
    onSuccess,
}: {
    amount: number;
    onSuccess: () => void;
}): JSX.Element {
    const stripe = useStripe();
    const elements = useElements();
    const [isConfirming, setIsConfirming] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = useCallback(async () => {
        if (!stripe || !elements) return;
        setIsConfirming(true);
        setError(null);

        const { error: stripeError } = await stripe.confirmPayment({
            elements,
            confirmParams: { return_url: `${window.location.origin}/bookings` },
            redirect: "if_required",
        });

        setIsConfirming(false);

        if (stripeError) {
            setError(stripeError.message ?? "Payment failed.");
            return;
        }

        onSuccess();
    }, [stripe, elements, onSuccess]);

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

// ─── Saved-card confirm — backend already attached the payment_method to the intent ──

function SavedCardConfirm({
    clientSecret,
    amount,
    currency,
    onSuccess,
    onError,
}: {
    clientSecret: string;
    amount: number;
    currency: string;
    onSuccess: () => void;
    onError: (msg: string) => void;
}): JSX.Element {
    const [isConfirming, setIsConfirming] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handlePay = useCallback(async () => {
        const stripe = await stripePromise;
        if (!stripe) return;

        setIsConfirming(true);
        setError(null);

        const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret);

        setIsConfirming(false);

        if (stripeError) {
            setError(stripeError.message ?? "Payment failed.");
            return;
        }

        if (paymentIntent?.status === "succeeded") {
            onSuccess();
        } else {
            onError("Payment did not complete — please try again.");
        }
    }, [clientSecret, onSuccess, onError]);

    return (
        <div className="flex flex-col gap-5 p-6">
            <div className="rounded-xl border border-border bg-muted/40 px-4 py-4">
                <p className="text-xs text-muted-foreground">Amount due</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">
                    {formatCurrency(amount)}
                    <span className="ml-1 text-sm font-normal text-muted-foreground uppercase">
                        {currency}
                    </span>
                </p>
            </div>

            {error ? (
                <PaymentErrorBanner message={error} onDismiss={() => setError(null)} />
            ) : null}

            <button
                type="button"
                disabled={isConfirming}
                onClick={() => void handlePay()}
                className="btn-primary flex items-center justify-center gap-2"
            >
                {isConfirming ? (
                    <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-cta-foreground/40 border-t-cta-foreground" />
                        Processing…
                    </>
                ) : (
                    <>
                        <CreditCard size={15} />
                        Pay {formatCurrency(amount)}
                    </>
                )}
            </button>
        </div>
    );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export function PaymentModal({ context, onClose }: PaymentModalProps): JSX.Element {
    const [step, setStep] = useState<PaymentStep>({ id: "loading" });
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [amount, setAmount] = useState(0);
    const [currency, setCurrency] = useState("gbp");

    const queryClient = useQueryClient();
    const { data: paymentMethods, isLoading: methodsLoading } = useListPaymentMethods();
    const createPaymentIntent = useCreatePaymentIntent();
    const initRan = useRef(false);

    useEffect(() => {
        if (methodsLoading || initRan.current) return;
        initRan.current = true;

        if (context.type !== "booking") {
            setStep({ id: "error", message: "Unsupported payment context." });
            return;
        }

        if ((paymentMethods?.length ?? 0) === 0) {
            void createIntentThenShow(context.booking.booking_id, null);
        } else {
            setStep({ id: "choose_card", methods: paymentMethods! });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [methodsLoading]);

    async function createIntentThenShow(bookingId: string, methodId: string | null) {
        setStep({ id: "loading" });
        try {
            const intent = await createPaymentIntent.mutateAsync({
                booking_id: bookingId,
                ...(methodId ? { payment_method_id: methodId } : {}),
            });
            setClientSecret(intent.client_secret);
            setAmount(intent.amount);
            setCurrency(intent.currency);
            // saved card → confirm screen; new card → Stripe PaymentElement
            setStep(methodId ? { id: "select_method", methods: paymentMethods ?? [] } : { id: "new_card" });
        } catch (err) {
            setStep({
                id: "error",
                message: (err as { message?: string })?.message ?? "Unable to start payment — please try again.",
            });
        }
    }

    const handleCardChosen = useCallback(
        (methodId: string | null) => {
            if (context.type !== "booking") return;
            void createIntentThenShow(context.booking.booking_id, methodId);
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [context, paymentMethods]
    );

    const handleStripeSuccess = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ["player", "bookings"] });
        setStep({ id: "success", amount, currency });
    }, [amount, currency, queryClient]);

    const title =
        step.id === "choose_card"
            ? "Choose payment method"
            : step.id === "select_method"
                ? "Confirm payment"
                : "Pay for booking";

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
            <div className="relative z-10 flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl max-h-[90vh]">
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

                <div className="overflow-y-auto">
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
                    ) : step.id === "choose_card" ? (
                        <SelectMethodStep
                            methods={step.methods}
                            amount={context.type === "booking" ? (context.booking.amount_due ?? 0) : 0}
                            isLoading={createPaymentIntent.isPending}
                            onConfirm={handleCardChosen}
                        />
                    ) : step.id === "select_method" && clientSecret ? (
                        <SavedCardConfirm
                            clientSecret={clientSecret}
                            amount={amount}
                            currency={currency}
                            onSuccess={handleStripeSuccess}
                            onError={(msg) => setStep({ id: "error", message: msg })}
                        />
                    ) : step.id === "new_card" && clientSecret ? (
                        <Elements
                            stripe={stripePromise}
                            options={{
                                clientSecret,
                                appearance: { theme: "stripe", variables: { borderRadius: "8px" } },
                            }}
                        >
                            <NewCardForm
                                amount={amount}
                                onSuccess={handleStripeSuccess}
                            />
                        </Elements>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
