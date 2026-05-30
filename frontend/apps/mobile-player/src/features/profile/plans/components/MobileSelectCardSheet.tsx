import { Modal, Pressable, ScrollView, Text, View, ActivityIndicator } from "react-native";
import { useState, useEffect, type JSX } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useListPaymentMethods } from "@repo/player-domain";
import type { MembershipPlan } from "@repo/player-domain";
import { formatCurrency } from "../../../../lib";
import { useThemeColors } from "../../../../theme";

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
    const colors = useThemeColors();
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
                className="flex-1"
                style={{ backgroundColor: colors.overlay }}
                accessibilityRole="button"
                accessibilityLabel="Close sheet"
                onPress={() => !isLoading && onClose()}
            />

            {/* Sheet */}
            <View className="rounded-t-[28px] bg-card overflow-hidden">
                {/* Handle */}
                <View className="items-center pt-3 pb-1">
                    <View className="h-1 w-10 rounded-full bg-border" />
                </View>

                {/* Header */}
                <View className="flex-row items-center justify-between px-5 py-4 border-b border-border">
                    <View>
                        <Text className="text-[16px] font-bold text-foreground">
                            {isPlanChange ? "Change your plan" : "Subscribe to plan"}
                        </Text>
                        <Text className="mt-0.5 text-[13px] text-muted-foreground">
                            {plan.name}
                        </Text>
                    </View>
                    <Pressable
                        onPress={() => !isLoading && onClose()}
                        disabled={isLoading}
                        accessibilityRole="button"
                        accessibilityLabel="Close"
                        hitSlop={10}
                        className="h-8 w-8 items-center justify-center rounded-full bg-muted active:opacity-60"
                    >
                        <Ionicons name="close" size={16} color={colors.foreground} />
                    </Pressable>
                </View>

                <ScrollView
                    className="max-h-[70%]"
                    contentContainerClassName="px-5 pb-8 pt-4 gap-4"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Plan summary */}
                    <View className="flex-row items-center justify-between rounded-[16px] bg-secondary border border-cta/30 px-4 py-4">
                        <View className="flex-1 pr-3">
                            <Text className="text-[11px] font-bold uppercase tracking-[0.5px] text-muted-foreground">
                                {isPlanChange ? "Confirm plan change" : "Confirm subscription"}
                            </Text>
                            <Text className="mt-1 text-[15px] font-semibold text-foreground">
                                {plan.name}
                            </Text>
                            {isPlanChange && (
                                <Text className="mt-0.5 text-[12px] text-muted-foreground">
                                    Changes take effect at your next billing cycle.
                                </Text>
                            )}
                            {plan.trial_days > 0 && (
                                <View className="mt-2 flex-row items-center gap-1.5 self-start rounded-full bg-success/10 px-2.5 py-1">
                                    <Ionicons
                                        name="gift-outline"
                                        size={11}
                                        color={colors.success}
                                    />
                                    <Text className="text-[11px] font-semibold text-success">
                                        {plan.trial_days}-day free trial
                                    </Text>
                                </View>
                            )}
                        </View>
                        <View className="items-end">
                            <Text className="text-[20px] font-extrabold text-foreground">
                                {formatCurrency(plan.price)}
                            </Text>
                            <Text className="text-[12px] text-muted-foreground">
                                / {billingPeriod}
                            </Text>
                        </View>
                    </View>

                    {/* Payment card */}
                    <View>
                        <Text className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.6px] text-muted-foreground">
                            Payment card
                        </Text>

                        <View className="overflow-hidden rounded-[16px] bg-card border border-border">
                            {methodsLoading ? (
                                <View className="flex-row items-center gap-3 px-4 py-5">
                                    <ActivityIndicator size="small" color={colors.cta} />
                                    <Text className="text-[14px] text-muted-foreground">
                                        Loading cards…
                                    </Text>
                                </View>
                            ) : methods.length === 0 ? (
                                <View className="px-4 py-5">
                                    <Text className="text-[14px] text-muted-foreground">
                                        No saved cards. Add a card in{" "}
                                        <Text className="font-semibold text-foreground">Cards</Text>{" "}
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
                                                className={`flex-row items-center px-4 py-3.5 active:bg-muted ${
                                                    selected ? "bg-secondary" : ""
                                                }`}
                                            >
                                                {/* Brand chip */}
                                                <View className="mr-3 h-10 w-14 items-center justify-center rounded-lg border border-border bg-card">
                                                    <Text className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                                                        {card.brand.slice(0, 4)}
                                                    </Text>
                                                </View>

                                                <View className="flex-1">
                                                    <Text className="text-[14px] font-medium text-foreground">
                                                        •••• {card.last4}
                                                    </Text>
                                                    <Text className="text-[12px] text-muted-foreground">
                                                        Exp{" "}
                                                        {card.exp_month.toString().padStart(2, "0")}
                                                        /{card.exp_year}
                                                    </Text>
                                                </View>

                                                {card.is_default && (
                                                    <View className="mr-2 rounded-full bg-secondary px-2 py-0.5">
                                                        <Text className="text-[10px] font-semibold text-cta">
                                                            Default
                                                        </Text>
                                                    </View>
                                                )}

                                                <View
                                                    className={`h-5 w-5 items-center justify-center rounded-full border-2 ${
                                                        selected
                                                            ? "border-cta bg-cta"
                                                            : "border-border"
                                                    }`}
                                                >
                                                    {selected && (
                                                        <Ionicons
                                                            name="checkmark"
                                                            size={11}
                                                            color={colors.ctaForeground}
                                                        />
                                                    )}
                                                </View>
                                            </Pressable>
                                            {index < methods.length - 1 && (
                                                <View className="mx-4 h-px bg-muted" />
                                            )}
                                        </View>
                                    );
                                })
                            )}
                        </View>
                    </View>

                    {/* Error */}
                    {!!error && (
                        <View className="flex-row items-center gap-2 rounded-xl border border-destructive bg-destructive/10 px-4 py-3">
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

                    {/* Confirm button */}
                    <Pressable
                        onPress={() => selectedCardId && onConfirm(selectedCardId)}
                        disabled={!selectedCard || isLoading || methodsLoading}
                        accessibilityRole="button"
                        accessibilityLabel={isPlanChange ? "Change plan" : "Confirm subscription"}
                        className="items-center justify-center rounded-xl bg-cta py-4 active:opacity-80 disabled:opacity-50"
                    >
                        {isLoading ? (
                            <View className="flex-row items-center gap-2">
                                <ActivityIndicator size="small" color={colors.ctaForeground} />
                                <Text className="text-[15px] font-semibold text-cta-foreground">
                                    Confirming…
                                </Text>
                            </View>
                        ) : selectedCard ? (
                            <View className="flex-row items-center gap-2">
                                <Ionicons
                                    name="card-outline"
                                    size={16}
                                    color={colors.ctaForeground}
                                />
                                <Text className="text-[15px] font-semibold text-cta-foreground">
                                    {isPlanChange ? "Change plan" : "Confirm"} with ••
                                    {selectedCard.last4}
                                </Text>
                            </View>
                        ) : (
                            <Text className="text-[15px] font-semibold text-cta-foreground">
                                Select a card to continue
                            </Text>
                        )}
                    </Pressable>

                    <Text className="text-center text-[11px] text-muted-foreground">
                        Secured by Stripe · 3D Secure may apply
                    </Text>
                </ScrollView>
            </View>
        </Modal>
    );
}
