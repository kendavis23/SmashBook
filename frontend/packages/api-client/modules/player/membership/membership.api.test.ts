import { describe, it, expect, vi, beforeEach } from "vitest";
import { getMyMembershipEndpoint } from "./membership.api";

vi.mock("../../../core/fetcher", () => ({ fetcher: vi.fn() }));

import { fetcher } from "../../../core/fetcher";
const mockFetcher = vi.mocked(fetcher);

beforeEach(() => {
    mockFetcher.mockReset();
});

describe("getMyMembershipEndpoint", () => {
    it("calls GET /api/v1/clubs/:clubId/memberships/me", async () => {
        mockFetcher.mockResolvedValue({});
        await getMyMembershipEndpoint("club-1");
        expect(mockFetcher).toHaveBeenCalledWith("/api/v1/clubs/club-1/memberships/me");
    });
});
