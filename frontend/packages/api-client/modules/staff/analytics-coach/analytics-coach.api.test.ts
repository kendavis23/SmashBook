import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCoachPopularityLeaderboardEndpoint } from "./analytics-coach.api";

vi.mock("../../../core/fetcher", () => ({ fetcher: vi.fn() }));

import { fetcher } from "../../../core/fetcher";
const mockFetcher = vi.mocked(fetcher);

beforeEach(() => {
    mockFetcher.mockReset();
});

const BASE = "/api/v1/analytics/coaches";

describe("getCoachPopularityLeaderboardEndpoint", () => {
    it("calls GET /clubs/:clubId/popularity with no params", async () => {
        mockFetcher.mockResolvedValue({});
        await getCoachPopularityLeaderboardEndpoint("club-1");
        expect(mockFetcher).toHaveBeenCalledWith(`${BASE}/clubs/club-1/popularity`);
    });

    it("appends sort param", async () => {
        mockFetcher.mockResolvedValue({});
        await getCoachPopularityLeaderboardEndpoint("club-1", { sort: "lesson_revenue" });
        expect(mockFetcher).toHaveBeenCalledWith(
            `${BASE}/clubs/club-1/popularity?sort=lesson_revenue`
        );
    });

    it("appends limit and offset params", async () => {
        mockFetcher.mockResolvedValue({});
        await getCoachPopularityLeaderboardEndpoint("club-1", { limit: 25, offset: 50 });
        expect(mockFetcher).toHaveBeenCalledWith(
            `${BASE}/clubs/club-1/popularity?limit=25&offset=50`
        );
    });

    it("appends all params together", async () => {
        mockFetcher.mockResolvedValue({});
        await getCoachPopularityLeaderboardEndpoint("club-1", {
            sort: "return_rate",
            limit: 10,
            offset: 20,
        });
        expect(mockFetcher).toHaveBeenCalledWith(
            `${BASE}/clubs/club-1/popularity?sort=return_rate&limit=10&offset=20`
        );
    });
});
