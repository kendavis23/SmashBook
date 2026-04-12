import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    createMembershipPlanEndpoint,
    listMembershipPlansEndpoint,
    getMembershipPlanEndpoint,
    updateMembershipPlanEndpoint,
} from "./membership.api";

vi.mock("../../../core/fetcher", () => ({ fetcher: vi.fn() }));

import { fetcher } from "../../../core/fetcher";
const mockFetcher = vi.mocked(fetcher);

beforeEach(() => {
    mockFetcher.mockReset();
});

describe("createMembershipPlanEndpoint", () => {
    it("calls POST /api/v1/clubs/:clubId/membership-plans with body", async () => {
        mockFetcher.mockResolvedValue({});
        const data = {
            club_id: "club-1",
            name: "Gold",
            billing_period: "monthly" as const,
            price: 49.99,
        };
        await createMembershipPlanEndpoint("club-1", data);
        expect(mockFetcher).toHaveBeenCalledWith("/api/v1/clubs/club-1/membership-plans", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
    });
});

describe("listMembershipPlansEndpoint", () => {
    it("calls GET /api/v1/clubs/:clubId/membership-plans", async () => {
        mockFetcher.mockResolvedValue([]);
        await listMembershipPlansEndpoint("club-1");
        expect(mockFetcher).toHaveBeenCalledWith("/api/v1/clubs/club-1/membership-plans");
    });
});

describe("getMembershipPlanEndpoint", () => {
    it("calls GET /api/v1/clubs/:clubId/membership-plans/:planId", async () => {
        mockFetcher.mockResolvedValue({});
        await getMembershipPlanEndpoint("club-1", "plan-1");
        expect(mockFetcher).toHaveBeenCalledWith("/api/v1/clubs/club-1/membership-plans/plan-1");
    });
});

describe("updateMembershipPlanEndpoint", () => {
    it("calls PATCH /api/v1/clubs/:clubId/membership-plans/:planId with body", async () => {
        mockFetcher.mockResolvedValue({});
        const data = { name: "Platinum", price: 79.99 };
        await updateMembershipPlanEndpoint("club-1", "plan-1", data);
        expect(mockFetcher).toHaveBeenCalledWith("/api/v1/clubs/club-1/membership-plans/plan-1", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
    });
});
