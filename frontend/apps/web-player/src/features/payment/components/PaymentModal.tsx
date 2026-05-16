import { useEffect, useState, useCallback, useRef, type JSX } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Check, CreditCard, LockKeyhole, X } from "lucide-react";
import { formatCurrency } from "@repo/ui";
import { config } from "@repo/config";
import {
    useListPaymentMethods,
    useCreatePaymentIntent,
    useCreateSetupIntent,
    usePayBookingWithWallet,
    useGetBooking,
    useMyProfile,
} from "@repo/player-domain/hooks";
import { useQueryClient } from "@tanstack/react-query";
import type { PaymentMethod } from "../types";
import type { PaymentModalProps, PaymentStep } from "../types";
import { PaymentMethodStep } from "./PaymentMethodStep";
import { PaymentSuccessStep } from "./PaymentSuccessStep";
import { PaymentErrorBanner } from "./PaymentErrorBanner";
import { ChooseMethodStep } from "./ChooseMethodStep";
import { BookingInfoPanel } from "./BookingInfoPanel";
import { useSaveCard } from "../hooks/useSaveCard";

const stripePromise = loadStripe(config.stripePublishableKey);

// ─── Save-card form ───────────────────────────────────────────────────────────

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
    onProcessing,
}: {
    clientSecret: string;
    amount: number;
    currency: string;
    card: { brand: string; last4: string; exp_month: number; exp_year: number };
    onSuccess: () => void;
    onCancel: () => void;
    onError: (msg: string) => void;
    onProcessing: () => void;
}): JSX.Element {
    const handlePay = useCallback(async () => {
        const stripe = await stripePromise;
        if (!stripe) return;

        onProcessing();

        const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret);

        if (stripeError) {
            onError(stripeError.message ?? "Payment failed.");
            return;
        }

        if (paymentIntent?.status === "succeeded") {
            onSuccess();
        } else {
            onError("Payment did not complete — please try again.");
        }
    }, [clientSecret, onSuccess, onError, onProcessing]);

    return (
        <div className="flex flex-1 flex-col px-5 pb-6 pt-5 sm:px-6">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Confirm payment
            </p>
            <p className="mb-5 text-base font-semibold text-foreground">Review and confirm</p>

            <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
                <div className="divide-y divide-border/50 px-4">
                    <div className="flex items-center justify-between py-3">
                        <span className="text-sm text-muted-foreground">Card</span>
                        <span className="text-sm font-medium capitalize text-foreground">
                            {card.brand}
                        </span>
                    </div>
                    <div className="flex items-center justify-between py-3">
                        <span className="text-sm text-muted-foreground">Number</span>
                        <span className="text-sm font-medium text-foreground">
                            •••• •••• •••• {card.last4}
                        </span>
                    </div>
                    <div className="flex items-center justify-between py-3">
                        <span className="text-sm text-muted-foreground">Expires</span>
                        <span className="text-sm font-medium text-foreground">
                            {card.exp_month.toString().padStart(2, "0")}/{card.exp_year}
                        </span>
                    </div>
                </div>

                <div className="flex items-center justify-between bg-muted/20 border-t border-border/60 px-4 py-3.5">
                    <span className="text-sm font-semibold text-foreground">Total</span>
                    <span className="text-xl font-bold tracking-tight text-foreground">
                        {formatCurrency(amount)}{" "}
                        <span className="text-sm font-normal uppercase text-muted-foreground">
                            {currency}
                        </span>
                    </span>
                </div>
            </div>

            <div className="mt-auto flex gap-3 pt-6">
                <button type="button" onClick={onCancel} className="btn-outline min-h-11 flex-1">
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={() => void handlePay()}
                    className="btn-cta min-h-11 flex-1"
                >
                    <CreditCard size={15} />
                    Confirm Payment
                </button>
            </div>
        </div>
    );
}

// ─── Processing animation ─────────────────────────────────────────────────────

