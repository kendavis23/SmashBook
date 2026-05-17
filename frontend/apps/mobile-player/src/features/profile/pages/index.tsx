import { StatusBar } from "expo-status-bar";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@repo/auth";
import { ProfileView } from "./ProfileView";

export function ProfilePage() {
    const { user } = useAuth();

    if (!user) {
        return (
            <SafeAreaView className="flex-1 items-center justify-center bg-background">
                <StatusBar style="dark" />
                <View className="flex-1 items-center justify-center">
                    <Text className="text-sm text-muted-foreground">Loading profile…</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-muted/30">
            <StatusBar style="dark" />
            <ProfileView user={user} />
        </SafeAreaView>
    );
}
