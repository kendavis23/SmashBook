import { type JSX, useCallback, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { CardField, useStripe, type CardFieldInput } from "@stripe/stripe-react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCreatePaymentIntent } from "@repo/player-domain";
import { formatCurrency } from "../../../lib";
import { useThemeColors } from "../../../theme";

type Props = {
    bookingId: string;
    amountDue: number;
    onBack: () => void;
    onProcessing: () => void;
    onSuccess: (amount: number, currency: string) => void;
    onError: (message: string) => void;
};

/**
 * New-card payment entry.
 *
 * PCI scope: card number / CVC / expiry are collected entirely inside Stripe's
 * native <CardField>. Raw PAN never touches JS or our backend — we only ever
 * receive the opaque PaymentIntent client_secret and confirm it via the SDK.
 *
 * Flow:
 *  1. createPaymentIntent({ booking_id, payment_method_id: null }) → client_secret + amount.
 *  2. confirmPayment(client_secret, { paymentMethodType: "Card" }) — Stripe collects the PAN.
 */
export function NewCardStep({
    bookingId,
    amountDue,
    onBack,
    onProcessing,
    onSuccess,
    onError,
}: Props): JSX.Element {
    const colors = useThemeColors();
    const { confirmPayment } = useStripe();
    const createPaymentIntent = useCreatePaymentIntent();

    const [cardComplete, setCardComplete] = useState(false);
    const [isPaying, setIsPaying] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    const handlePay = useCallback(async () => {
        if (!cardComplete) return;
        setLocalError(null);
        setIsPaying(true);

        try {
            // Step 1 — create the PaymentIntent on our backend (no saved method).
            const intent = await createPaymentIntent.mutateAsync({
                booking_id: bookingId,
                payment_method_id: null,
            });

            onProcessing();

            // Step 2 — confirm via Stripe SDK; the PAN never leaves Stripe's native field.
            const { error: stripeError, paymentIntent } = await confirmPayment(
                intent.client_secret,
                { paymentMethodType: "Card" }
            );

            if (stripeError) {
                setIsPaying(false);
                onError(stripeError.message ?? "Payment failed. Please try again.");
                return;
            }

            if (paymentIntent?.status === "Succeeded") {
                onSuccess(intent.amount, intent.currency);
            } else {
                setIsPaying(false);
                onError("Payment did not complete — please try again.");
            }
        } catch (err: unknown) {
            setIsPaying(false);
            const msg =
                (err as { message?: string })?.message ??
                "Unable to start payment — please try again.";
            setLocalError(msg);
            onError(msg);
        }
    }, [
        cardComplete,
        bookingId,
        createPaymentIntent,
        confirmPayment,
        onProcessing,
        onSuccess,
        onError,
    ]);

    const handleCardChange = useCallback((details: CardFieldInput.Details) => {
        setCardComplete(details.complete);
        setLocalError(null);
    }, []);

    return (
        <View className="gap-5">
            <View className="flex-row items-center gap-2">
                <Pressable
                    onPress={onBack}
                    disabled={isPaying}
                    accessibilityRole="button"
                    accessibilityLabel="Back to payment options"
                    hitSlop={8}
                    className="h-8 w-8 items-center justify-center rounded-full bg-muted active:opacity-70 disabled:opacity-40"
                >
                    <Ionicons name="arrow-back" size={16} color={colors.foreground} />
                </Pressable>
                <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Add a card
                </Text>
            </View>

            {/* Security notice */}
            <View className="flex-row items-center gap-2 rounded-xl bg-success/10 px-3.5 py-3">
                <Ionicons name="shield-checkmark" size={15} color={colors.success} />
                <Text className="flex-1 text-[12px] leading-5 text-success">
                    Card details are entered directly into Stripe&apos;s secure field — your card
                    number never touches our servers.
                </Text>
            </View>

            {/* Stripe native CardField */}
            <View>
                <Text className="mb-2 text-[11px] font-bold uppercase tracking-[0.6px] text-muted-foreground">
                    Card details
                </Text>
                <CardField
                    postalCodeEnabled={false}
                    placeholders={{ number: "4242 4242 4242 4242" }}
                    cardStyle={{
                        backgroundColor: colors.card,
                        textColor: colors.foreground,
                        placeholderColor: colors.placeholder,
                        borderColor: cardComplete ? colors.cta : colors.border,
                        borderWidth: cardComplete ? 2 : 1,
                        borderRadius: 14,
                        fontSize: 15,
                    }}
                    style={{ height: 54, width: "100%" }}
                    onCardChange={handleCardChange}
                    accessibilityLabel="Card number, expiry, and CVC"
                />
            </View>

            {localError ? (
                <View className="flex-row items-center gap-2 rounded-xl border border-destructive bg-destructive/10 px-4 py-3">
                    <Ionicons name="alert-circle-outline" size={15} color={colors.destructive} />
                    <Text className="flex-1 text-[13px] font-medium text-destructive">
                        {localError}
                    </Text>
                </View>
            ) : null}

            <Pressable
                onPress={() => void handlePay()}
                disabled={!cardComplete || isPaying}
                accessibilityRole="button"
                accessibilityLabel={`Pay ${formatCurrency(amountDue)}`}
                className="flex-row items-center justify-center gap-2 rounded-[16px] bg-cta py-4 active:opacity-90 disabled:opacity-40"
            >
                {isPaying ? (
                    <ActivityIndicator size="small" color={colors.ctaForeground} />
                ) : (
                    <Ionicons name="lock-closed" size={16} color={colors.ctaForeground} />
                )}
                <Text className="text-[15px] font-bold text-cta-foreground">
                    {isPaying ? "Processing…" : `Pay ${formatCurrency(amountDue)}`}
                </Text>
            </Pressable>

            <Text className="text-center text-[11px] text-muted-foreground">
                PCI DSS compliant · Secured by Stripe · 3D Secure may apply
            </Text>
        </View>
    );
}
