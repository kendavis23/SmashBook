import { fetcher } from "../../../core/fetcher";
import type {
    UserRegister,
    TokenResponse,
    SkillLevelUpdate,
    SkillLevelUpdateResponse,
    SkillLevelHistoryItem,
} from "./player.types";

const JSON_HEADERS = { "Content-Type": "application/json" };

export function registerPlayerEndpoint(data: UserRegister): Promise<TokenResponse> {
    return fetcher<TokenResponse>("/api/v1/auth/register", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(data),
    });
}

export function updateSkillLevelEndpoint(
    playerId: string,
    data: SkillLevelUpdate
): Promise<SkillLevelUpdateResponse> {
    return fetcher<SkillLevelUpdateResponse>(`/api/v1/players/${playerId}/skill-level`, {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify(data),
    });
}

export function getSkillHistoryEndpoint(playerId: string): Promise<SkillLevelHistoryItem[]> {
    return fetcher<SkillLevelHistoryItem[]>(`/api/v1/players/${playerId}/skill-history`);
}
