import type { ReactNode } from "react";
import { ThemeProvider } from "./ThemeProvider";

export { useTheme } from "./ThemeProvider";

export function AppProviders({ children }: { children: ReactNode }) {
    return <ThemeProvider>{children}</ThemeProvider>;
}
