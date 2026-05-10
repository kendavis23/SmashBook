// Root layout — Expo Router entry point.
// Configure providers (QueryClient, ThemeProvider, AuthProvider) here.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setAuthStorage } from "@repo/auth";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { AppProviders } from "../src/providers";

try {
    require("../global.css");
} catch {
    // NativeWind's CSS import can throw before runtime is ready on some Expo/Hermes builds.
}

export default function RootLayout() {
    useEffect(() => {
        setAuthStorage(AsyncStorage);
    }, []);

    return (
        <AppProviders>
            <Stack>
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen name="(player)" options={{ headerShown: false }} />
            </Stack>
        </AppProviders>
    );
}
