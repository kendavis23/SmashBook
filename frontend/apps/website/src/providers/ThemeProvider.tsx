import { createContext, useContext, useLayoutEffect } from "react";
import type { ReactNode } from "react";

const lightTheme = "light" as const;
const darkTheme = "dark" as const;
type Theme = typeof lightTheme | typeof darkTheme;

interface ThemeContextValue {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
    useLayoutEffect(() => {
        const root = document.documentElement;
        root.classList.remove(darkTheme);
    }, []);

    return (
        <ThemeContext.Provider value={{ theme: lightTheme, setTheme: () => {} }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme(): ThemeContextValue {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
    return ctx;
}
