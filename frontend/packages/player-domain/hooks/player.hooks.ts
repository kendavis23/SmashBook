import { useQuery } from "@tanstack/react-query";

import { searchPlayersEndpoint } from "@repo/api-client/modules/share";
import type { PlayerSearchResult, PlayerSearchParams } from "../models";

const playerKeys = {
    search: (params?: PlayerSearchParams) => ["players", "search", params] as const,
};

export function useSearchPlayers(params?: PlayerSearchParams, options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: playerKeys.search(params),
        queryFn: (): Promise<PlayerSearchResult[]> => searchPlayersEndpoint(params),
        enabled: options?.enabled ?? true,
    });
}
