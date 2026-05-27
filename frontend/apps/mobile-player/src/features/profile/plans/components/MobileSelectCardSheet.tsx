import { Modal, Pressable, ScrollView, Text, View, ActivityIndicator } from "react-native";
import { useState, useEffect, type JSX } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useListPaymentMethods } from "@repo/player-domain";
import type { MembershipPlan } from "@repo/player-domain";
import { formatCurrency } from "../../../../lib";

type Props = {
    plan: MembershipPlan;
    isPlanChange: boolean;
    visible: boolean;
    isLoading: boolean;
    error: string | null;
    onClose: () => void;
    onConfirm: (paymentMethodId: string) => void;
};

export function MobileSelectCardSheet({
    plan,
    isPlanChange,
    visible,
    isLoading,
    error,
    onClose,
    onConfirm,
}: Props): JSX.Element {
    const { data: methods = [], isLoading: methodsLoading } = useListPaymentMethods();
    const defaultCard = methods.find((m) => m.is_default) ?? methods[0];
    const [selectedCardId, setSelectedCardId] = useState<string | null>(defaultCard?.id ?? null);

    useEffect(() => {
        if (!selectedCardId && defaultCard) {
            setSelectedCardId(defaultCard.id);
        }
    }, [defaultCard, selectedCardId]);

    const selectedCard = methods.find((m) => m.id === selectedCardId) ?? null;
    const billingPeriod = plan.billing_period === "annual" ? "year" : "month";

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={() => !isLoading && onClose()}
        >
            <Pressable
                className="flex-1 bg-black/40"
                accessibilityRole="button"
                accessibilityLabel="Close sheet"
                onPress={() => !isLoading && onClose()}
            />

            {/* Sheet */}
            <View className="rounded-t-[28px] bg-white overflow-hidden">
                {/* Handle */}
                <View className="items-center pt-3 pb-1">
                    <View className="h-1 w-10 rounded-full bg-[#E5E7EB]" />
                </View>

                {/* Header */}
                <View className="flex-row items-center justify-between px-5 py-4 border-b border-[#F3F4F6]">
                    <View>
                        <Text className="text-[16px] font-bold text-[#111827]">
                            {isPlanChange ? "Change your plan" : "Subscribe to plan"}
                        </Text>
                        <Text className="mt-0.5 text-[13px] text-[#6B7280]">{plan.name}</Text>
                    </View>
                    <Pressable
                        onPress={() => !isLoading && onClose()}
                        disabled={isLoading}
                        accessibilityRole="button"
                        accessibilityLabel="Close"
                        hitSlop={10}
                        className="h-8 w-8 items-center justify-center rounded-full bg-[#F3F4F6] active:opacity-60"
                    >
                        <Ionicons name="close" size={16} color="#374151" />
                    </Pressable>
                </View>

                <ScrollView
                    className="max-h-[70%]"
                    contentContainerClassName="px-5 pb-8 pt-4 gap-4"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Plan summary */}
                    <View className="flex-row items-center justify-between rounded-[16px] bg-[#F8FAFF] border border-blue-100 px-4 py-4">
                        <View className="flex-1 pr-3">
                            <Text className="text-[11px] font-bold uppercase tracking-[0.5px] text-[#9CA3AF]">
                                {isPlanChange ? "Confirm plan change" : "Confirm subscription"}
                            </Text>
                            <Text className="mt-1 text-[15px] font-semibold text-[#111827]">
                                {plan.name}
                            </Text>
                            {isPlanChange && (
                                <Text className="mt-0.5 text-[12px] text-[#6B7280]">
                                    Changes take effect at your next billing cycle.
                                </Text>
                            )}
                            {plan.trial_days > 0 && (
                                <View className="mt-2 flex-row items-center gap-1.5 self-start rounded-full bg-green-50 px-2.5 py-1">
                                    <Ionicons name="gift-outline" size={11} color="#22C55E" />
                                    <Text className="text-[11px] font-semibold text-green-600">
                                        {plan.trial_days}-day free trial
                                    </Text>
                                </View>
                            )}
                        </View>
                        <View className="items-end">
                            <Text className="text-[20px] font-extrabold text-[#111827]">
                                {formatCurrency(plan.price)}
                            </Text>
                            <Text className="text-[12px] text-[#9CA3AF]">/ {billingPeriod}</Text>
                        </View>
                    </View>

                    {/* Payment card */}
                    <View>
                        <Text className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.6px] text-[#9CA3AF]">
                            Payment card
                        </Text>

                        <View className="overflow-hidden rounded-[16px] bg-white border border-[#F3F4F6]">
                            {methodsLoading ? (
                                <View className="flex-row items-center gap-3 px-4 py-5">
                                    <ActivityIndicator size="small" color="#3B82F6" />
                                    <Text className="text-[14px] text-[#6B7280]">
                                        Loading cards…
                                    </Text>
                                </View>
                            ) : methods.length === 0 ? (
                                <View className="px-4 py-5">
                                    <Text className="text-[14px] text-[#6B7280]">
                                        No saved cards. Add a card in{" "}
                                        <Text className="font-semibold text-[#111827]">Cards</Text>{" "}
                                        first.
                                    </Text>
                                </View>
                            ) : (
                                methods.map((card, index) => {
                                    const selected = selectedCardId === card.id;
                                    return (
                                        <View key={card.id}>
                                            <Pressable
                                                onPress={() => setSelectedCardId(card.id)}
                                                accessibilityRole="radio"
                                                accessibilityState={{ checked: selected }}
                                                accessibilityLabel={`Card ending ${card.last4}`}
                                                className={`flex-row items-center px-4 py-3.5 active:bg-[#F9FAFB] ${
                                                    selected ? "bg-[#EFF6FF]" : ""
                                                }`}
                                            >
                                                {/* Brand chip */}
                                                <View className="mr-3 h-10 w-14 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white">
                                                    <Text className="text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">
                                                        {card.brand.slice(0, 4)}
                                                    </Text>
                                                </View>

                                                <View className="flex-1">
                                                    <Text className="text-[14px] font-medium text-[#111827]">
                                                        •••• {card.last4}
                                                    </Text>
                                                    <Text className="text-[12px] text-[#9CA3AF]">
                                                        Exp{" "}
                                                        {card.exp_month.toString().padStart(2, "0")}
                                                        /{card.exp_year}
                                                    </Text>
                                                </View>

                                                {card.is_default && (
                                                    <View className="mr-2 rounded-full bg-[#EFF6FF] px-2 py-0.5">
                                                        <Text className="text-[10px] font-semibold text-[#3B82F6]">
                                                            Default
                                                        </Text>
                                                    </View>
                                                )}

                                                <View
                                                    className={`h-5 w-5 items-center justify-center rounded-full border-2 ${
                                                        selected
                                                            ? "border-[#3B82F6] bg-[#3B82F6]"
                                                            : "border-[#D1D5DB]"
                                                    }`}
                                                >
                                                    {selected && (
                                                        <Ionicons
                                                            name="checkmark"
                                                            size={11}
                                                            color="#FFFFFF"
                                                        />
                                                    )}
                                                </View>
                                            </Pressable>
                                            {index < methods.length - 1 && (
                                                <View className="mx-4 h-px bg-[#F3F4F6]" />
                                            )}
                                        </View>
                                    );
                                })
                            )}
                        </View>
                    </View>

                    {/* Error */}
                    {!!error && (
                        <View className="flex-row items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                            <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
                            <Text className="flex-1 text-[13px] font-medium text-red-600">
                                {error}
                            </Text>
                        </View>
                    )}

                    {/* Confirm button */}
                    <Pressable
                        onPress={() => selectedCardId && onConfirm(selectedCardId)}
                        disabled={!selectedCard || isLoading || methodsLoading}
                        accessibilityRole="button"
                        accessibilityLabel={isPlanChange ? "Change plan" : "Confirm subscription"}
                        className="items-center justify-center rounded-xl bg-[#3B82F6] py-4 active:opacity-80 disabled:opacity-50"
                    >
                        {isLoading ? (
                            <View className="flex-row items-center gap-2">
                                <ActivityIndicator size="small" color="#FFFFFF" />
                                <Text className="text-[15px] font-semibold text-white">
                                    Confirming…
                                </Text>
                            </View>
                        ) : selectedCard ? (
                            <View className="flex-row items-center gap-2">
                                <Ionicons name="card-outline" size={16} color="#FFFFFF" />
                                <Text className="text-[15px] font-semibold text-white">
                                    {isPlanChange ? "Change plan" : "Confirm"} with ••
                                    {selectedCard.last4}
                                </Text>
                            </View>
                        ) : (
                            <Text className="text-[15px] font-semibold text-white">
                                Select a card to continue
                            </Text>
                        )}
                    </Pressable>

                    <Text className="text-center text-[11px] text-[#9CA3AF]">
                        Secured by Stripe · 3D Secure may apply
                    </Text>
                </ScrollView>
            </View>
        </Modal>
    );
}
