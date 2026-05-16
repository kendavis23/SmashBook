import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { ThemeProvider } from "./ThemeProvider";
import { StripeProvider } from "./StripeProvider";

export { useTheme } from "./ThemeProvider";

const queryClient = new QueryClient();

export function AppProviders({ children }: { children: ReactNode }) {
    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider>
                <StripeProvider>{children}</StripeProvider>
            </ThemeProvider>
        </QueryClientProvider>
    );
}
