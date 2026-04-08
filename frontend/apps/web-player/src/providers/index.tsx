import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { ThemeProvider } from "./ThemeProvider";

export { useTheme } from "./ThemeProvider";

const queryClient = new QueryClient();

// App-level providers: QueryClient, ThemeProvider.
// Business logic does NOT belong here.
export function AppProviders({ children }: { children: ReactNode }) {
    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider>{children}</ThemeProvider>
        </QueryClientProvider>
    );
}
