import { fetcher } from "../../../core/fetcher";
import type { CoachPopularityLeaderboard, CoachSort } from "./analytics-coach.types";

const BASE = "/api/v1/analytics/coaches";

export function getCoachPopularityLeaderboardEndpoint(
    clubId: string,
    params?: {
        sort?: CoachSort;
        limit?: number;
        offset?: number;
    }
): Promise<CoachPopularityLeaderboard> {
    const qs = new URLSearchParams();
    if (params?.sort) qs.set("sort", params.sort);
    if (params?.limit !== undefined) qs.set("limit", String(params.limit));
    if (params?.offset !== undefined) qs.set("offset", String(params.offset));
    const query = qs.toString();
    return fetcher<CoachPopularityLeaderboard>(
        `${BASE}/clubs/${clubId}/popularity${query ? `?${query}` : ""}`
    );
}
