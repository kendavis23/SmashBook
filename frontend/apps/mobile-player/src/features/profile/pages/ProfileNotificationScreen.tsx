import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore, type NotificationChannel, type UserResponse } from "@repo/auth";
import { useUpdateMyProfile } from "@repo/player-domain";
import {
    DEFAULT_NOTIFICATION_CHANNEL,
    NOTIFICATION_OPTIONS,
} from "../constants/notificationOptions";
import { ProfileScreenShell } from "../components/ProfileScreenShell";
import { useThemeColors } from "../../../theme";

type Props = {
    user: UserResponse;
    onCancel: () => void;
};

export function ProfileNotificationScreen({ user, onCancel }: Props) {
    const colors = useThemeColors();
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

    const saveAction = (
        <Pressable
            onPress={() => void handleSave()}
            disabled={updateMutation.isPending}
            accessibilityRole="button"
            accessibilityLabel="Save notification settings"
            hitSlop={12}
            style={{
                height: 40,
                paddingHorizontal: 16,
                borderRadius: 20,
                backgroundColor: colors.heroForeground,
                alignItems: "center",
                justifyContent: "center",
                opacity: updateMutation.isPending ? 0.6 : 1,
            }}
        >
            {updateMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.hero} />
            ) : (
                <Text style={{ fontSize: 14, fontWeight: "700", color: colors.hero }}>Save</Text>
            )}
        </Pressable>
    );

    return (
        <ProfileScreenShell
            title="Notification Channel"
            onBack={onCancel}
            backLabel="Back to profile"
            headerAction={saveAction}
        >
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerClassName="px-4 pt-5 pb-10"
            >
                {!!error && (
                    <View className="mb-3 rounded-xl border border-destructive/20 bg-destructive/5 px-3.5 py-2.5">
                        <Text className="text-[13px] font-medium text-destructive">{error}</Text>
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
                                style={
                                    active
                                        ? {
                                              backgroundColor: colors.ctaSurface,
                                              borderColor: colors.cta,
                                              borderWidth: 2,
                                              borderRadius: 16,
                                              paddingHorizontal: 16,
                                              paddingVertical: 14,
                                              flexDirection: "row",
                                              alignItems: "center",
                                          }
                                        : {
                                              backgroundColor: colors.card,
                                              borderColor: colors.border,
                                              borderWidth: 1,
                                              borderRadius: 16,
                                              paddingHorizontal: 16,
                                              paddingVertical: 14,
                                              flexDirection: "row",
                                              alignItems: "center",
                                          }
                                }
                            >
                                <View
                                    className={`mr-3 h-12 w-12 items-center justify-center rounded-2xl ${option.iconBgClassName}`}
                                    style={
                                        active
                                            ? {
                                                  shadowColor: colors.cta,
                                                  shadowOffset: { width: 0, height: 2 },
                                                  shadowOpacity: 0.25,
                                                  shadowRadius: 6,
                                                  elevation: 4,
                                              }
                                            : undefined
                                    }
                                >
                                    <Ionicons
                                        name={option.icon}
                                        size={22}
                                        color={colors.ctaForeground}
                                    />
                                </View>

                                <View className="flex-1">
                                    <Text
                                        style={{
                                            fontSize: 16,
                                            fontWeight: "700",
                                            color: active ? colors.cta : colors.foreground,
                                        }}
                                    >
                                        {option.label}
                                    </Text>
                                    <Text
                                        style={{
                                            marginTop: 2,
                                            fontSize: 13,
                                            lineHeight: 18,
                                            color: active ? colors.cta : colors.mutedForeground,
                                            opacity: active ? 0.8 : 1,
                                        }}
                                    >
                                        {option.description}
                                    </Text>
                                </View>

                                <View
                                    style={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: 14,
                                        alignItems: "center",
                                        justifyContent: "center",
                                        backgroundColor: active ? colors.cta : "transparent",
                                        borderWidth: active ? 0 : 2,
                                        borderColor: colors.border,
                                    }}
                                >
                                    {active && (
                                        <Ionicons
                                            name="checkmark"
                                            size={16}
                                            color={colors.ctaForeground}
                                        />
                                    )}
                                </View>
                            </Pressable>
                        );
                    })}
                </View>
            </ScrollView>
        </ProfileScreenShell>
    );
}
