import { useQuery } from "@tanstack/react-query";
import { getCoachPopularityLeaderboardEndpoint } from "@repo/api-client/modules/staff";
import type { CoachPopularityLeaderboard, CoachPopularityParams } from "../models";

const analyticsCoachKeys = {
    popularity: (clubId: string, params?: CoachPopularityParams) =>
        ["analytics-coach", clubId, "popularity", params] as const,
};

export function useCoachPopularityLeaderboard(clubId: string, params: CoachPopularityParams = {}) {
    return useQuery({
        queryKey: analyticsCoachKeys.popularity(clubId, params),
        queryFn: (): Promise<CoachPopularityLeaderboard> =>
            getCoachPopularityLeaderboardEndpoint(clubId, params),
        enabled: Boolean(clubId),
    });
}
