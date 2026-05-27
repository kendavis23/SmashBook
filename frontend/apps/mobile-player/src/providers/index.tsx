import { useInitAuth } from "@repo/auth";
import { config } from "@repo/config";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StripeProvider } from "@stripe/stripe-react-native";
import type { ReactNode } from "react";
import { useState } from "react";

function AuthSessionInitializer({ children }: { children: ReactNode }) {
    useInitAuth();
    return children;
}

export function AppProviders({ children }: { children: ReactNode }) {
    const [queryClient] = useState(() => new QueryClient());

    return (
        <StripeProvider publishableKey={config.stripePublishableKey} urlScheme="smashbook">
            <QueryClientProvider client={queryClient}>
                <AuthSessionInitializer>{children}</AuthSessionInitializer>
            </QueryClientProvider>
        </StripeProvider>
    );
}
