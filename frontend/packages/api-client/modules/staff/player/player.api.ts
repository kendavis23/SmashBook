import { fetcher } from "../../../core/fetcher";
import type {
    PlayerInviteRequest,
    PlayerInviteResponse,
    SkillLevelUpdate,
    SkillLevelUpdateResponse,
    SkillLevelHistoryItem,
} from "./player.types";

const JSON_HEADERS = { "Content-Type": "application/json" };

export function invitePlayerEndpoint(data: PlayerInviteRequest): Promise<PlayerInviteResponse> {
    return fetcher<PlayerInviteResponse>("/api/v1/players/invite", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(data),
    });
}

export function updateSkillLevelEndpoint(
    playerId: string,
    clubId: string,
    data: SkillLevelUpdate
): Promise<SkillLevelUpdateResponse> {
    return fetcher<SkillLevelUpdateResponse>(
        `/api/v1/players/${playerId}/skill-level?club_id=${clubId}`,
        {
            method: "PATCH",
            headers: JSON_HEADERS,
            body: JSON.stringify(data),
        }
    );
}

export function getSkillHistoryEndpoint(playerId: string): Promise<SkillLevelHistoryItem[]> {
    return fetcher<SkillLevelHistoryItem[]>(`/api/v1/players/${playerId}/skill-history`);
}
