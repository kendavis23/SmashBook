import { useRouter } from "expo-router";
import { useAuth } from "@repo/auth";
import { Text, View } from "react-native";
import { ProfileNotificationScreen } from "../src/features/profile/pages/ProfileNotificationScreen";

export default function ProfileNotificationsScreen() {
    const router = useRouter();
    const { user } = useAuth();

    if (!user) {
        return (
            <View className="flex-1 items-center justify-center">
                <Text>Loading…</Text>
            </View>
        );
    }

    return <ProfileNotificationScreen user={user} onCancel={() => router.back()} />;
}
