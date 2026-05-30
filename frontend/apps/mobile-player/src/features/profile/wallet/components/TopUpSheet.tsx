/**
 * TopUpSheet — PCI-safe wallet top-up via Stripe React Native SDK.
 *
 * Flow:
 *  1. Player enters an amount (minimum £1.00) and picks a saved card.
 *  2. On "Top up": call useTopUpWallet() → receive a PaymentIntent client_secret.
 *  3. Call stripe.confirmPayment() with the client_secret + saved PaymentMethod ID.
 *  4. On success → notify parent to refetch wallet.
 *
 * Raw card data never enters this component.
 */
import { type JSX, useCallback, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { useStripe } from "@stripe/stripe-react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTopUpWallet, useListPaymentMethods } from "@repo/player-domain";
import type { PaymentMethod } from "@repo/player-domain";
import { useThemeColors } from "../../../../theme";

type Props = {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
};

function CardOption({
    method,
    selected,
    onPress,
}: {
    method: PaymentMethod;
    selected: boolean;
    onPress: () => void;
}): JSX.Element {
    const colors = useThemeColors();
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={`Select card ending ${method.last4}`}
            className={`flex-row items-center gap-3 rounded-2xl border px-4 py-3.5 active:opacity-70 ${
                selected ? "border-cta bg-secondary" : "border-border bg-card"
            }`}
        >
            {/* Brand chip */}
            <View className="h-8 w-12 items-center justify-center rounded-lg border border-border bg-muted">
                <Text className="text-[9px] font-bold uppercase tracking-wide text-foreground">
                    {method.brand.slice(0, 4)}
                </Text>
            </View>

            <View className="flex-1">
                <Text className="text-[14px] font-semibold text-foreground">
                    •••• {method.last4}
                </Text>
                <Text className="mt-0.5 text-[12px] text-muted-foreground">
                    Exp {String(method.exp_month).padStart(2, "0")}/{method.exp_year}
                </Text>
            </View>

            {method.is_default && (
                <View className="flex-row items-center gap-1 rounded-full bg-secondary px-2 py-0.5">
                    <Ionicons name="star" size={9} color={colors.cta} />
                    <Text className="text-[10px] font-bold text-cta">Default</Text>
                </View>
            )}

            <View
                className={`h-5 w-5 rounded-full border-2 items-center justify-center ${
                    selected ? "border-cta bg-cta" : "border-border bg-card"
                }`}
            >
                {selected && <Ionicons name="checkmark" size={11} color={colors.ctaForeground} />}
            </View>
        </Pressable>
    );
}

