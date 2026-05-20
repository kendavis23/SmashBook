import { ScrollView, Text, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLogout, type UserResponse } from "@repo/auth";
import { useRouter, type Href } from "expo-router";
import { PROFILE_MODULE_GROUPS } from "../constants/profileModules";
import { getInitials } from "../utils/profileFormatters";

type Props = {
    user: UserResponse;
};

export function ProfileView({ user }: Props) {
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
                contentContainerClassName="pb-[120px]"
                showsVerticalScrollIndicator={false}
            >
                {/* Header — avatar centred */}
                <View className="px-6 pb-8 pt-6 items-center">
                    <View
                        className="h-24 w-24 items-center justify-center rounded-full bg-[#DBEAFE]"
                        accessibilityLabel="Profile avatar"
                    >
                        <Text className="text-3xl font-bold text-[#2563EB]">{initials}</Text>
                    </View>

                    <View className="mt-4 items-center">
                        <Text className="text-2xl font-bold text-foreground">{displayName}</Text>
                        {!!subtitle && (
                            <Text className="mt-1 text-sm text-muted-foreground">{subtitle}</Text>
                        )}
                    </View>
                </View>

                {/* Module rows */}
                <View className="gap-4 px-4">
                    {PROFILE_MODULE_GROUPS.map((group) => (
                        <View
                            key={group.map((mod) => mod.id).join("-")}
                            className="overflow-hidden rounded-[28px] bg-background shadow-sm"
                        >
                            {group.map((mod, index) => (
                                <View key={mod.id}>
                                    <Pressable
                                        className="active:bg-muted/40 flex-row items-center px-6 py-4"
                                        accessibilityRole="button"
                                        accessibilityLabel={mod.label}
                                        onPress={() => mod.href && router.push(mod.href)}
                                    >
                                        <View
                                            className={`mr-4 h-10 w-10 items-center justify-center rounded-xl ${mod.iconBgClassName}`}
                                        >
                                            <Ionicons name={mod.icon} size={22} color="#FFFFFF" />
                                        </View>

                                        <Text className="flex-1 text-lg font-medium text-foreground">
                                            {mod.label}
                                        </Text>

                                        <Ionicons
                                            name="chevron-forward"
                                            size={22}
                                            color="#B6B7BE"
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

                <View className="mx-4 mt-4 overflow-hidden rounded-[28px] bg-background shadow-sm">
                    <Pressable
                        className={`active:bg-red-50 flex-row items-center px-6 py-4 ${
                            isLoggingOut ? "opacity-60" : ""
                        }`}
                        accessibilityRole="button"
                        accessibilityLabel="Logout"
                        disabled={isLoggingOut}
                        onPress={handleLogout}
                    >
                        <View className="mr-4 h-10 w-10 items-center justify-center rounded-xl bg-[#EF4444]">
                            <Ionicons name="log-out-outline" size={22} color="#FFFFFF" />
                        </View>

                        <Text className="flex-1 text-lg font-semibold text-red-600">
                            {isLoggingOut ? "Logging out…" : "Logout"}
                        </Text>

                        <Ionicons name="chevron-forward" size={22} color="#F87171" />
                    </Pressable>
                </View>
            </ScrollView>
        </View>
    );
}
