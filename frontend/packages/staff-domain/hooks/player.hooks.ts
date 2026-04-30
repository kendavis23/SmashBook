import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
    registerPlayerEndpoint,
    updateSkillLevelEndpoint,
    getSkillHistoryEndpoint,
} from "@repo/api-client/modules/staff";
import { searchPlayersEndpoint } from "@repo/api-client/modules/share";
import type {
    RegisterPlayerInput,
    SkillLevelUpdateInput,
    SkillLevelUpdateResult,
    SkillLevelHistoryItem,
    TokenResponse,
    PlayerSearchResult,
    PlayerSearchParams,
} from "../models";

const playerKeys = {
    skillHistory: (playerId: string) => ["players", playerId, "skill-history"] as const,
    search: (params?: PlayerSearchParams) => ["players", "search", params] as const,
};

export function useRegisterPlayer() {
    return useMutation<TokenResponse, Error, RegisterPlayerInput>({
        mutationFn: (data: RegisterPlayerInput) => registerPlayerEndpoint(data),
    });
}

export function useUpdateSkillLevel(playerId: string) {
    const queryClient = useQueryClient();
    return useMutation<SkillLevelUpdateResult, Error, SkillLevelUpdateInput>({
        mutationFn: (data: SkillLevelUpdateInput) => updateSkillLevelEndpoint(playerId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: playerKeys.skillHistory(playerId) });
            queryClient.invalidateQueries({ queryKey: ["players", "search"] });
        },
    });
}

export function useGetSkillHistory(playerId: string) {
    return useQuery({
        queryKey: playerKeys.skillHistory(playerId),
        queryFn: (): Promise<SkillLevelHistoryItem[]> => getSkillHistoryEndpoint(playerId),
        enabled: Boolean(playerId),
    });
}

export function useSearchPlayers(params?: PlayerSearchParams, options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: playerKeys.search(params),
        queryFn: (): Promise<PlayerSearchResult[]> => searchPlayersEndpoint(params),
        enabled: options?.enabled ?? true,
    });
}