export function TopUpSheet({ visible, onClose, onSuccess }: Props): JSX.Element {
    const colors = useThemeColors();
    const { confirmPayment } = useStripe();
    const topUp = useTopUpWallet();
    const { data: methods = [] } = useListPaymentMethods();

    const defaultMethod = methods.find((m) => m.is_default) ?? methods[0];
    const [amountInput, setAmountInput] = useState("");
    const [selectedId, setSelectedId] = useState<string>(defaultMethod?.id ?? "");
    const [error, setError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Derive pence value
    const amountPence = Math.round(parseFloat(amountInput || "0") * 100);
    const amountValid = amountPence >= 100; // minimum £1.00

    const handleClose = useCallback(() => {
        if (isProcessing) return;
        setAmountInput("");
        setError(null);
        setSelectedId(defaultMethod?.id ?? "");
        onClose();
    }, [isProcessing, defaultMethod, onClose]);

    const handleTopUp = useCallback(async () => {
        if (!amountValid || !selectedId) return;

        setError(null);
        setIsProcessing(true);

        try {
            // Step 1 — create PaymentIntent on our backend
            const result = await topUp.mutateAsync({
                amount_pence: amountPence,
                payment_method_id: selectedId,
            });

            // Step 2 — confirm via Stripe SDK (native, no raw PAN)
            const { error: stripeError } = await confirmPayment(result.client_secret, {
                paymentMethodType: "Card",
                paymentMethodData: {
                    paymentMethodId: selectedId,
                },
            });

            if (stripeError) {
                setError(stripeError.message ?? "Payment failed. Please try again.");
                setIsProcessing(false);
                return;
            }

            // Success — reset and notify parent
            setAmountInput("");
            setError(null);
            onSuccess();
        } catch (err: unknown) {
            setError((err as { message?: string })?.message ?? "Top-up failed. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    }, [amountValid, selectedId, amountPence, topUp, confirmPayment, onSuccess]);

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
            {/* Backdrop */}
            <Pressable
                className="flex-1"
                style={{ backgroundColor: colors.overlay }}
                accessibilityRole="button"
                accessibilityLabel="Close top-up sheet"
                onPress={handleClose}
            />

            {/* Sheet */}
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
                <View className="rounded-t-[28px] bg-card overflow-hidden">
                    {/* Handle */}
                    <View className="items-center pt-3 pb-1">
                        <View className="h-1 w-10 rounded-full bg-border" />
                    </View>

                    {/* Header */}
                    <View className="flex-row items-center justify-between border-b border-border px-5 py-4">
                        <View>
                            <Text className="text-[16px] font-bold text-foreground">
                                Top up wallet
                            </Text>
                            <Text className="mt-0.5 text-[12px] text-muted-foreground">
                                Add funds using a saved card
                            </Text>
                        </View>
                        <Pressable
                            onPress={handleClose}
                            disabled={isProcessing}
                            accessibilityRole="button"
                            accessibilityLabel="Close"
                            hitSlop={10}
                            className="h-8 w-8 items-center justify-center rounded-full bg-muted active:opacity-60 disabled:opacity-40"
                        >
                            <Ionicons name="close" size={16} color={colors.foreground} />
                        </Pressable>
                    </View>

                    <ScrollView
                        contentContainerClassName="px-5 pb-10 pt-5 gap-5"
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Amount input */}
                        <View>
                            <Text className="mb-2 text-[11px] font-bold uppercase tracking-[0.6px] text-muted-foreground">
                                Amount
                            </Text>
                            <View className="flex-row items-center rounded-2xl border border-border bg-card px-4 h-14">
                                <Text className="text-[17px] font-semibold text-muted-foreground mr-1">
                                    £
                                </Text>
                                <TextInput
                                    className="flex-1 text-[17px] font-semibold text-foreground"
                                    keyboardType="decimal-pad"
                                    placeholder="0.00"
                                    placeholderTextColor={colors.placeholder}
                                    value={amountInput}
                                    onChangeText={(v) => {
                                        setAmountInput(v);
                                        setError(null);
                                    }}
                                    accessibilityLabel="Top-up amount in pounds"
                                />
                                {!!amountInput && (
                                    <Pressable
                                        onPress={() => setAmountInput("")}
                                        accessibilityRole="button"
                                        accessibilityLabel="Clear amount"
                                        hitSlop={8}
                                    >
                                        <Ionicons
                                            name="close-circle"
                                            size={18}
                                            color={colors.placeholder}
                                        />
                                    </Pressable>
                                )}
                            </View>
                            {!!amountInput && !amountValid && (
                                <Text className="mt-1.5 text-[12px] text-destructive">
                                    Minimum top-up is £1.00
                                </Text>
                            )}
                        </View>

                        {/* Quick amount pills */}
                        <View className="flex-row gap-2 flex-wrap">
                            {[5, 10, 20, 50].map((v) => (
                                <Pressable
                                    key={v}
                                    onPress={() => setAmountInput(String(v))}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Set amount to £${v}`}
                                    className={`flex-row items-center rounded-full border px-4 py-2 active:opacity-70 ${
                                        amountInput === String(v)
                                            ? "border-cta bg-secondary"
                                            : "border-border bg-muted"
                                    }`}
                                >
                                    <Text
                                        className={`text-[13px] font-semibold ${
                                            amountInput === String(v)
                                                ? "text-cta"
                                                : "text-foreground"
                                        }`}
                                    >
                                        £{v}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>

                        {/* Card selection */}
                        <View>
                            <Text className="mb-2 text-[11px] font-bold uppercase tracking-[0.6px] text-muted-foreground">
                                Pay with
                            </Text>
                            {methods.length === 0 ? (
                                <View className="flex-row items-center gap-2 rounded-2xl border border-dashed border-border bg-muted px-4 py-4">
                                    <Ionicons
                                        name="card-outline"
                                        size={16}
                                        color={colors.placeholder}
                                    />
                                    <Text className="flex-1 text-[13px] text-muted-foreground">
                                        No saved cards. Add a card from the Cards screen first.
                                    </Text>
                                </View>
                            ) : (
                                <View className="gap-2">
                                    {methods.map((m) => (
                                        <CardOption
                                            key={m.id}
                                            method={m}
                                            selected={selectedId === m.id}
                                            onPress={() => setSelectedId(m.id)}
                                        />
                                    ))}
                                </View>
                            )}
                        </View>

                        {/* Error banner */}
                        {!!error && (
                            <View className="flex-row items-center gap-2 rounded-2xl border border-destructive bg-destructive/10 px-4 py-3">
                                <Ionicons
                                    name="alert-circle-outline"
                                    size={16}
                                    color={colors.destructive}
                                />
                                <Text className="flex-1 text-[13px] font-medium text-destructive">
                                    {error}
                                </Text>
                            </View>
                        )}

                        {/* Top-up button */}
                        <Pressable
                            onPress={() => void handleTopUp()}
                            disabled={
                                isProcessing || !amountValid || !selectedId || methods.length === 0
                            }
                            accessibilityRole="button"
                            accessibilityLabel="Confirm top-up"
                            className="items-center justify-center rounded-2xl bg-success py-4 active:opacity-80 disabled:opacity-40"
                        >
                            {isProcessing ? (
                                <View className="flex-row items-center gap-2">
                                    <ActivityIndicator size="small" color={colors.ctaForeground} />
                                    <Text className="text-[15px] font-semibold text-cta-foreground">
                                        Processing…
                                    </Text>
                                </View>
                            ) : (
                                <View className="flex-row items-center gap-2">
                                    <Ionicons
                                        name="wallet-outline"
                                        size={16}
                                        color={colors.ctaForeground}
                                    />
                                    <Text className="text-[15px] font-semibold text-cta-foreground">
                                        Top up
                                        {amountValid
                                            ? ` £${Number.isFinite(parseFloat(amountInput)) ? parseFloat(amountInput).toFixed(2) : "0.00"}`
                                            : ""}
                                    </Text>
                                </View>
                            )}
                        </Pressable>

                        {/* Security footer */}
                        <Text className="text-center text-[11px] text-muted-foreground">
                            PCI DSS compliant · Secured by Stripe
                        </Text>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}
