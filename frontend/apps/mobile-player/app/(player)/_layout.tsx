import { useAuth } from "@repo/auth";
import { Redirect, Stack, type Href } from "expo-router";

export default function PlayerLayout() {
    const { isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        return <Redirect href={"/(auth)/login" as Href} />;
    }

    return (
        <Stack>
            <Stack.Screen name="home" options={{ headerShown: false }} />
        </Stack>
    );
}
