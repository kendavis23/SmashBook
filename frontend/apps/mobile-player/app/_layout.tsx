// Root layout — Expo Router entry point.
// Configure providers (QueryClient, ThemeProvider, AuthProvider) here.
import { Stack } from "expo-router";

export default function RootLayout() {
    return (
        <Stack>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(player)" options={{ headerShown: false }} />
        </Stack>
    );
}
