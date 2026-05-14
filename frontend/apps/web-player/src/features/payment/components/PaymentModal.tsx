import { useEffect, useState, useCallback, useRef, type JSX } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { CalendarDays, CreditCard, LockKeyhole, ReceiptText, X } from "lucide-react";
import { formatCurrency } from "@repo/ui";
import { config } from "@repo/config";
import {
    useListPaymentMethods,
    useCreatePaymentIntent,
    useCreateSetupIntent,
    usePayBookingWithWallet,
} from "@repo/player-domain/hooks";
import { useQueryClient } from "@tanstack/react-query";
import type { PaymentMethod } from "../types";
import type { PaymentModalProps, PaymentStep } from "../types";
import { PaymentMethodStep } from "./PaymentMethodStep";
import { PaymentSuccessStep } from "./PaymentSuccessStep";
import { PaymentErrorBanner } from "./PaymentErrorBanner";
import { ChooseMethodStep } from "./ChooseMethodStep";
import { useSaveCard } from "../hooks/useSaveCard";

const stripePromise = loadStripe(config.stripePublishableKey);

// ─── Save-card form (setup intent) — shown when user selects new card ────────

function SaveCardForm({
    setupClientSecret,
    onSaved,
    onError,
}: {
    setupClientSecret: string;
    onSaved: (paymentMethodId: string) => void;
    onError: (msg: string) => void;
}): JSX.Element {
    const { confirmSetup } = useSaveCard();
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = useCallback(async () => {
        setIsPending(true);
        setError(null);
        try {
            const paymentMethodId = await confirmSetup(setupClientSecret);
            onSaved(paymentMethodId);
        } catch (err) {
            const msg = (err as { message?: string })?.message ?? "Failed to save card.";
            setError(msg);
            onError(msg);
        } finally {
            setIsPending(false);
        }
    }, [confirmSetup, setupClientSecret, onSaved, onError]);

    return (
        <PaymentMethodStep
            amount={0}
            isConfirming={isPending}
            error={error}
            onSubmit={() => void handleSubmit()}
            onDismissError={() => setError(null)}
            submitLabel="Save card & continue"
        />
    );
}

// ─── Saved-card confirm ───────────────────────────────────────────────────────

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
        <div className="flex min-h-0 flex-1 flex-col px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
            <div className="rounded-lg border border-border bg-card shadow-sm">
                <div className="flex items-start justify-between gap-4 border-b border-border/70 px-5 py-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <ReceiptText size={16} className="text-cta" />
                            <p className="text-sm font-semibold text-foreground">Payment summary</p>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Review before confirming
                        </p>
                    </div>
                    <span className="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-semibold uppercase text-muted-foreground">
                        {currency}
                    </span>
                </div>
                <div className="px-5 py-2">
                    <div className="flex items-center justify-between gap-6 border-b border-border/70 py-3">
                        <span className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CalendarDays size={14} />
                            Date
                        </span>
                        <span className="text-sm font-medium text-foreground">{today}</span>
                    </div>
                    <div className="flex items-center justify-between gap-6 border-b border-border/70 py-3">
                        <span className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CreditCard size={14} />
                            Payment method
                        </span>
                        <span className="text-sm font-medium capitalize text-foreground">
                            {card.brand}
                        </span>
                    </div>
                    <div className="flex items-center justify-between gap-6 border-b border-border/70 py-3">
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
                <div className="flex items-end justify-between gap-6 border-t border-border bg-muted/20 px-5 py-4">
                    <span className="text-sm font-semibold text-foreground">Total amount</span>
                    <span className="text-xl font-semibold tracking-tight text-foreground">
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

// ─── Step meta ────────────────────────────────────────────────────────────────

