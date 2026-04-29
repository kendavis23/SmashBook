import { fetcher } from "../../../core/fetcher";
import type { PlayerSearchResult, PlayerSearchParams } from "./player.types";

export function searchPlayersEndpoint(params?: PlayerSearchParams): Promise<PlayerSearchResult[]> {
    const query = new URLSearchParams();
    if (params?.q) query.set("q", params.q);
    if (params?.club_id) query.set("club_id", params.club_id);
    const qs = query.toString();
    return fetcher<PlayerSearchResult[]>(`/api/v1/players${qs ? `?${qs}` : ""}`);
}
