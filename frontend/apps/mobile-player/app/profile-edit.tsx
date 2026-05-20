import { useRouter } from "expo-router";
import { useAuth } from "@repo/auth";
import { Text, View } from "react-native";
import { ProfileEditScreen } from "../src/features/profile/pages/ProfileEditScreen";

export default function ProfileEditRoute() {
    const router = useRouter();
    const { user } = useAuth();

    if (!user) {
        return (
            <View className="flex-1 items-center justify-center">
                <Text>Loading…</Text>
            </View>
        );
    }

    return (
        <ProfileEditScreen
            user={user}
            onCancel={() => router.back()}
            onDone={() => router.back()}
        />
    );
}
