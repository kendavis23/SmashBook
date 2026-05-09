import { useEffect, useState, useCallback, useRef, type JSX } from "react";
import { Elements, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { X, CreditCard, Check } from "lucide-react";
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
    card,
    onSuccess,
    onCancel,
    onError,
}: {
    clientSecret: string;
    amount: number;
    currency: string;
    card: { brand: string; last4: string; exp_month: number; exp_year: number };
    onSuccess: () => void;
    onCancel: () => void;
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

    const today = new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });

    return (
        <div className="flex min-h-0 flex-1 flex-col px-6 pb-6 pt-5">
            <div className="rounded-xl border border-border/70 bg-muted/30 p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-semibold text-foreground">Payment details</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            Review before confirming
                        </p>
                    </div>
                    <span className="rounded-full bg-cta/10 px-3 py-1 text-xs font-semibold uppercase text-cta">
                        {currency}
                    </span>
                </div>
                <div className="flex flex-col divide-y divide-border/80">
                    <div className="flex items-center justify-between gap-6 py-3">
                        <span className="text-sm text-muted-foreground">Date</span>
                        <span className="text-sm font-medium text-foreground">{today}</span>
                    </div>
                    <div className="flex items-center justify-between gap-6 py-3">
                        <span className="text-sm text-muted-foreground">Payment method</span>
                        <span className="text-sm font-medium capitalize text-foreground">
                            {card.brand}
                        </span>
                    </div>
                    <div className="flex items-center justify-between gap-6 py-3">
                        <span className="text-sm text-muted-foreground">Card number</span>
                        <span className="text-sm font-medium text-foreground">
                            •••• •••• •••• {card.last4}
                        </span>
                    </div>
                    <div className="flex items-center justify-between gap-6 py-3">
                        <span className="text-sm text-muted-foreground">Expires</span>
                        <span className="text-sm font-medium text-foreground">
                            {card.exp_month.toString().padStart(2, "0")}/{card.exp_year}
                        </span>
                    </div>
                </div>
                <div className="mt-1 flex items-center justify-between gap-6 border-t border-border pt-4">
                    <span className="text-base font-semibold text-foreground">Total amount</span>
                    <span className="text-base font-semibold text-foreground">
                        {formatCurrency(amount)}{" "}
                        <span className="text-sm font-normal uppercase text-muted-foreground">
                            {currency}
                        </span>
                    </span>
                </div>
            </div>

            {error ? (
                <div className="mt-4">
                    <PaymentErrorBanner message={error} onDismiss={() => setError(null)} />
                </div>
            ) : null}

            <div className="mt-auto flex gap-3 pt-5">
                <button
                    type="button"
                    disabled={isConfirming}
                    onClick={onCancel}
                    className="btn-outline min-h-11 flex-1"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    disabled={isConfirming}
                    onClick={() => void handlePay()}
                    className="btn-cta min-h-11 flex-1"
                >
                    {isConfirming ? (
                        <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-cta-foreground/40 border-t-cta-foreground" />
                            Processing…
                        </>
                    ) : (
                        <>
                            <CreditCard size={15} />
                            Confirm Payment
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function getStepMeta(step: PaymentStep): { title: string; active: number } {
    if (step.id === "choose_card" || step.id === "loading") {
        return { title: "Choose payment method", active: 1 };
    }
    if (step.id === "select_method" || step.id === "new_card" || step.id === "confirming") {
        return {
            title: step.id === "new_card" ? "Enter card details" : "Confirm payment",
            active: 2,
        };
    }
    if (step.id === "success") {
        return { title: "Payment complete", active: 3 };
    }
    return { title: "Pay for booking", active: 1 };
}

function PaymentStepIndicator({ active }: { active: number }): JSX.Element {
    const steps = ["Method", "Confirm", "Done"];

    return (
        <div className="grid grid-cols-3 gap-2 px-6 pb-4">
            {steps.map((label, index) => {
                const stepNumber = index + 1;
                const isDone = stepNumber < active;
                const isActive = stepNumber === active;

                return (
                    <div key={label} className="flex items-center gap-2">
                        <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition ${
                                isDone || isActive
                                    ? "bg-cta text-cta-foreground"
                                    : "bg-muted text-muted-foreground"
                            }`}
                        >
                            {isDone ? <Check size={13} /> : stepNumber}
                        </span>
                        <span
                            className={`truncate text-xs font-medium ${
                                isActive ? "text-foreground" : "text-muted-foreground"
                            }`}
                        >
                            {label}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

export function PaymentModal({ context, onClose, onSuccess }: PaymentModalProps): JSX.Element {
    const [step, setStep] = useState<PaymentStep>({ id: "loading" });
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [amount, setAmount] = useState(0);
    const [currency, setCurrency] = useState("gbp");

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
            if (methodId) {
                const chosenCard =
                    (paymentMethods ?? []).find((m) => m.id === methodId) ??
                    (paymentMethods ?? [])[0]!;
                setStep({ id: "select_method", methods: paymentMethods ?? [], chosenCard });
            } else {
                setStep({ id: "new_card" });
            }
        } catch (err) {
            setStep({
                id: "error",
                message:
                    (err as { message?: string })?.message ??
                    "Unable to start payment — please try again.",
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
        onSuccess?.();
        setStep({ id: "success", amount, currency });
    }, [amount, currency, onSuccess]);

    const { title, active } = getStepMeta(step);

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
            <div className="relative z-10 flex h-[680px] max-h-[calc(100vh-2rem)] w-full max-w-[560px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
                <div className="border-b border-border bg-card">
                    <div className="flex items-center justify-between px-6 py-5">
                        <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wide text-cta">
                                Secure payment
                            </p>
                            <h2 className="mt-1 truncate text-xl font-semibold tracking-tight text-foreground">
                                {title}
                            </h2>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                            aria-label="Close"
                        >
                            <X size={18} />
                        </button>
                    </div>
                    <PaymentStepIndicator active={active} />
                </div>

                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
                    {step.id === "loading" ? (
                        <div className="flex flex-1 items-center justify-center gap-3">
                            <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-cta" />
                            <span className="text-sm text-muted-foreground">
                                Preparing payment…
                            </span>
                        </div>
                    ) : step.id === "error" ? (
                        <div className="p-6">
                            <PaymentErrorBanner message={step.message} />
                            <button
                                type="button"
                                onClick={onClose}
                                className="btn-outline mt-4 w-full"
                            >
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
                            amount={
                                context.type === "booking" ? (context.booking.amount_due ?? 0) : 0
                            }
                            isLoading={createPaymentIntent.isPending}
                            onConfirm={handleCardChosen}
                        />
                    ) : step.id === "select_method" && clientSecret ? (
                        <SavedCardConfirm
                            clientSecret={clientSecret}
                            amount={amount}
                            currency={currency}
                            card={step.chosenCard}
                            onSuccess={handleStripeSuccess}
                            onCancel={onClose}
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
                            <NewCardForm amount={amount} onSuccess={handleStripeSuccess} />
                        </Elements>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
