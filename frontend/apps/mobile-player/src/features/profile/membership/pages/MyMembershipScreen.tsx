import { useCallback, useState, type JSX } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@repo/auth";
import {
    useMyMembership,
    useCancelMyMembership,
    useCancelPendingDowngrade,
} from "@repo/player-domain";
import { MyMembershipView } from "./MyMembershipView";
import { ProfileScreenShell } from "../../components/ProfileScreenShell";
import { useThemeColors } from "../../../../theme";

export function MyMembershipScreen(): JSX.Element {
    const colors = useThemeColors();
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
        <ProfileScreenShell title="My Membership" onBack={() => router.back()}>
            {/* Loading */}
            {isLoading && (
                <View className="flex-1 items-center justify-center gap-3">
                    <View className="h-12 w-12 items-center justify-center rounded-full bg-card shadow-sm">
                        <Ionicons name="ribbon-outline" size={22} color={colors.cta} />
                    </View>
                    <Text className="text-[14px] font-medium text-muted-foreground">
                        Loading membership…
                    </Text>
                </View>
            )}

            {/* Error */}
            {!isLoading && error && (
                <View className="flex-1 items-center justify-center px-6 gap-3">
                    <View className="h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                        <Ionicons
                            name="alert-circle-outline"
                            size={24}
                            color={colors.destructive}
                        />
                    </View>
                    <Text className="text-[15px] font-semibold text-foreground text-center">
                        Could not load membership
                    </Text>
                    <Text className="text-[13px] text-muted-foreground text-center">
                        Something went wrong. Please go back and try again.
                    </Text>
                </View>
            )}

            {/* No membership */}
            {!isLoading && !error && !membership && (
                <View className="flex-1 items-center justify-center px-8 gap-3">
                    <View className="h-16 w-16 items-center justify-center rounded-[20px] bg-secondary">
                        <Ionicons name="ribbon-outline" size={30} color={colors.cta} />
                    </View>
                    <Text className="text-[17px] font-bold text-foreground text-center">
                        No active membership
                    </Text>
                    <Text className="text-[13px] leading-5 text-muted-foreground text-center">
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
        </ProfileScreenShell>
    );
}
