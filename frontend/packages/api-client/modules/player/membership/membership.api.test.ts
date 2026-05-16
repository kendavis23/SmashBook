import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    listMembershipPlansEndpoint,
    getMyMembershipEndpoint,
    subscribeToPlanEndpoint,
    cancelMyMembershipEndpoint,
} from "./membership.api";

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

describe("getMyMembershipEndpoint", () => {
    it("calls GET /api/v1/clubs/:clubId/memberships/me", async () => {
        mockFetcher.mockResolvedValue({});
        await getMyMembershipEndpoint("club-1");
        expect(mockFetcher).toHaveBeenCalledWith("/api/v1/clubs/club-1/memberships/me");
    });
});

describe("subscribeToPlanEndpoint", () => {
    it("calls POST with body", async () => {
        mockFetcher.mockResolvedValue({});
        const data = { plan_id: "plan-1", payment_method_id: "pm_123" };
        await subscribeToPlanEndpoint("club-1", data);
        expect(mockFetcher).toHaveBeenCalledWith("/api/v1/clubs/club-1/memberships/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
    });
});

describe("cancelMyMembershipEndpoint", () => {
    it("calls POST /api/v1/clubs/:clubId/memberships/me/cancel", async () => {
        mockFetcher.mockResolvedValue({});
        await cancelMyMembershipEndpoint("club-1");
        expect(mockFetcher).toHaveBeenCalledWith("/api/v1/clubs/club-1/memberships/me/cancel", {
            method: "POST",
        });
    });
});
