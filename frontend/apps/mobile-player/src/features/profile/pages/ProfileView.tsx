import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLogout, type UserResponse } from "@repo/auth";
import { useRouter, type Href } from "expo-router";
import { useState } from "react";
import { PROFILE_MODULE_GROUPS } from "../constants/profileModules";
import { getInitials } from "../utils/profileFormatters";
import { useThemeColors, useThemePreference, type ThemePreference } from "../../../theme";

type Props = {
    user: UserResponse;
};

export function ProfileView({ user }: Props) {
    const router = useRouter();
    const colors = useThemeColors();
    const { preference, setPreference } = useThemePreference();
    const [appearanceOpen, setAppearanceOpen] = useState(false);
    const { mutate: logout, isPending: isLoggingOut } = useLogout();

    const displayName = user.full_name ?? user.email ?? "Player";
    const initials = getInitials(displayName);
    const subtitle = user.email ?? "";

    const handleLogout = () => {
        logout(undefined, {
            onSettled: () => {
                router.replace("/(auth)/login" as Href);
            },
        });
    };
    const appearanceLabel =
        preference === "system" ? "System" : preference === "dark" ? "Dark" : "Light";

    const appearanceOptions: Array<{
        value: ThemePreference;
        label: string;
        description: string;
        icon: keyof typeof Ionicons.glyphMap;
    }> = [
        {
            value: "system",
            label: "System",
            description: "Match your device setting",
            icon: "phone-portrait-outline",
        },
        {
            value: "light",
            label: "Light",
            description: "Use the light appearance",
            icon: "sunny-outline",
        },
        {
            value: "dark",
            label: "Dark",
            description: "Use the dark appearance",
            icon: "moon-outline",
        },
    ];

    return (
        <View style={{ flex: 1, backgroundColor: colors.hero }}>
            {/* Hero header — fixed, holds the avatar + name */}
            <View
                style={{
                    backgroundColor: colors.hero,
                    paddingHorizontal: 20,
                    paddingTop: 8,
                    paddingBottom: 36,
                    alignItems: "center",
                }}
            >
                <View
                    style={{
                        height: 88,
                        width: 88,
                        borderRadius: 44,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: colors.heroGlass,
                        borderWidth: 1,
                        borderColor: colors.heroGlassBorder,
                    }}
                    accessibilityLabel="Profile avatar"
                >
                    <Text style={{ fontSize: 28, fontWeight: "700", color: colors.heroForeground }}>
                        {initials}
                    </Text>
                </View>

                <Text
                    style={{
                        marginTop: 14,
                        fontSize: 22,
                        fontWeight: "700",
                        color: colors.heroForeground,
                        letterSpacing: -0.3,
                    }}
                >
                    {displayName}
                </Text>
                {!!subtitle && (
                    <Text style={{ marginTop: 2, fontSize: 13, color: colors.heroMuted }}>
                        {subtitle}
                    </Text>
                )}
            </View>

            {/* Scrollable content — lifts over hero */}
            <ScrollView
                style={{
                    flex: 1,
                    backgroundColor: colors.contentSurface,
                    borderTopLeftRadius: 24,
                    borderTopRightRadius: 24,
                    marginTop: -16,
                }}
                contentContainerStyle={{ paddingTop: 20, paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Module rows */}
                <View className="gap-4 px-4">
                    {PROFILE_MODULE_GROUPS.map((group) => (
                        <View
                            key={group.map((mod) => mod.id).join("-")}
                            className="overflow-hidden rounded-[28px] border border-border bg-card"
                        >
                            {group.map((mod, index) => (
                                <View key={mod.id}>
                                    <Pressable
                                        className="active:bg-muted flex-row items-center px-6 py-4"
                                        accessibilityRole="button"
                                        accessibilityLabel={mod.label}
                                        onPress={() => {
                                            if (mod.id === "appearance") {
                                                setAppearanceOpen(true);
                                                return;
                                            }
                                            if (mod.href) router.push(mod.href);
                                        }}
                                    >
                                        <View
                                            className={`mr-4 h-10 w-10 items-center justify-center rounded-xl ${mod.iconBgClassName}`}
                                        >
                                            <Ionicons
                                                name={mod.icon}
                                                size={22}
                                                color={colors.ctaForeground}
                                            />
                                        </View>

                                        <Text className="flex-1 text-lg font-medium text-card-foreground">
                                            {mod.label}
                                        </Text>

                                        {mod.id === "appearance" ? (
                                            <Text className="mr-2 text-sm font-medium text-muted-foreground">
                                                {appearanceLabel}
                                            </Text>
                                        ) : null}

                                        <Ionicons
                                            name="chevron-forward"
                                            size={22}
                                            color={colors.placeholder}
                                        />
                                    </Pressable>

                                    {index < group.length - 1 && (
                                        <View className="border-b border-border" />
                                    )}
                                </View>
                            ))}
                        </View>
                    ))}
                </View>

                <View className="mx-4 mt-4 overflow-hidden rounded-[28px] border border-border bg-card">
                    <Pressable
                        className={`active:bg-destructive/10 flex-row items-center px-6 py-4 ${
                            isLoggingOut ? "opacity-60" : ""
                        }`}
                        accessibilityRole="button"
                        accessibilityLabel="Logout"
                        disabled={isLoggingOut}
                        onPress={handleLogout}
                    >
                        <View className="mr-4 h-10 w-10 items-center justify-center rounded-xl bg-destructive">
                            <Ionicons
                                name="log-out-outline"
                                size={22}
                                color={colors.ctaForeground}
                            />
                        </View>

                        <Text className="flex-1 text-lg font-semibold text-destructive">
                            {isLoggingOut ? "Logging out…" : "Logout"}
                        </Text>

                        <Ionicons name="chevron-forward" size={22} color={colors.destructive} />
                    </Pressable>
                </View>
            </ScrollView>

            <Modal visible={appearanceOpen} animationType="slide" transparent>
                <Pressable
                    className="flex-1"
                    style={{ backgroundColor: colors.overlay }}
                    accessibilityRole="button"
                    accessibilityLabel="Close appearance selector"
                    onPress={() => setAppearanceOpen(false)}
                />
                <View className="rounded-t-[28px] bg-card px-5 pb-8 pt-4">
                    <View className="mb-3 flex-row items-center justify-between">
                        <Text className="text-lg font-bold text-foreground">Appearance</Text>
                        <Pressable
                            className="h-9 w-9 items-center justify-center rounded-full bg-muted active:opacity-70"
                            accessibilityRole="button"
                            accessibilityLabel="Close"
                            onPress={() => setAppearanceOpen(false)}
                        >
                            <Ionicons name="close" size={18} color={colors.foreground} />
                        </Pressable>
                    </View>

                    <View className="overflow-hidden rounded-[20px] border border-border bg-background">
                        {appearanceOptions.map((option, index) => {
                            const selected = option.value === preference;
                            return (
                                <View key={option.value}>
                                    <Pressable
                                        className="flex-row items-center px-4 py-4 active:bg-muted/40"
                                        accessibilityRole="button"
                                        accessibilityLabel={`Use ${option.label} appearance`}
                                        onPress={() => {
                                            setPreference(option.value);
                                            setAppearanceOpen(false);
                                        }}
                                    >
                                        <View
                                            className={`mr-3 h-10 w-10 items-center justify-center rounded-xl ${
                                                selected ? "bg-cta" : "bg-muted"
                                            }`}
                                        >
                                            <Ionicons
                                                name={option.icon}
                                                size={20}
                                                color={
                                                    selected
                                                        ? colors.ctaForeground
                                                        : colors.mutedForeground
                                                }
                                            />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-base font-semibold text-foreground">
                                                {option.label}
                                            </Text>
                                            <Text className="mt-0.5 text-sm text-muted-foreground">
                                                {option.description}
                                            </Text>
                                        </View>
                                        {selected ? (
                                            <Ionicons
                                                name="checkmark-circle"
                                                size={22}
                                                color={colors.cta}
                                            />
                                        ) : null}
                                    </Pressable>
                                    {index < appearanceOptions.length - 1 ? (
                                        <View className="border-b border-border" />
                                    ) : null}
                                </View>
                            );
                        })}
                    </View>
                </View>
            </Modal>
        </View>
    );
}
