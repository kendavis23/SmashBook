import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateSkillLevelEndpoint, getSkillHistoryEndpoint } from "./player.api";

vi.mock("../../../core/fetcher", () => ({ fetcher: vi.fn() }));

import { fetcher } from "../../../core/fetcher";
const mockFetcher = vi.mocked(fetcher);

beforeEach(() => {
    mockFetcher.mockReset();
});

describe("updateSkillLevelEndpoint", () => {
    it("calls PATCH /api/v1/players/:playerId/skill-level with body", async () => {
        mockFetcher.mockResolvedValue({});
        const data = { new_level: 3.5, reason: "Observed in match" };
        await updateSkillLevelEndpoint("player-1", data);
        expect(mockFetcher).toHaveBeenCalledWith("/api/v1/players/player-1/skill-level", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
    });
});

describe("getSkillHistoryEndpoint", () => {
    it("calls GET /api/v1/players/:playerId/skill-history", async () => {
        mockFetcher.mockResolvedValue([]);
        await getSkillHistoryEndpoint("player-1");
        expect(mockFetcher).toHaveBeenCalledWith("/api/v1/players/player-1/skill-history");
    });
});
