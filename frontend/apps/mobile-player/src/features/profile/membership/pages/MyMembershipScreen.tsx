import { useCallback, useState, type JSX } from "react";
import { Text, View, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@repo/auth";
import {
    useMyMembership,
    useCancelMyMembership,
    useCancelPendingDowngrade,
} from "@repo/player-domain";
import { MyMembershipView } from "./MyMembershipView";

export function MyMembershipScreen(): JSX.Element {
    const router = useRouter();
    const { clubId } = useAuth();

    const { data: membership, isLoading, error } = useMyMembership(clubId ?? "");
    const cancelMutation = useCancelMyMembership(clubId ?? "");
    const cancelDowngradeMutation = useCancelPendingDowngrade(clubId ?? "");
    const [cancelError, setCancelError] = useState<string | null>(null);
    const [cancelDowngradeError, setCancelDowngradeError] = useState<string | null>(null);

    const handleCancel = useCallback(async () => {
        setCancelError(null);
        try {
            await cancelMutation.mutateAsync();
        } catch (err) {
            setCancelError(
                (err as { message?: string })?.message ?? "Failed to cancel — please try again."
            );
        }
    }, [cancelMutation]);

    const handleCancelPendingDowngrade = useCallback(async () => {
        setCancelDowngradeError(null);
        try {
            await cancelDowngradeMutation.mutateAsync();
        } catch (err) {
            setCancelDowngradeError(
                (err as { message?: string })?.message ??
                    "Failed to restore plan — please try again."
            );
        }
    }, [cancelDowngradeMutation]);

    return (
        <SafeAreaView className="flex-1 bg-[#F2F3F7]">
            <StatusBar style="dark" />

            {/* Header — mirrors ProfileEditScreen */}
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
                    My Membership
                </Text>

                {/* Spacer — keeps title centred */}
                <View className="h-11 w-11" />
            </View>

            {/* Loading */}
            {isLoading && (
                <View className="flex-1 items-center justify-center bg-[#F2F3F7] gap-3">
                    <View className="h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
                        <Ionicons name="ribbon-outline" size={22} color="#3B82F6" />
                    </View>
                    <Text className="text-[14px] font-medium text-[#9CA3AF]">
                        Loading membership…
                    </Text>
                </View>
            )}

            {/* Error */}
            {!isLoading && error && (
                <View className="flex-1 items-center justify-center bg-[#F2F3F7] px-6 gap-3">
                    <View className="h-12 w-12 items-center justify-center rounded-full bg-red-50">
                        <Ionicons name="alert-circle-outline" size={24} color="#EF4444" />
                    </View>
                    <Text className="text-[15px] font-semibold text-[#111827] text-center">
                        Could not load membership
                    </Text>
                    <Text className="text-[13px] text-[#9CA3AF] text-center">
                        Something went wrong. Please go back and try again.
                    </Text>
                </View>
            )}

            {/* No membership */}
            {!isLoading && !error && !membership && (
                <View className="flex-1 items-center justify-center bg-[#F2F3F7] px-8 gap-3">
                    <View className="h-16 w-16 items-center justify-center rounded-[20px] bg-[#EFF6FF]">
                        <Ionicons name="ribbon-outline" size={30} color="#3B82F6" />
                    </View>
                    <Text className="text-[17px] font-bold text-[#111827] text-center">
                        No active membership
                    </Text>
                    <Text className="text-[13px] leading-5 text-[#9CA3AF] text-center">
                        Join a plan for booking credits, guest passes, and member pricing.
                    </Text>
                </View>
            )}

            {/* Membership detail */}
            {!isLoading && !error && membership && (
                <MyMembershipView
                    membership={membership}
                    onCancel={() => void handleCancel()}
                    isCancelling={cancelMutation.isPending}
                    cancelError={cancelError}
                    onCancelPendingDowngrade={() => void handleCancelPendingDowngrade()}
                    isCancellingDowngrade={cancelDowngradeMutation.isPending}
                    cancelDowngradeError={cancelDowngradeError}
                />
            )}
        </SafeAreaView>
    );
}