function ProcessingStep(): JSX.Element {
    const steps = [
        "Verifying payment details",
        "Authorizing transaction",
        "Confirming your booking",
    ];
    const [done, setDone] = useState(0);

    useEffect(() => {
        if (done >= steps.length) return;
        const t = setTimeout(() => setDone((d) => d + 1), 900);
        return () => clearTimeout(t);
    }, [done, steps.length]);

    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-8 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-cta/20 bg-cta/5">
                <span className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-cta" />
            </div>

            <div>
                <p className="text-lg font-semibold text-foreground">Processing Payment</p>
                <p className="mt-1 text-sm text-muted-foreground">
                    Authorizing your transaction securely
                </p>
            </div>

            <div className="w-full max-w-xs space-y-2.5">
                {steps.map((label, i) => {
                    const isDone = i < done;
                    const isActive = i === done;
                    return (
                        <div
                            key={label}
                            className={`flex items-center gap-3 rounded-lg border px-4 py-2.5 text-left transition-all ${
                                isDone
                                    ? "border-success/30 bg-success/8 text-success"
                                    : isActive
                                      ? "border-cta/30 bg-cta/8 text-cta"
                                      : "border-border/50 bg-muted/20 text-muted-foreground"
                            }`}
                        >
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current/30">
                                {isDone ? (
                                    <Check size={11} />
                                ) : isActive ? (
                                    <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-current/30 border-t-current" />
                                ) : (
                                    <span className="h-1.5 w-1.5 rounded-full bg-current/40" />
                                )}
                            </span>
                            <span className="text-sm font-medium">{label}</span>
                        </div>
                    );
                })}
            </div>

            <p className="text-xs text-muted-foreground">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-cta align-middle mr-1.5" />
                Processing · Please do not close
            </p>
        </div>
    );
}

// ─── Step title ───────────────────────────────────────────────────────────────

function getStepTitle(step: PaymentStep): string {
    if (step.id === "loading") return "Secure checkout";
    if (step.id === "save_card") return "Add a card";
    if (step.id === "confirming") return "Processing…";
    if (step.id === "select_method") return "Confirm payment";
    if (step.id === "success") return "Payment complete";
    if (step.id === "error") return "Payment error";
    return "Secure checkout";
}

// ─── BookingInfo derived from full booking ────────────────────────────────────

interface BookingInfo {
    courtName: string;
    startDatetime: string;
    endDatetime: string;
    originalPrice: number;
    discountAmount: number;
    discountSource: string | null;
    amountDue: number;
}

