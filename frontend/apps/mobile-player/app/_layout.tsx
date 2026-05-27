// Root layout — Expo Router entry point.
// Configure providers (QueryClient, ThemeProvider, AuthProvider) here.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setAuthStorage } from "@repo/auth";
import * as Font from "expo-font";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
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
                <Stack.Screen
                    name="profile-edit"
                    options={{ headerShown: false, animation: "slide_from_right" }}
                />
                <Stack.Screen
                    name="profile-notifications"
                    options={{ headerShown: false, animation: "slide_from_right" }}
                />
                <Stack.Screen
                    name="profile-membership"
                    options={{ headerShown: false, animation: "slide_from_right" }}
                />
                <Stack.Screen
                    name="profile-plans"
                    options={{ headerShown: false, animation: "slide_from_right" }}
                />
                <Stack.Screen
                    name="profile-cards"
                    options={{ headerShown: false, animation: "slide_from_right" }}
                />
                <Stack.Screen
                    name="profile-wallet"
                    options={{ headerShown: false, animation: "slide_from_right" }}
                />
            </Stack>
        </AppProviders>
    );
}
