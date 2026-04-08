import type { Theme } from "@repo/design-system";
import { darkTheme, lightTheme } from "@repo/design-system";
import { createContext, useContext, useLayoutEffect, useState } from "react";
import type { ReactNode } from "react";

interface ThemeContextValue {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "smashbook-theme";

function getInitialTheme(): Theme {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === lightTheme || stored === darkTheme) return stored;
    } catch {
        // localStorage unavailable (e.g. private browsing or SSR)
    }
    return lightTheme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>(getInitialTheme);

    useLayoutEffect(() => {
        const root = document.documentElement;
        root.classList.remove(lightTheme, darkTheme);
        if (theme === darkTheme) root.classList.add(darkTheme);
        try {
            localStorage.setItem(STORAGE_KEY, theme);
        } catch {
            // ignore write errors
        }
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme: setThemeState }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme(): ThemeContextValue {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
    return ctx;
}
