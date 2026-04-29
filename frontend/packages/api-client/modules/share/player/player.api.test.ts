import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchPlayersEndpoint } from "./player.api";

vi.mock("../../../core/fetcher", () => ({ fetcher: vi.fn() }));

import { fetcher } from "../../../core/fetcher";
const mockFetcher = vi.mocked(fetcher);

beforeEach(() => {
    mockFetcher.mockReset();
});

describe("searchPlayersEndpoint", () => {
    it("calls GET /api/v1/players with no params", async () => {
        mockFetcher.mockResolvedValue([]);
        await searchPlayersEndpoint();
        expect(mockFetcher).toHaveBeenCalledWith("/api/v1/players");
    });

    it("calls GET /api/v1/players with q param", async () => {
        mockFetcher.mockResolvedValue([]);
        await searchPlayersEndpoint({ q: "john" });
        expect(mockFetcher).toHaveBeenCalledWith("/api/v1/players?q=john");
    });

    it("calls GET /api/v1/players with club_id param", async () => {
        mockFetcher.mockResolvedValue([]);
        await searchPlayersEndpoint({ club_id: "club-1" });
        expect(mockFetcher).toHaveBeenCalledWith("/api/v1/players?club_id=club-1");
    });

    it("calls GET /api/v1/players with both params", async () => {
        mockFetcher.mockResolvedValue([]);
        await searchPlayersEndpoint({ q: "john", club_id: "club-1" });
        expect(mockFetcher).toHaveBeenCalledWith("/api/v1/players?q=john&club_id=club-1");
    });
});
