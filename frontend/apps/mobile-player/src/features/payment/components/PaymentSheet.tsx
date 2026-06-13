import { type JSX, useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStripe } from "@stripe/stripe-react-native";
import { useQueryClient } from "@tanstack/react-query";
import {
    useCreatePaymentIntent,
    useGetBooking,
    useListPaymentMethods,
    useMyProfile,
    usePayBookingWithWallet,
} from "@repo/player-domain";
import type { PaymentSheetProps, PaymentStep } from "../types";
import { useThemeColors } from "../../../theme";
import { ChooseMethodStep } from "./ChooseMethodStep";
import { NewCardStep } from "./NewCardStep";
import { PaymentSuccessStep } from "./PaymentSuccessStep";
import { PaymentBookingInfo, type BookingInfo } from "./PaymentBookingInfo";

function getStepTitle(step: PaymentStep): string {
    switch (step.id) {
        case "new_card":
            return "Add a card";
        case "confirming":
            return "Processing…";
        case "success":
            return "Payment complete";
        case "error":
            return "Payment error";
        default:
            return "Secure checkout";
    }
}

function parseDiscountAmount(value?: string | null): number {
    if (!value) return 0;
    const parsed = Number(value.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? Math.abs(parsed) : 0;
}

export function PaymentSheet({
    visible,
    context,
    onClose,
    onSuccess,
}: PaymentSheetProps): JSX.Element {
    const colors = useThemeColors();
    const queryClient = useQueryClient();
    const { confirmPayment } = useStripe();

    const [step, setStep] = useState<PaymentStep>({ id: "loading" });
    const initRan = useRef(false);

    const bookingId = context?.booking.booking_id ?? "";
    const clubId = context?.booking.club_id ?? "";

    const { data: methods, isLoading: methodsLoading } = useListPaymentMethods();
    const { data: fullBooking, isLoading: bookingLoading } = useGetBooking(bookingId, clubId);
    const { data: profile, isLoading: profileLoading } = useMyProfile();
    const createPaymentIntent = useCreatePaymentIntent();
    const payWithWallet = usePayBookingWithWallet();

    const isDataLoading = methodsLoading || bookingLoading || profileLoading;

    const bookingInfo: BookingInfo | null = (() => {
        if (!context || !fullBooking || !profile) return null;
        const me = fullBooking.players.find((p) => p.user_id === profile.id);
        const amountDue = Number(context.booking.amount_due);
        const discountAmount = parseDiscountAmount(me?.discount_amount);
        const hasDiscount = discountAmount > 0;
        return {
            courtName: fullBooking.court_name,
            startDatetime: fullBooking.start_datetime,
            endDatetime: fullBooking.end_datetime,
            originalPrice: hasDiscount
                ? Number((amountDue + discountAmount).toFixed(2))
                : amountDue,
            discountAmount: hasDiscount ? discountAmount : 0,
            discountSource: hasDiscount ? (me?.discount_source ?? null) : null,
            amountDue,
        };
    })();

    const amountDue = context ? Number(context.booking.amount_due) : 0;

    // Reset the flow each time the sheet opens for a fresh booking.
    useEffect(() => {
        if (!visible) {
            initRan.current = false;
            setStep({ id: "loading" });
        }
    }, [visible]);

    useEffect(() => {
        if (!visible || isDataLoading || initRan.current) return;
        initRan.current = true;
        if (!context) {
            setStep({ id: "error", message: "Unsupported payment context." });
            return;
        }
        setStep({ id: "choose", methods: methods ?? [] });
    }, [visible, isDataLoading, context, methods]);

    const invalidateBookings = useCallback(() => {
        void queryClient.invalidateQueries({ queryKey: ["player", "bookings"] });
    }, [queryClient]);

    // ── Wallet ──
    const handlePayWithWallet = useCallback(() => {
        if (!context) return;
        setStep({ id: "confirming" });
        payWithWallet.mutate(
            { booking_id: context.booking.booking_id },
            {
                onSuccess: () => {
                    invalidateBookings();
                    onSuccess?.();
                    setStep({
                        id: "success",
                        amount: amountDue,
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
    }, [context, payWithWallet, amountDue, invalidateBookings, onSuccess]);

    // ── Saved card ──
    const payWithSavedCard = useCallback(
        async (methodId: string) => {
            if (!context) return;
            setStep({ id: "confirming" });
            try {
                const intent = await createPaymentIntent.mutateAsync({
                    booking_id: context.booking.booking_id,
                    payment_method_id: methodId,
                });

                const { error: stripeError, paymentIntent } = await confirmPayment(
                    intent.client_secret,
                    {
                        paymentMethodType: "Card",
                        paymentMethodData: { paymentMethodId: methodId },
                    }
                );

                if (stripeError) {
                    setStep({ id: "error", message: stripeError.message ?? "Payment failed." });
                    return;
                }

                if (paymentIntent?.status === "Succeeded") {
                    invalidateBookings();
                    onSuccess?.();
                    setStep({
                        id: "success",
                        amount: intent.amount,
                        currency: intent.currency,
                        method: "card",
                    });
                } else {
                    setStep({
                        id: "error",
                        message: "Payment did not complete — please try again.",
                    });
                }
            } catch (err) {
                setStep({
                    id: "error",
                    message:
                        (err as { message?: string })?.message ??
                        "Unable to start payment — please try again.",
                });
            }
        },
        [context, createPaymentIntent, confirmPayment, invalidateBookings, onSuccess]
    );

    const handlePayWithCard = useCallback(
        (methodId: string | null) => {
            if (methodId) {
                void payWithSavedCard(methodId);
            } else {
                setStep({ id: "new_card" });
            }
        },
        [payWithSavedCard]
    );

    // ── New card success (from NewCardStep) ──
    const handleNewCardSuccess = useCallback(
        (amount: number, currency: string) => {
            invalidateBookings();
            onSuccess?.();
            setStep({ id: "success", amount, currency, method: "card" });
        },
        [invalidateBookings, onSuccess]
    );

    const title = getStepTitle(step);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View className="flex-1 bg-background">
                {/* Header */}
                <View className="flex-row items-center justify-between bg-card px-5 pb-4 pt-5 shadow-sm">
                    <View className="flex-row items-center gap-3">
                        <View className="h-10 w-10 items-center justify-center rounded-[14px] bg-secondary">
                            <Ionicons name="lock-closed" size={18} color={colors.cta} />
                        </View>
                        <View>
                            <Text className="text-[18px] font-bold text-foreground">{title}</Text>
                            <Text className="text-[12px] text-muted-foreground">
                                Complete your booking payment
                            </Text>
                        </View>
                    </View>
                    <Pressable
                        onPress={onClose}
                        disabled={step.id === "confirming"}
                        accessibilityRole="button"
                        accessibilityLabel="Close"
                        className="h-10 w-10 items-center justify-center rounded-full bg-muted active:opacity-75 disabled:opacity-40"
                    >
                        <Ionicons name="close" size={20} color={colors.foreground} />
                    </Pressable>
                </View>

                <ScrollView
                    contentContainerClassName="pb-[40px] gap-5 pt-5 px-5"
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Booking summary — hidden on success/error full-screen states */}
                    {bookingInfo && step.id !== "success" && step.id !== "error" ? (
                        <PaymentBookingInfo info={bookingInfo} />
                    ) : null}

                    {step.id === "loading" ? (
                        <View className="items-center justify-center gap-3 py-12">
                            <ActivityIndicator size="large" color={colors.cta} />
                            <Text className="text-[13px] text-muted-foreground">
                                Setting up a secure session…
                            </Text>
                        </View>
                    ) : step.id === "confirming" ? (
                        <View className="items-center justify-center gap-3 py-12">
                            <ActivityIndicator size="large" color={colors.cta} />
                            <Text className="text-[15px] font-semibold text-foreground">
                                Processing payment
                            </Text>
                            <Text className="text-[13px] text-muted-foreground">
                                Authorizing your transaction securely · Please do not close
                            </Text>
                        </View>
                    ) : step.id === "error" ? (
                        <View className="gap-4">
                            <View className="flex-row items-center gap-3 rounded-[16px] border border-destructive bg-destructive/10 px-4 py-4">
                                <Ionicons
                                    name="alert-circle-outline"
                                    size={20}
                                    color={colors.destructive}
                                />
                                <Text className="flex-1 text-[14px] font-medium text-destructive">
                                    {step.message}
                                </Text>
                            </View>
                            <Pressable
                                onPress={() => setStep({ id: "choose", methods: methods ?? [] })}
                                accessibilityRole="button"
                                accessibilityLabel="Try again"
                                className="items-center justify-center rounded-[16px] border border-border bg-card py-4 active:opacity-75"
                            >
                                <Text className="text-[15px] font-bold text-foreground">
                                    Try again
                                </Text>
                            </Pressable>
                            <Pressable
                                onPress={onClose}
                                accessibilityRole="button"
                                accessibilityLabel="Close"
                                className="items-center justify-center py-2 active:opacity-75"
                            >
                                <Text className="text-[14px] font-semibold text-muted-foreground">
                                    Close
                                </Text>
                            </Pressable>
                        </View>
                    ) : step.id === "success" ? (
                        <PaymentSuccessStep
                            amount={step.amount}
                            currency={step.currency}
                            method={step.method}
                            onDone={onClose}
                        />
                    ) : step.id === "choose" ? (
                        <ChooseMethodStep
                            methods={step.methods}
                            amountDue={amountDue}
                            isPreparing={createPaymentIntent.isPending || payWithWallet.isPending}
                            onPayWithCard={handlePayWithCard}
                            onPayWithWallet={handlePayWithWallet}
                        />
                    ) : step.id === "new_card" ? (
                        <NewCardStep
                            bookingId={bookingId}
                            amountDue={amountDue}
                            onBack={() => setStep({ id: "choose", methods: methods ?? [] })}
                            onProcessing={() => setStep({ id: "confirming" })}
                            onSuccess={handleNewCardSuccess}
                            onError={(message) => setStep({ id: "error", message })}
                        />
                    ) : null}
                </ScrollView>
            </View>
        </Modal>
    );
}
