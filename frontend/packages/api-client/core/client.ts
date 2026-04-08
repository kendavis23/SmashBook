// QueryClient configuration — shared singleton.
// Import this in each app's providers setup.
import { QueryClient } from "@tanstack/react-query";

export function createQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 60 * 1000, // 1 min
                retry: false, // domain hooks configure their own retry logic
            },
        },
    });
}
