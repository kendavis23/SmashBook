import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLogout, type UserResponse } from "@repo/auth";
import { useRouter, type Href } from "expo-router";
import { PROFILE_MODULE_GROUPS } from "../constants/profileModules";
import { getInitials } from "../utils/profileFormatters";
import { useThemeColors } from "../../../theme";

type Props = {
    user: UserResponse;
};

export function ProfileView({ user }: Props) {
    const router = useRouter();
    const colors = useThemeColors();
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
        </View>
    );
}