function parseDiscountAmount(value?: string | null): number {
    if (!value) return 0;
    const parsed = Number(value.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? Math.abs(parsed) : 0;
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export function PaymentModal({ context, onClose, onSuccess }: PaymentModalProps): JSX.Element {
    const [step, setStep] = useState<PaymentStep>({ id: "loading" });
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [paidAmount, setPaidAmount] = useState(0);
    const [paidCurrency, setPaidCurrency] = useState("gbp");

    const { data: paymentMethods, isLoading: methodsLoading } = useListPaymentMethods();
    const createPaymentIntent = useCreatePaymentIntent();
    const createSetupIntent = useCreateSetupIntent();
    const payWithWallet = usePayBookingWithWallet();
    const queryClient = useQueryClient();
    const initRan = useRef(false);

    const bookingId = context.type === "booking" ? context.booking.booking_id : "";
    const clubId = context.type === "booking" ? context.booking.club_id : "";

    const { data: fullBooking, isLoading: bookingLoading } = useGetBooking(bookingId, clubId);
    const { data: profile, isLoading: profileLoading } = useMyProfile();

    const isDataLoading = methodsLoading || bookingLoading || profileLoading;

    const bookingInfo: BookingInfo | null = (() => {
        if (!fullBooking || !profile || context.type !== "booking") return null;
        const me = fullBooking.players.find((p) => p.user_id === profile.id);
        const amountDue = context.booking.amount_due;
        const discountAmount = parseDiscountAmount(me?.discount_amount);
        const hasDiscount = discountAmount > 0;
        const originalPrice = hasDiscount
            ? Number((amountDue + discountAmount).toFixed(2))
            : amountDue;
        return {
            courtName: fullBooking.court_name,
            startDatetime: fullBooking.start_datetime,
            endDatetime: fullBooking.end_datetime,
            originalPrice,
            discountAmount: hasDiscount ? discountAmount : 0,
            discountSource: hasDiscount ? (me?.discount_source ?? null) : null,
            amountDue,
        };
    })();

    useEffect(() => {
        if (isDataLoading || initRan.current) return;
        initRan.current = true;

        if (context.type !== "booking") {
            setStep({ id: "error", message: "Unsupported payment context." });
            return;
        }

        setStep({ id: "choose_method", methods: paymentMethods ?? [] });
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
        bkId: string,
        methodId: string,
        cardOverride?: PaymentMethod
    ) {
        setStep({ id: "loading" });
        try {
            const intent = await createPaymentIntent.mutateAsync({
                booking_id: bkId,
                payment_method_id: methodId,
            });
            setClientSecret(intent.client_secret);
            setPaidAmount(intent.amount);
            setPaidCurrency(intent.currency);

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
        setStep({ id: "confirming" });
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
        setStep({ id: "success", amount: paidAmount, currency: paidCurrency, method: "card" });
    }, [paidAmount, paidCurrency, onSuccess]);

    const title = getStepTitle(step);
    const isSuccess = step.id === "success";

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-label={title}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />

            {/* Dialog shell — two-column on md+, single column on mobile */}
            <div className="relative z-10 flex max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-background shadow-2xl sm:max-h-[calc(100dvh-3rem)]">
                {/* ── LEFT PANEL: Booking info — always visible on md+ ── */}
                <div className="hidden md:flex md:w-[42%] md:shrink-0 flex-col border-r border-border/60 bg-muted/10 px-6 py-6">
                    {bookingInfo ? (
                        <BookingInfoPanel {...bookingInfo} />
                    ) : (
                        <div className="flex flex-1 flex-col gap-4">
                            {/* skeleton */}
                            {[80, 60, 44, 44, 44].map((w, i) => (
                                <div
                                    key={i}
                                    className="h-4 animate-pulse rounded bg-muted"
                                    style={{ width: `${w}%` }}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* ── RIGHT PANEL: Payment flow ── */}
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    {/* Header */}
                    <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-5 py-4 sm:px-6">
                        <div className="flex items-center gap-2.5">
                            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-cta/10 text-cta">
                                <LockKeyhole size={14} />
                            </span>
                            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close"
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Mobile booking summary strip — shown only on mobile during payment steps */}
                    {!isSuccess && bookingInfo ? (
                        <div className="flex md:hidden shrink-0 flex-col gap-1.5 border-b border-border/60 bg-muted/10 px-5 py-3">
                            <p className="text-xs font-medium text-muted-foreground">
                                {bookingInfo.courtName}
                            </p>
                            <div className="flex items-center justify-between">
                                <p className="text-xs text-muted-foreground">
                                    {new Date(bookingInfo.startDatetime).toLocaleDateString(
                                        "en-GB",
                                        {
                                            day: "numeric",
                                            month: "short",
                                            timeZone: "UTC",
                                        }
                                    )}
                                    {" · "}
                                    {new Date(bookingInfo.startDatetime).toLocaleTimeString(
                                        "en-GB",
                                        {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            timeZone: "UTC",
                                        }
                                    )}
                                    {" – "}
                                    {new Date(bookingInfo.endDatetime).toLocaleTimeString("en-GB", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        timeZone: "UTC",
                                    })}
                                </p>
                                <p className="text-sm font-bold text-cta">
                                    {formatCurrency(bookingInfo.amountDue)}
                                </p>
                            </div>
                        </div>
                    ) : null}

                    {/* Step content */}
                    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
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
                        ) : step.id === "confirming" ? (
                            <ProcessingStep />
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
                                    context.type === "booking"
                                        ? (context.booking.amount_due ?? 0)
                                        : 0
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
                                        variables: { borderRadius: "6px", spacingUnit: "4px" },
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
                                amount={paidAmount}
                                currency={paidCurrency}
                                card={step.chosenCard}
                                onSuccess={handleStripeSuccess}
                                onCancel={onClose}
                                onProcessing={() => setStep({ id: "confirming" })}
                                onError={(msg) => setStep({ id: "error", message: msg })}
                            />
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}
