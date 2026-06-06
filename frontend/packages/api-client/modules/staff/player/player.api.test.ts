import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    invitePlayerEndpoint,
    updateSkillLevelEndpoint,
    getSkillHistoryEndpoint,
} from "./player.api";

vi.mock("../../../core/fetcher", () => ({ fetcher: vi.fn() }));

import { fetcher } from "../../../core/fetcher";
const mockFetcher = vi.mocked(fetcher);

beforeEach(() => {
    mockFetcher.mockReset();
});

describe("invitePlayerEndpoint", () => {
    it("calls POST /api/v1/players/invite with body", async () => {
        mockFetcher.mockResolvedValue({});
        const data = { email: "jane@example.com", full_name: "Jane Doe", club_id: "club-1" };
        await invitePlayerEndpoint(data);
        expect(mockFetcher).toHaveBeenCalledWith("/api/v1/players/invite", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
    });
});

describe("updateSkillLevelEndpoint", () => {
    it("calls PATCH /api/v1/players/:playerId/skill-level?club_id with body", async () => {
        mockFetcher.mockResolvedValue({});
        const data = { new_level: 3.5, reason: "Observed in match" };
        await updateSkillLevelEndpoint("player-1", "club-1", data);
        expect(mockFetcher).toHaveBeenCalledWith(
            "/api/v1/players/player-1/skill-level?club_id=club-1",
            {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            }
        );
    });
});

describe("getSkillHistoryEndpoint", () => {
    it("calls GET /api/v1/players/:playerId/skill-history", async () => {
        mockFetcher.mockResolvedValue([]);
        await getSkillHistoryEndpoint("player-1");
        expect(mockFetcher).toHaveBeenCalledWith("/api/v1/players/player-1/skill-history");
    });
});
