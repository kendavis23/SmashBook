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
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={`Select card ending ${method.last4}`}
            className={`flex-row items-center gap-3 rounded-2xl border px-4 py-3.5 active:opacity-70 ${
                selected ? "border-[#3B82F6] bg-[#EFF6FF]" : "border-[#E5E7EB] bg-white"
            }`}
        >
            {/* Brand chip */}
            <View className="h-8 w-12 items-center justify-center rounded-lg border border-[#E5E7EB] bg-[#F9FAFB]">
                <Text className="text-[9px] font-bold uppercase tracking-wide text-[#374151]">
                    {method.brand.slice(0, 4)}
                </Text>
            </View>

            <View className="flex-1">
                <Text className="text-[14px] font-semibold text-[#111827]">
                    •••• {method.last4}
                </Text>
                <Text className="mt-0.5 text-[12px] text-[#9CA3AF]">
                    Exp {String(method.exp_month).padStart(2, "0")}/{method.exp_year}
                </Text>
            </View>

            {method.is_default && (
                <View className="flex-row items-center gap-1 rounded-full bg-[#EFF6FF] px-2 py-0.5">
                    <Ionicons name="star" size={9} color="#3B82F6" />
                    <Text className="text-[10px] font-bold text-[#3B82F6]">Default</Text>
                </View>
            )}

            <View
                className={`h-5 w-5 rounded-full border-2 items-center justify-center ${
                    selected ? "border-[#3B82F6] bg-[#3B82F6]" : "border-[#D1D5DB] bg-white"
                }`}
            >
                {selected && <Ionicons name="checkmark" size={11} color="#FFFFFF" />}
            </View>
        </Pressable>
    );
}

export function TopUpSheet({ visible, onClose, onSuccess }: Props): JSX.Element {
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
                className="flex-1 bg-black/40"
                accessibilityRole="button"
                accessibilityLabel="Close top-up sheet"
                onPress={handleClose}
            />

            {/* Sheet */}
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
                <View className="rounded-t-[28px] bg-white overflow-hidden">
                    {/* Handle */}
                    <View className="items-center pt-3 pb-1">
                        <View className="h-1 w-10 rounded-full bg-[#E5E7EB]" />
                    </View>

                    {/* Header */}
                    <View className="flex-row items-center justify-between border-b border-[#F3F4F6] px-5 py-4">
                        <View>
                            <Text className="text-[16px] font-bold text-[#111827]">
                                Top up wallet
                            </Text>
                            <Text className="mt-0.5 text-[12px] text-[#6B7280]">
                                Add funds using a saved card
                            </Text>
                        </View>
                        <Pressable
                            onPress={handleClose}
                            disabled={isProcessing}
                            accessibilityRole="button"
                            accessibilityLabel="Close"
                            hitSlop={10}
                            className="h-8 w-8 items-center justify-center rounded-full bg-[#F3F4F6] active:opacity-60 disabled:opacity-40"
                        >
                            <Ionicons name="close" size={16} color="#374151" />
                        </Pressable>
                    </View>

                    <ScrollView
                        contentContainerClassName="px-5 pb-10 pt-5 gap-5"
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Amount input */}
                        <View>
                            <Text className="mb-2 text-[11px] font-bold uppercase tracking-[0.6px] text-[#9CA3AF]">
                                Amount
                            </Text>
                            <View className="flex-row items-center rounded-2xl border border-[#E5E7EB] bg-white px-4 h-14">
                                <Text className="text-[17px] font-semibold text-[#9CA3AF] mr-1">
                                    £
                                </Text>
                                <TextInput
                                    className="flex-1 text-[17px] font-semibold text-[#111827]"
                                    keyboardType="decimal-pad"
                                    placeholder="0.00"
                                    placeholderTextColor="#D1D5DB"
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
                                        <Ionicons name="close-circle" size={18} color="#D1D5DB" />
                                    </Pressable>
                                )}
                            </View>
                            {!!amountInput && !amountValid && (
                                <Text className="mt-1.5 text-[12px] text-red-500">
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
                                            ? "border-[#3B82F6] bg-[#EFF6FF]"
                                            : "border-[#E5E7EB] bg-[#F9FAFB]"
                                    }`}
                                >
                                    <Text
                                        className={`text-[13px] font-semibold ${
                                            amountInput === String(v)
                                                ? "text-[#3B82F6]"
                                                : "text-[#374151]"
                                        }`}
                                    >
                                        £{v}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>

                        {/* Card selection */}
                        <View>
                            <Text className="mb-2 text-[11px] font-bold uppercase tracking-[0.6px] text-[#9CA3AF]">
                                Pay with
                            </Text>
                            {methods.length === 0 ? (
                                <View className="flex-row items-center gap-2 rounded-2xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-4 py-4">
                                    <Ionicons name="card-outline" size={16} color="#9CA3AF" />
                                    <Text className="flex-1 text-[13px] text-[#9CA3AF]">
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
                            <View className="flex-row items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                                <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
                                <Text className="flex-1 text-[13px] font-medium text-red-600">
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
                            className="items-center justify-center rounded-2xl bg-[#10B981] py-4 active:opacity-80 disabled:opacity-40"
                        >
                            {isProcessing ? (
                                <View className="flex-row items-center gap-2">
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                    <Text className="text-[15px] font-semibold text-white">
                                        Processing…
                                    </Text>
                                </View>
                            ) : (
                                <View className="flex-row items-center gap-2">
                                    <Ionicons name="wallet-outline" size={16} color="#FFFFFF" />
                                    <Text className="text-[15px] font-semibold text-white">
                                        Top up
                                        {amountValid
                                            ? ` £${Number.isFinite(parseFloat(amountInput)) ? parseFloat(amountInput).toFixed(2) : "0.00"}`
                                            : ""}
                                    </Text>
                                </View>
                            )}
                        </Pressable>

                        {/* Security footer */}
                        <Text className="text-center text-[11px] text-[#9CA3AF]">
                            PCI DSS compliant · Secured by Stripe
                        </Text>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}
