// ThemeProvider + useTheme — single runtime entry point for theming.
//
// The active theme is resolved through NativeWind's `useColorScheme`, which keeps
// NativeWind `dark:` classes and JS color tokens in sync. The saved preference can
// be "system", "light", or "dark"; system follows the device color scheme.

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import { View } from "react-native";
import { useColorScheme } from "nativewind";
import { darkTheme, lightTheme, type Theme } from "./themes";

export type ThemePreference = "system" | "light" | "dark";

type ThemeContextValue = Theme & {
    preference: ThemePreference;
    setPreference: (preference: ThemePreference) => void;
};

const THEME_PREFERENCE_KEY = "smashbook:theme-preference";

const ThemeContext = createContext<ThemeContextValue>({
    ...lightTheme,
    preference: "system",
    setPreference: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
    const { colorScheme, setColorScheme } = useColorScheme();
    const [preference, setPreferenceState] = useState<ThemePreference>("light");

    // Light is the only theme today — the in-app appearance toggle is intentionally not
    // exposed yet (the Appearance row was removed from Profile). We pin the color scheme
    // to light on mount so the app ignores the device dark setting. The full
    // preference/persistence machinery below is kept intact so a user-facing toggle can
    // be reintroduced later without re-plumbing the provider — just surface setPreference.
    useEffect(() => {
        setColorScheme("light");
    }, [setColorScheme]);

    const setPreference = useCallback(
        (nextPreference: ThemePreference) => {
            setPreferenceState(nextPreference);
            setColorScheme(nextPreference);
            void AsyncStorage.setItem(THEME_PREFERENCE_KEY, nextPreference);
        },
        [setColorScheme]
    );

    const theme = useMemo(() => (colorScheme === "dark" ? darkTheme : lightTheme), [colorScheme]);
    const value = useMemo(
        () => ({ ...theme, preference, setPreference }),
        [preference, setPreference, theme]
    );

    // With `darkMode: "class"` (Tailwind config), NativeWind only resolves the `dark:`
    // variant and the `.dark { --token: ... }` CSS-variable overrides under a node that
    // carries the `dark` class. Without this wrapper, `setColorScheme` flips the JS color
    // objects (useThemeColors → hero, tab bar) but leaves className tokens (bg-card,
    // text-foreground, …) stuck on their light values.
    //
    // The class string must be a STABLE host prop — always either "dark" or "light",
    // never "" / undefined. When colorScheme is briefly undefined on first render the
    // class would toggle ""→"dark", which NativeWind treats as a structural change and
    // remounts the subtree below — tearing down the Expo Router navigation container
    // mid-render and throwing "Couldn't find a navigation context". A constant key and a
    // non-empty class on both branches keep the node stable so only styles update.
    return (
        <ThemeContext.Provider value={value}>
            <View key="theme-root" style={{ flex: 1 }} className={colorScheme === "dark" ? "dark" : "light"}>
                {children}
            </View>
        </ThemeContext.Provider>
    );
}

export function useTheme(): ThemeContextValue {
    return useContext(ThemeContext);
}

// Convenience: read only the color tokens (the common case).
export function useThemeColors() {
    return useTheme().colors;
}

export function useThemePreference() {
    const { preference, setPreference } = useTheme();
    return { preference, setPreference };
}
