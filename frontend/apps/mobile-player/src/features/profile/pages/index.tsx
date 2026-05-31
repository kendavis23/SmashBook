import { StatusBar } from "expo-status-bar";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@repo/auth";
import { useThemeColors } from "../../../theme";
import { ProfileView } from "./ProfileView";

export function ProfilePage() {
    const { user } = useAuth();
    const colors = useThemeColors();

    if (!user) {
        return (
            <SafeAreaView
                style={{ flex: 1, backgroundColor: colors.hero }}
                edges={["top"]}
                className="items-center justify-center"
            >
                <StatusBar style="light" />
                <View className="flex-1 items-center justify-center">
                    <Text style={{ fontSize: 14, color: colors.heroMuted }}>Loading profile…</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.hero }} edges={["top"]}>
            <StatusBar style="light" />
            <ProfileView user={user} />
        </SafeAreaView>
    );
}
