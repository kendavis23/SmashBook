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
    const [preference, setPreferenceState] = useState<ThemePreference>("system");

    useEffect(() => {
        let mounted = true;
        void AsyncStorage.getItem(THEME_PREFERENCE_KEY).then((stored) => {
            if (!mounted) return;
            if (stored === "light" || stored === "dark" || stored === "system") {
                setPreferenceState(stored);
                setColorScheme(stored);
            }
        });
        return () => {
            mounted = false;
        };
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

    // The `dark` className must live on a node in the tree for NativeWind to apply the
    // `.dark { --token: ... }` CSS-variable overrides to every `className` token below it.
    // Without it, `setColorScheme` flips JS color objects (useThemeColors) but leaves
    // className tokens (bg-background, text-foreground, …) stuck on their light values.
    return (
        <ThemeContext.Provider value={value}>
            <View className={colorScheme === "dark" ? "dark flex-1" : "flex-1"}>{children}</View>
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
