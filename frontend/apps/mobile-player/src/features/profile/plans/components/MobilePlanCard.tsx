import { Pressable, Text, View } from "react-native";
import type { JSX } from "react";
import { Ionicons } from "@expo/vector-icons";
import type { MembershipPlan } from "@repo/player-domain";

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "GBP",
        minimumFractionDigits: 2,
    }).format(amount);
}

type Props = {
    plan: MembershipPlan;
    isCurrent: boolean;
    hasActiveMembership: boolean;
    currentPlanPrice: number | null;
    onSelect: () => void;
};

export function MobilePlanCard({
    plan,
    isCurrent,
    hasActiveMembership,
    currentPlanPrice,
    onSelect,
}: Props): JSX.Element {
    const billingPeriod = plan.billing_period === "annual" ? "year" : "month";

    const isUpgrade =
        hasActiveMembership &&
        !isCurrent &&
        currentPlanPrice !== null &&
        plan.price > currentPlanPrice;
    const isDowngrade =
        hasActiveMembership &&
        !isCurrent &&
        currentPlanPrice !== null &&
        plan.price < currentPlanPrice;
    const isSwitchSameTier =
        hasActiveMembership &&
        !isCurrent &&
        currentPlanPrice !== null &&
        plan.price === currentPlanPrice;

    const perks = [
        plan.booking_credits_per_period !== null &&
            `${plan.booking_credits_per_period} booking credits`,
        plan.guest_passes_per_period !== null && `${plan.guest_passes_per_period} guest passes`,
        plan.discount_pct !== null && `${plan.discount_pct}% booking discount`,
        plan.priority_booking_days !== null && `${plan.priority_booking_days}-day priority window`,
        plan.trial_days > 0 && `${plan.trial_days}-day free trial`,
    ].filter(Boolean) as string[];

    function getButtonLabel(): string {
        if (isCurrent) return "Current plan";
        if (isUpgrade) return "Upgrade to this plan";
        if (isDowngrade) return "Downgrade to this plan";
        if (isSwitchSameTier) return "Switch to this plan";
        return "Select this plan";
    }

    return (
        <View
            className={`mb-3 overflow-hidden rounded-[20px] bg-white shadow-sm ${
                isCurrent ? "border-2 border-[#3B82F6]" : "border border-[#F3F4F6]"
            }`}
        >
            {/* Recommended badge */}
            {isUpgrade && (
                <View className="bg-[#3B82F6] px-4 py-1.5">
                    <Text className="text-center text-[11px] font-bold uppercase tracking-[0.5px] text-white">
                        Recommended
                    </Text>
                </View>
            )}

            <View className="p-5">
                {/* Plan name + current badge */}
                <View className="mb-3 flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                        <Text className="text-[17px] font-bold text-[#111827]">{plan.name}</Text>
                        {!!plan.description && (
                            <Text className="mt-0.5 text-[13px] leading-5 text-[#6B7280]">
                                {plan.description}
                            </Text>
                        )}
                    </View>
                    {isCurrent && (
                        <View className="flex-row items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-1">
                            <Ionicons name="checkmark-circle" size={11} color="#22C55E" />
                            <Text className="text-[10px] font-bold text-green-600">Current</Text>
                        </View>
                    )}
                </View>

                {/* Price */}
                <View className="mb-4 flex-row items-end gap-1.5">
                    <Text className="text-[24px] font-extrabold text-[#111827]">
                        {formatCurrency(plan.price)}
                    </Text>
                    <Text className="mb-0.5 text-[13px] text-[#9CA3AF]">/ {billingPeriod}</Text>
                    {isUpgrade && currentPlanPrice !== null && (
                        <View className="mb-1 ml-1 flex-row items-center gap-0.5 rounded-full bg-blue-50 px-2 py-0.5">
                            <Ionicons name="arrow-up" size={10} color="#3B82F6" />
                            <Text className="text-[11px] font-semibold text-[#3B82F6]">
                                {formatCurrency(Math.abs(plan.price - currentPlanPrice))} more
                            </Text>
                        </View>
                    )}
                    {isDowngrade && currentPlanPrice !== null && (
                        <View className="mb-1 ml-1 flex-row items-center gap-0.5 rounded-full bg-[#F9FAFB] px-2 py-0.5">
                            <Ionicons name="arrow-down" size={10} color="#6B7280" />
                            <Text className="text-[11px] font-medium text-[#6B7280]">
                                {formatCurrency(Math.abs(currentPlanPrice - plan.price))} less
                            </Text>
                        </View>
                    )}
                </View>

                {/* Perks */}
                {perks.length > 0 && (
                    <View className="mb-5 gap-2">
                        {perks.map((perk) => (
                            <View key={perk} className="flex-row items-center gap-2.5">
                                <View className="h-5 w-5 items-center justify-center rounded-full bg-[#EFF6FF]">
                                    <Ionicons name="checkmark" size={12} color="#3B82F6" />
                                </View>
                                <Text className="text-[13px] text-[#6B7280]">{perk}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* CTA button */}
                {isCurrent ? (
                    <View className="items-center justify-center rounded-xl border border-green-200 bg-green-50 py-3">
                        <View className="flex-row items-center gap-1.5">
                            <Ionicons name="checkmark-circle" size={15} color="#22C55E" />
                            <Text className="text-[14px] font-semibold text-green-600">
                                Current plan
                            </Text>
                        </View>
                    </View>
                ) : (
                    <Pressable
                        onPress={onSelect}
                        accessibilityRole="button"
                        accessibilityLabel={getButtonLabel()}
                        className={`items-center justify-center rounded-xl py-3.5 active:opacity-75 ${
                            isUpgrade ? "bg-[#3B82F6]" : "border border-[#E5E7EB] bg-[#F9FAFB]"
                        }`}
                    >
                        <View className="flex-row items-center gap-2">
                            {isUpgrade && <Ionicons name="arrow-up" size={14} color="#FFFFFF" />}
                            {isDowngrade && (
                                <Ionicons name="arrow-down" size={14} color="#374151" />
                            )}
                            <Text
                                className={`text-[14px] font-semibold ${
                                    isUpgrade ? "text-white" : "text-[#374151]"
                                }`}
                            >
                                {getButtonLabel()}
                            </Text>
                        </View>
                    </Pressable>
                )}
            </View>
        </View>
    );
}
