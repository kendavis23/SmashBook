import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore, type NotificationChannel, type UserResponse } from "@repo/auth";
import { useUpdateMyProfile } from "@repo/player-domain";
import {
    DEFAULT_NOTIFICATION_CHANNEL,
    NOTIFICATION_OPTIONS,
} from "../constants/notificationOptions";

type Props = {
    user: UserResponse;
    onCancel: () => void;
};

export function ProfileNotificationScreen({ user, onCancel }: Props) {
    const [selected, setSelected] = useState<NotificationChannel>(
        user.preferred_notification_channel ?? DEFAULT_NOTIFICATION_CHANNEL
    );
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const setUser = useAuthStore((state) => state.setUser);
    const updateMutation = useUpdateMyProfile();

    useEffect(() => {
        setSelected(user.preferred_notification_channel ?? DEFAULT_NOTIFICATION_CHANNEL);
        setError("");
        setSuccessMessage("");
    }, [user.preferred_notification_channel]);

    const handleSelect = (channel: NotificationChannel): void => {
        setSelected(channel);
        setError("");
        setSuccessMessage("");
    };

    const handleSave = async (): Promise<void> => {
        setError("");
        setSuccessMessage("");
        try {
            await updateMutation.mutateAsync({ preferred_notification_channel: selected });
            setUser({ ...user, preferred_notification_channel: selected });
            setSuccessMessage("Notification settings have been updated.");
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to update notification settings."
            );
        }
    };

    return (
        <View className="flex-1 bg-muted/40">
            <SafeAreaView className="flex-1">
                <View className="flex-row items-center justify-between bg-muted/40 px-5 pb-2.5 pt-1 android:pt-3.5">
                    <Pressable
                        onPress={onCancel}
                        accessibilityRole="button"
                        accessibilityLabel="Back to profile"
                        hitSlop={12}
                        className="h-11 w-11 items-center justify-center rounded-full bg-background shadow-sm active:opacity-50"
                    >
                        <Ionicons name="chevron-back" size={28} color="#0F172A" />
                    </Pressable>

                    <Text className="absolute left-[76px] right-[76px] text-center text-[16px] font-semibold text-foreground">
                        Notification Channel
                    </Text>

                    <Pressable
                        onPress={() => void handleSave()}
                        disabled={updateMutation.isPending}
                        accessibilityRole="button"
                        accessibilityLabel="Save notification settings"
                        hitSlop={12}
                        className={`min-w-16 items-end px-1 py-2 ${
                            updateMutation.isPending ? "opacity-50" : "active:opacity-50"
                        }`}
                    >
                        {updateMutation.isPending ? (
                            <ActivityIndicator size="small" color="#0F172A" />
                        ) : (
                            <Text className="text-right text-[15px] font-semibold text-[#3B82F6]">
                                Save
                            </Text>
                        )}
                    </Pressable>
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerClassName="px-4 pt-5 pb-10"
                >
                    {!!error && (
                        <View className="mb-3 rounded-xl border border-destructive/20 bg-destructive/5 px-3.5 py-2.5">
                            <Text className="text-[13px] font-medium text-destructive">
                                {error}
                            </Text>
                        </View>
                    )}

                    {!!successMessage && (
                        <View className="mb-3 rounded-xl border border-primary/10 bg-primary/5 px-3.5 py-2.5">
                            <Text className="text-[13px] font-medium text-foreground">
                                {successMessage}
                            </Text>
                        </View>
                    )}

                    <View className="gap-3">
                        {NOTIFICATION_OPTIONS.map((option) => {
                            const active = selected === option.value;

                            return (
                                <Pressable
                                    key={option.value}
                                    onPress={() => handleSelect(option.value)}
                                    accessibilityRole="radio"
                                    accessibilityState={{ checked: active }}
                                    accessibilityLabel={option.label}
                                    className={`flex-row items-center rounded-2xl border bg-background px-4 py-4 shadow-sm active:bg-muted/40 ${
                                        active ? "border-[#3B82F6] bg-[#EFF6FF]" : "border-border"
                                    }`}
                                >
                                    <View
                                        className={`mr-3 h-12 w-12 items-center justify-center rounded-2xl ${option.iconBgClassName}`}
                                    >
                                        <Ionicons name={option.icon} size={22} color="#FFFFFF" />
                                    </View>

                                    <View className="flex-1">
                                        <Text className="text-[16px] font-bold text-foreground">
                                            {option.label}
                                        </Text>
                                        <Text className="mt-1 text-[13px] leading-5 text-muted-foreground">
                                            {option.description}
                                        </Text>
                                    </View>

                                    <View
                                        className={`h-8 w-8 items-center justify-center rounded-full border ${
                                            active
                                                ? "border-[#3B82F6] bg-[#3B82F6]"
                                                : "border-border bg-background"
                                        }`}
                                    >
                                        {active && (
                                            <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                                        )}
                                    </View>
                                </Pressable>
                            );
                        })}
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
