import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    listMembershipPlansEndpoint,
    getMyMembershipEndpoint,
    subscribeToPlanEndpoint,
    cancelMyMembershipEndpoint,
    upgradeMyMembershipEndpoint,
    downgradeMyMembershipEndpoint,
    cancelPendingDowngradeEndpoint,
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

describe("upgradeMyMembershipEndpoint", () => {
    it("calls POST with body to /api/v1/clubs/:clubId/memberships/me/upgrade", async () => {
        mockFetcher.mockResolvedValue({});
        const data = { plan_id: "plan-2", payment_method_id: "pm_123" };
        await upgradeMyMembershipEndpoint("club-1", data);
        expect(mockFetcher).toHaveBeenCalledWith("/api/v1/clubs/club-1/memberships/me/upgrade", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
    });
});

describe("downgradeMyMembershipEndpoint", () => {
    it("calls POST with body to /api/v1/clubs/:clubId/memberships/me/downgrade", async () => {
        mockFetcher.mockResolvedValue({});
        const data = { plan_id: "plan-1" };
        await downgradeMyMembershipEndpoint("club-1", data);
        expect(mockFetcher).toHaveBeenCalledWith("/api/v1/clubs/club-1/memberships/me/downgrade", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
    });
});

describe("cancelPendingDowngradeEndpoint", () => {
    it("calls POST /api/v1/clubs/:clubId/memberships/me/downgrade/cancel", async () => {
        mockFetcher.mockResolvedValue({});
        await cancelPendingDowngradeEndpoint("club-1");
        expect(mockFetcher).toHaveBeenCalledWith(
            "/api/v1/clubs/club-1/memberships/me/downgrade/cancel",
            { method: "POST" }
        );
    });
});
