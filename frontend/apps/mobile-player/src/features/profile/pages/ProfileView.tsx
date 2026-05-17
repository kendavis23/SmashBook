import { useState } from "react";
import { ScrollView, Text, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLogout, type UserResponse } from "@repo/auth";
import { useRouter, type Href } from "expo-router";
import { ProfileEditSheet } from "./ProfileEditSheet";

type ModuleRow = {
    id: string;
    icon: keyof typeof Ionicons.glyphMap;
    iconBg: string;
    label: string;
};

const MODULES: ModuleRow[] = [
    { id: "notifications", icon: "notifications", iconBg: "#EF4444", label: "Notifications" },
    { id: "billing", icon: "card", iconBg: "#3B82F6", label: "Billing" },
    { id: "wallet", icon: "wallet", iconBg: "#10B981", label: "Wallet" },
    { id: "membership", icon: "ribbon", iconBg: "#F59E0B", label: "Membership" },
];

type Props = {
    user: UserResponse;
};

function getInitials(name: string): string {
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

export function ProfileView({ user }: Props) {
    const [editOpen, setEditOpen] = useState(false);
    const router = useRouter();
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
        <View className="flex-1">
            <ScrollView
                className="flex-1 bg-muted/30"
                contentContainerStyle={{ paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Header — avatar centred, Edit pill top-right */}
                <View className="px-6 pb-8 pt-6">
                    {/* Top row: spacer + avatar + Edit button */}
                    <View className="flex-row items-start justify-between">
                        {/* Left spacer matches Edit button width so avatar stays centred */}
                        <View style={{ width: 64 }} />

                        {/* Avatar */}
                        <View
                            className="h-24 w-24 items-center justify-center rounded-full"
                            style={{ backgroundColor: "#7C6FCD" }}
                            accessibilityLabel="Profile avatar"
                        >
                            <Text className="text-3xl font-bold text-white">{initials}</Text>
                        </View>

                        {/* Edit pill */}
                        <Pressable
                            onPress={() => setEditOpen(true)}
                            accessibilityRole="button"
                            accessibilityLabel="Edit profile"
                            className="active:opacity-70"
                            style={{
                                backgroundColor: "#FFFFFF",
                                borderRadius: 20,
                                paddingHorizontal: 16,
                                paddingVertical: 8,
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.1,
                                shadowRadius: 6,
                                elevation: 3,
                                alignSelf: "flex-start",
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 15,
                                    fontWeight: "600",
                                    color: "#1A1A2E",
                                }}
                            >
                                Edit
                            </Text>
                        </Pressable>
                    </View>

                    {/* Name + email below avatar */}
                    <View className="mt-4 items-center">
                        <Text className="text-2xl font-bold text-foreground">{displayName}</Text>
                        {!!subtitle && (
                            <Text className="mt-1 text-sm text-muted-foreground">{subtitle}</Text>
                        )}
                    </View>
                </View>

                {/* Module rows */}
                <View className="mx-4 overflow-hidden rounded-2xl bg-background shadow-sm">
                    {MODULES.map((mod, index) => (
                        <View key={mod.id}>
                            <Pressable
                                className="active:bg-muted/40 flex-row items-center px-4 py-3.5"
                                accessibilityRole="button"
                                accessibilityLabel={mod.label}
                                onPress={() => {
                                    /* placeholder — screen not yet implemented */
                                }}
                            >
                                <View
                                    className="mr-3 h-10 w-10 items-center justify-center rounded-xl"
                                    style={{ backgroundColor: mod.iconBg }}
                                >
                                    <Ionicons name={mod.icon} size={20} color="#FFFFFF" />
                                </View>

                                <Text className="flex-1 text-base font-medium text-foreground">
                                    {mod.label}
                                </Text>

                                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                            </Pressable>

                            {index < MODULES.length - 1 && (
                                <View className="ml-[68px] border-b border-border" />
                            )}
                        </View>
                    ))}
                </View>

                <View className="mx-4 mt-4 overflow-hidden rounded-2xl bg-background shadow-sm">
                    <Pressable
                        className="active:bg-red-50 flex-row items-center px-4 py-3.5"
                        accessibilityRole="button"
                        accessibilityLabel="Logout"
                        disabled={isLoggingOut}
                        onPress={handleLogout}
                        style={{ opacity: isLoggingOut ? 0.6 : 1 }}
                    >
                        <View
                            className="mr-3 h-10 w-10 items-center justify-center rounded-xl"
                            style={{ backgroundColor: "#EF4444" }}
                        >
                            <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
                        </View>

                        <Text className="flex-1 text-base font-semibold text-red-600">
                            {isLoggingOut ? "Logging out…" : "Logout"}
                        </Text>

                        <Ionicons name="chevron-forward" size={18} color="#F87171" />
                    </Pressable>
                </View>
            </ScrollView>

            <ProfileEditSheet
                user={user}
                visible={editOpen}
                onCancel={() => setEditOpen(false)}
                onDone={() => setEditOpen(false)}
            />
        </View>
    );
}
