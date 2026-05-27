import { useCallback, useState, type JSX } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@repo/auth";
import {
    useListMembershipPlans,
    useMyMembership,
    useSubscribeToMembership,
} from "@repo/player-domain";
import type { MembershipPlan } from "@repo/player-domain";
import { MobilePlanCard } from "../components/MobilePlanCard";
import { MobileSelectCardSheet } from "../components/MobileSelectCardSheet";

type SuccessState = { plan: MembershipPlan; wasPlanChange: boolean } | null;

export function MembershipPlansScreen(): JSX.Element {
    const router = useRouter();
    const { clubId } = useAuth();

    const { data: membership } = useMyMembership(clubId ?? "");
    const {
        data: plans,
        isLoading: plansLoading,
        error: plansError,
    } = useListMembershipPlans(clubId ?? "");
    const subscribeMutation = useSubscribeToMembership(clubId ?? "");
    const { refetch: refetchMembership } = useMyMembership(clubId ?? "", { enabled: false });

    const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);
    const [subscribeError, setSubscribeError] = useState<string | null>(null);
    const [isConfirming, setIsConfirming] = useState(false);
    const [success, setSuccess] = useState<SuccessState>(null);

    const activePlans = plans?.filter((p) => p.is_active) ?? [];
    const hasActiveMembership =
        membership?.status === "active" || membership?.status === "trialing";

    const handleSelectPlan = useCallback((plan: MembershipPlan) => {
        setSubscribeError(null);
        setSelectedPlan(plan);
    }, []);

    const handleCloseSheet = useCallback(() => {
        if (isConfirming) return;
        setSelectedPlan(null);
        setSubscribeError(null);
    }, [isConfirming]);

    const handleSubscribe = useCallback(
        async (plan: MembershipPlan, paymentMethodId: string) => {
            const wasPlanChange =
                membership?.status === "active" || membership?.status === "trialing";
            setSubscribeError(null);
            setIsConfirming(true);
            try {
                await subscribeMutation.mutateAsync({
                    plan_id: plan.id,
                    payment_method_id: paymentMethodId,
                });
                await refetchMembership();
                setSelectedPlan(null);
                setSuccess({ plan, wasPlanChange: wasPlanChange ?? false });
            } catch (err) {
                setSubscribeError(
                    (err as { message?: string })?.message ??
                        "Subscription failed — please try again."
                );
            } finally {
                setIsConfirming(false);
            }
        },
        [subscribeMutation, refetchMembership, membership]
    );

    return (
        <SafeAreaView className="flex-1 bg-[#F2F3F7]">
            <StatusBar style="dark" />

            {/* Header */}
            <View className="flex-row items-center justify-between bg-[#F2F3F7] px-5 pb-2.5 pt-1 android:pt-3.5">
                <Pressable
                    onPress={() => router.back()}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                    hitSlop={12}
                    className="h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm active:opacity-50"
                >
                    <Ionicons name="chevron-back" size={28} color="#111827" />
                </Pressable>

                <Text className="absolute left-[76px] right-[76px] text-center text-[16px] font-semibold text-[#111827]">
                    Plans
                </Text>

                <View className="h-11 w-11" />
            </View>

            {/* Success state */}
            {success ? (
                <View className="flex-1 items-center justify-center px-8 gap-4">
                    <View className="h-16 w-16 items-center justify-center rounded-[20px] bg-green-50">
                        <Ionicons name="checkmark-circle" size={34} color="#22C55E" />
                    </View>
                    <Text className="text-[20px] font-bold text-[#111827] text-center">
                        {success.wasPlanChange ? "Plan updated!" : "You're now a member!"}
                    </Text>
                    <Text className="text-[14px] leading-6 text-[#6B7280] text-center">
                        {success.wasPlanChange
                            ? `Your plan has been changed to ${success.plan.name}. Changes take effect at the next billing cycle.`
                            : `Successfully subscribed to ${success.plan.name}.`}
                    </Text>
                    <Pressable
                        onPress={() => router.replace("/(player)/profile" as Href)}
                        accessibilityRole="button"
                        accessibilityLabel="View my membership"
                        className="mt-2 items-center justify-center rounded-xl bg-[#3B82F6] px-8 py-3.5 active:opacity-80"
                    >
                        <Text className="text-[15px] font-semibold text-white">
                            View my membership
                        </Text>
                    </Pressable>
                </View>
            ) : (
                <ScrollView
                    className="flex-1"
                    contentContainerClassName="px-4 pb-10 pt-4"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Sub-header banner */}
                    <View className="mb-5 overflow-hidden rounded-[20px] bg-[#1D2B4F] px-5 py-4">
                        <View className="flex-row items-center gap-3">
                            <View className="h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                                <Ionicons name="list" size={20} color="#93C5FD" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-[15px] font-bold text-white">
                                    Membership Plans
                                </Text>
                                <Text className="mt-0.5 text-[12px] text-white/55">
                                    {hasActiveMembership
                                        ? `Current: ${membership?.plan.name} · Upgrade or switch`
                                        : "Compare credits, discounts, and booking access"}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Loading */}
                    {plansLoading && (
                        <View className="items-center justify-center py-16 gap-3">
                            <ActivityIndicator size="large" color="#3B82F6" />
                            <Text className="text-[14px] font-medium text-[#9CA3AF]">
                                Loading plans…
                            </Text>
                        </View>
                    )}

                    {/* Error */}
                    {!plansLoading && plansError && (
                        <View className="flex-row items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-4">
                            <Ionicons name="alert-circle-outline" size={18} color="#EF4444" />
                            <Text className="text-[14px] font-medium text-red-600">
                                Failed to load membership plans.
                            </Text>
                        </View>
                    )}

                    {/* Empty */}
                    {!plansLoading && !plansError && activePlans.length === 0 && (
                        <View className="items-center justify-center py-16 gap-3">
                            <Ionicons name="list-outline" size={36} color="#D1D5DB" />
                            <Text className="text-[15px] font-medium text-[#9CA3AF]">
                                No plans available yet.
                            </Text>
                        </View>
                    )}

                    {/* Plan cards */}
                    {activePlans.map((plan) => (
                        <MobilePlanCard
                            key={plan.id}
                            plan={plan}
                            isCurrent={hasActiveMembership && plan.id === membership?.plan.id}
                            hasActiveMembership={hasActiveMembership}
                            currentPlanPrice={membership?.plan.price ?? null}
                            onSelect={() => handleSelectPlan(plan)}
                        />
                    ))}
                </ScrollView>
            )}

            {/* Payment sheet */}
            {selectedPlan && (
                <MobileSelectCardSheet
                    plan={selectedPlan}
                    isPlanChange={hasActiveMembership}
                    visible={!!selectedPlan}
                    isLoading={subscribeMutation.isPending || isConfirming}
                    error={subscribeError}
                    onClose={handleCloseSheet}
                    onConfirm={(paymentMethodId) =>
                        void handleSubscribe(selectedPlan, paymentMethodId)
                    }
                />
            )}
        </SafeAreaView>
    );
}
