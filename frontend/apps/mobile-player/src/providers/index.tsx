import { useInitAuth } from "@repo/auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useState } from "react";

function AuthSessionInitializer({ children }: { children: ReactNode }) {
    useInitAuth();
    return children;
}

export function AppProviders({ children }: { children: ReactNode }) {
    const [queryClient] = useState(() => new QueryClient());

    return (
        <QueryClientProvider client={queryClient}>
            <AuthSessionInitializer>{children}</AuthSessionInitializer>
        </QueryClientProvider>
    );
}
