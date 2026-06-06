import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
    updateSkillLevelEndpoint,
    getSkillHistoryEndpoint,
    invitePlayerEndpoint,
} from "@repo/api-client/modules/staff";
import { searchPlayersEndpoint } from "@repo/api-client/modules/share";
import type {
    PlayerInviteInput,
    PlayerInviteResult,
    SkillLevelUpdateInput,
    SkillLevelUpdateResult,
    SkillLevelHistoryItem,
    PlayerSearchResult,
    PlayerSearchParams,
} from "../models";

const playerKeys = {
    skillHistory: (playerId: string) => ["players", playerId, "skill-history"] as const,
    search: (params?: PlayerSearchParams) => ["players", "search", params] as const,
};

export function useInviteNewPlayer() {
    const queryClient = useQueryClient();
    return useMutation<PlayerInviteResult, Error, PlayerInviteInput>({
        mutationFn: (data: PlayerInviteInput) => invitePlayerEndpoint(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["players", "search"] });
        },
    });
}

export function useUpdateSkillLevel(playerId: string, clubId: string) {
    const queryClient = useQueryClient();
    return useMutation<SkillLevelUpdateResult, Error, SkillLevelUpdateInput>({
        mutationFn: (data: SkillLevelUpdateInput) =>
            updateSkillLevelEndpoint(playerId, clubId, data),
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