function getStepMeta(step: PaymentStep): { title: string } {
    if (step.id === "choose_method" || step.id === "loading") {
        return { title: "Secure checkout" };
    }
    if (step.id === "save_card") return { title: "Add a card" };
    if (step.id === "select_method" || step.id === "confirming") {
        return { title: "Confirm payment" };
    }
    if (step.id === "success") return { title: "Payment complete" };
    return { title: "Secure checkout" };
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export function PaymentModal({ context, onClose, onSuccess }: PaymentModalProps): JSX.Element {
    const [step, setStep] = useState<PaymentStep>({ id: "loading" });
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [amount, setAmount] = useState(0);
    const [currency, setCurrency] = useState("gbp");

    const { data: paymentMethods, isLoading: methodsLoading } = useListPaymentMethods();
    const createPaymentIntent = useCreatePaymentIntent();
    const createSetupIntent = useCreateSetupIntent();
    const payWithWallet = usePayBookingWithWallet();
    const queryClient = useQueryClient();
    const initRan = useRef(false);

    const isDataLoading = methodsLoading;

    useEffect(() => {
        if (isDataLoading || initRan.current) return;
        initRan.current = true;

        if (context.type !== "booking") {
            setStep({ id: "error", message: "Unsupported payment context." });
            return;
        }

        setStep({
            id: "choose_method",
            methods: paymentMethods ?? [],
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDataLoading]);

    async function initSaveCard() {
        setStep({ id: "loading" });
        try {
            const intent = await createSetupIntent.mutateAsync();
            setStep({ id: "save_card", setupClientSecret: intent.client_secret });
        } catch (err) {
            setStep({
                id: "error",
                message:
                    (err as { message?: string })?.message ??
                    "Unable to start card setup — please try again.",
            });
        }
    }

    async function createIntentThenShow(
        bookingId: string,
        methodId: string,
        cardOverride?: PaymentMethod
    ) {
        setStep({ id: "loading" });
        try {
            const intent = await createPaymentIntent.mutateAsync({
                booking_id: bookingId,
                payment_method_id: methodId,
            });
            setClientSecret(intent.client_secret);
            setAmount(intent.amount);
            setCurrency(intent.currency);

            let freshMethods = paymentMethods ?? [];
            let chosenCard = cardOverride ?? freshMethods.find((m) => m.id === methodId);

            if (!chosenCard) {
                await queryClient.refetchQueries({ queryKey: ["player", "payment-methods"] });
                freshMethods =
                    queryClient.getQueryData<PaymentMethod[]>(["player", "payment-methods"]) ?? [];
                chosenCard = freshMethods.find((m) => m.id === methodId) ?? freshMethods[0];
            }

            if (!chosenCard) {
                setStep({
                    id: "error",
                    message: "Could not load card details — please try again.",
                });
                return;
            }

            setStep({ id: "select_method", methods: freshMethods, chosenCard });
        } catch (err) {
            setStep({
                id: "error",
                message:
                    (err as { message?: string })?.message ??
                    "Unable to start payment — please try again.",
            });
        }
    }

    const handlePayWithWallet = useCallback(() => {
        if (context.type !== "booking") return;
        payWithWallet.mutate(
            { booking_id: context.booking.booking_id },
            {
                onSuccess: () => {
                    onSuccess?.();
                    setStep({
                        id: "success",
                        amount: context.booking.amount_due,
                        currency: "gbp",
                        method: "wallet",
                    });
                },
                onError: (err) => {
                    setStep({
                        id: "error",
                        message:
                            (err as { message?: string })?.message ??
                            "Wallet payment failed — please try again.",
                    });
                },
            }
        );
    }, [context, payWithWallet, onSuccess]);

    const handlePayWithCard = useCallback(
        (methodId: string | null) => {
            if (context.type !== "booking") return;
            if (methodId) {
                void createIntentThenShow(context.booking.booking_id, methodId);
            } else {
                void initSaveCard();
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [context, paymentMethods]
    );

    const handleCardSaved = useCallback(
        (paymentMethodId: string) => {
            if (context.type !== "booking") return;
            void createIntentThenShow(context.booking.booking_id, paymentMethodId);
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [context]
    );

    const handleStripeSuccess = useCallback(() => {
        onSuccess?.();
        setStep({ id: "success", amount, currency, method: "card" });
    }, [amount, currency, onSuccess]);

    const { title } = getStepMeta(step);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label={title}
        >
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden="true"
            />
            <div className="relative z-10 flex max-h-[calc(100vh-2rem)] w-full max-w-[480px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
                <div className="flex items-center justify-between border-b border-border px-6 py-4">
                    <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-cta/10 text-cta">
                            <LockKeyhole size={14} />
                        </span>
                        <h2 className="text-base font-semibold text-foreground">{title}</h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        aria-label="Close"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-background/20">
                    {step.id === "loading" ? (
                        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
                            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card shadow-sm">
                                <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-cta" />
                            </span>
                            <div>
                                <p className="text-sm font-medium text-foreground">
                                    Preparing payment
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Setting up a secure session…
                                </p>
                            </div>
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
                            method={step.method}
                            onClose={onClose}
                        />
                    ) : step.id === "choose_method" ? (
                        <ChooseMethodStep
                            methods={step.methods}
                            amountDue={
                                context.type === "booking" ? (context.booking.amount_due ?? 0) : 0
                            }
                            isLoading={payWithWallet.isPending || createPaymentIntent.isPending}
                            onPayWithWallet={handlePayWithWallet}
                            onPayWithCard={handlePayWithCard}
                        />
                    ) : step.id === "save_card" ? (
                        <Elements
                            stripe={stripePromise}
                            options={{
                                clientSecret: step.setupClientSecret,
                                appearance: {
                                    theme: "stripe",
                                    variables: {
                                        borderRadius: "6px",
                                        spacingUnit: "4px",
                                    },
                                },
                            }}
                        >
                            <SaveCardForm
                                setupClientSecret={step.setupClientSecret}
                                onSaved={handleCardSaved}
                                onError={(msg) => setStep({ id: "error", message: msg })}
                            />
                        </Elements>
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
                    ) : null}
                </div>
            </div>
        </div>
    );
}
