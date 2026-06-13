import { useEffect, useMemo, useState } from "react";
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
    const initialChannel = user.preferred_notification_channel ?? DEFAULT_NOTIFICATION_CHANNEL;
    const [selected, setSelected] = useState<NotificationChannel>(initialChannel);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const setUser = useAuthStore((state) => state.setUser);
    const updateMutation = useUpdateMyProfile();

    useEffect(() => {
        setSelected(user.preferred_notification_channel ?? DEFAULT_NOTIFICATION_CHANNEL);
        setError("");
        setSuccessMessage("");
    }, [user.preferred_notification_channel]);

    const isDirty =
        selected !== (user.preferred_notification_channel ?? DEFAULT_NOTIFICATION_CHANNEL);
    const canSave = isDirty && !updateMutation.isPending;

    const selectedLabel = useMemo(
        () => NOTIFICATION_OPTIONS.find((o) => o.value === selected)?.label ?? "",
        [selected]
    );

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
            disabled={!canSave}
            accessibilityRole="button"
            accessibilityLabel="Save notification settings"
            hitSlop={12}
            style={{
                height: 40,
                paddingHorizontal: 18,
                borderRadius: 20,
                backgroundColor: colors.heroForeground,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                opacity: canSave ? 1 : 0.5,
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
            subtitle="How we reach you"
            onBack={onCancel}
            backLabel="Back to profile"
            headerAction={saveAction}
        >
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 }}
            >
                {/* Intro */}
                <View style={{ marginBottom: 18 }}>
                    <Text
                        style={{
                            fontSize: 13,
                            fontWeight: "600",
                            letterSpacing: 0.5,
                            textTransform: "uppercase",
                            color: colors.mutedForeground,
                        }}
                    >
                        Preferred channel
                    </Text>
                    <Text
                        style={{
                            marginTop: 6,
                            fontSize: 15,
                            lineHeight: 21,
                            color: colors.mutedForeground,
                        }}
                    >
                        Choose where you&apos;d like to receive booking confirmations, reminders,
                        and account updates.
                    </Text>
                </View>

                {/* Feedback banners */}
                {!!error && (
                    <View
                        style={{
                            marginBottom: 14,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 10,
                            borderRadius: 14,
                            borderWidth: 1,
                            borderColor: colors.destructive,
                            backgroundColor: colors.destructiveSurface,
                            paddingHorizontal: 14,
                            paddingVertical: 12,
                        }}
                    >
                        <Ionicons name="alert-circle" size={18} color={colors.destructive} />
                        <Text
                            style={{
                                flex: 1,
                                fontSize: 13,
                                fontWeight: "500",
                                color: colors.destructive,
                            }}
                        >
                            {error}
                        </Text>
                    </View>
                )}

                {!!successMessage && (
                    <View
                        style={{
                            marginBottom: 14,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 10,
                            borderRadius: 14,
                            borderWidth: 1,
                            borderColor: colors.success,
                            backgroundColor: colors.successSurface,
                            paddingHorizontal: 14,
                            paddingVertical: 12,
                        }}
                    >
                        <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                        <Text
                            style={{
                                flex: 1,
                                fontSize: 13,
                                fontWeight: "500",
                                color: colors.success,
                            }}
                        >
                            {successMessage}
                        </Text>
                    </View>
                )}

                {/* Option cards */}
                <View style={{ gap: 12 }}>
                    {NOTIFICATION_OPTIONS.map((option) => {
                        const active = selected === option.value;

                        return (
                            <Pressable
                                key={option.value}
                                onPress={() => handleSelect(option.value)}
                                accessibilityRole="radio"
                                accessibilityState={{ checked: active }}
                                accessibilityLabel={option.label}
                                style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    borderRadius: 18,
                                    paddingHorizontal: 16,
                                    paddingVertical: 16,
                                    backgroundColor: active ? colors.ctaSurface : colors.card,
                                    borderWidth: active ? 1.5 : 1,
                                    borderColor: active ? colors.cta : colors.border,
                                    shadowColor: colors.shadow,
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: active ? 0.1 : 0.05,
                                    shadowRadius: active ? 10 : 6,
                                    elevation: active ? 3 : 1,
                                }}
                            >
                                {/* Icon chip — decorative per-channel accent */}
                                <View
                                    className={`h-12 w-12 items-center justify-center rounded-2xl ${option.iconBgClassName}`}
                                    style={{
                                        shadowColor: colors.shadow,
                                        shadowOffset: { width: 0, height: 3 },
                                        shadowOpacity: 0.2,
                                        shadowRadius: 6,
                                        elevation: 3,
                                    }}
                                >
                                    <Ionicons
                                        name={option.icon}
                                        size={22}
                                        color={colors.ctaForeground}
                                    />
                                </View>

                                {/* Label + description */}
                                <View style={{ flex: 1, marginLeft: 14 }}>
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
                                            opacity: active ? 0.85 : 1,
                                        }}
                                    >
                                        {option.description}
                                    </Text>
                                </View>

                                {/* Radio indicator */}
                                <View
                                    style={{
                                        width: 26,
                                        height: 26,
                                        borderRadius: 13,
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

                {/* Selection summary */}
                <View
                    style={{
                        marginTop: 22,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        paddingHorizontal: 4,
                    }}
                >
                    <Ionicons
                        name="information-circle-outline"
                        size={16}
                        color={colors.mutedForeground}
                    />
                    <Text style={{ flex: 1, fontSize: 13, color: colors.mutedForeground }}>
                        {`We'll send updates via ${selectedLabel}.`}
                    </Text>
                </View>
            </ScrollView>
        </ProfileScreenShell>
    );
}
