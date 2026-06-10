import { useInitAuth } from "@repo/auth";
import { BrandProvider } from "@repo/branding";
import { config } from "@repo/config";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StripeProvider } from "@stripe/stripe-react-native";
import type { ReactNode } from "react";
import { useState } from "react";
import { ThemeProvider } from "../theme";

function AuthSessionInitializer({ children }: { children: ReactNode }) {
    useInitAuth();
    return children;
}

export function AppProviders({ children }: { children: ReactNode }) {
    const [queryClient] = useState(() => new QueryClient());

    // BrandProvider is outermost (plan §5.3, §9): it resolves the active brand and feeds
    // its theme into ThemeProvider, which sources both the JS color tokens (useThemeColors)
    // and the NativeWind className CSS vars from it. No props → the resolved active brand
    // (today: `_default`, behavior-identical to the old hardcoded look).
    return (
        <BrandProvider>
            <ThemeProvider>
                <StripeProvider publishableKey={config.stripePublishableKey} urlScheme="smashbook">
                    <QueryClientProvider client={queryClient}>
                        <AuthSessionInitializer>{children}</AuthSessionInitializer>
                    </QueryClientProvider>
                </StripeProvider>
            </ThemeProvider>
        </BrandProvider>
    );
}
