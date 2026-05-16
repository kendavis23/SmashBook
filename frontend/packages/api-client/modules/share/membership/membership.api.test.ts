import { describe, it, expect, vi, beforeEach } from "vitest";
import { listMembershipPlansEndpoint } from "./membership.api";

vi.mock("../../../core/fetcher", () => ({ fetcher: vi.fn() }));

import { fetcher } from "../../../core/fetcher";
const mockFetcher = vi.mocked(fetcher);

beforeEach(() => {
    mockFetcher.mockReset();
});

describe("listMembershipPlansEndpoint", () => {
    it("calls GET /api/v1/clubs/:clubId/membership-plans", async () => {
        mockFetcher.mockResolvedValue([]);
        await listMembershipPlansEndpoint("club-1");
        expect(mockFetcher).toHaveBeenCalledWith("/api/v1/clubs/club-1/membership-plans");
    });
});
