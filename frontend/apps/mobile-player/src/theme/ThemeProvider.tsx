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
import { useColorScheme, vars } from "nativewind";
import { buildBrandCssVars, useBrand } from "@repo/branding";
import { lightTheme, type Theme, type ThemeColors } from "./themes";

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

    // Color SOURCE is now the active brand manifest (plan §5.3), not the hardcoded
    // `lightColors`/`darkColors` from themes.ts. The `_default` brand mirrors today's
    // tokens verbatim, so this is behavior-identical until a real brand is mounted.
    const brand = useBrand();
    const brandLight = brand.theme.light as ThemeColors;
    // A brand may omit a dark scheme; fall back to its light so the app never renders an
    // undefined token. The app is pinned to light today, so this only matters once the
    // future appearance toggle ships.
    const brandDark = (brand.theme.dark ?? brand.theme.light) as ThemeColors;

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

    const theme = useMemo<Theme>(
        () =>
            colorScheme === "dark"
                ? { mode: "dark", colors: brandDark }
                : { mode: "light", colors: brandLight },
        [colorScheme, brandDark, brandLight]
    );
    const value = useMemo(
        () => ({ ...theme, preference, setPreference }),
        [preference, setPreference, theme]
    );

    // NativeWind `className` tokens (bg-card, text-foreground, bg-cta, …) resolve through
    // the tailwind config's `hsl(var(--token))`. Injecting the active brand's CSS variables
    // here via `vars()` re-skins every className token at runtime to match the JS tokens
    // above — the one piece of brand theming that can't flow through `useThemeColors()`.
    // We pick the scheme-matched colors so light/dark stay consistent across both token
    // surfaces, then merge with the existing `light`/`dark` class on the same node.
    const brandCssVars = useMemo(
        () =>
            vars(
                buildBrandCssVars(
                    colorScheme === "dark" ? brandDark : brandLight,
                    brand.theme.tailwindOverrides
                )
            ),
        [colorScheme, brandDark, brandLight, brand.theme.tailwindOverrides]
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
            <View
                key="theme-root"
                style={[{ flex: 1 }, brandCssVars]}
                className={colorScheme === "dark" ? "dark" : "light"}
            >
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
