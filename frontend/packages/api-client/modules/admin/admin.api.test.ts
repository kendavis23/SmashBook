import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    onboardTenantEndpoint,
    listPlansEndpoint,
    createPlanEndpoint,
    getPlanEndpoint,
    updatePlanEndpoint,
    listTenantsEndpoint,
    getTenantEndpoint,
    updateTenantEndpoint,
    activateTenantEndpoint,
    suspendTenantEndpoint,
    changeTenantPlanEndpoint,
} from "./admin.api";

vi.mock("./fetcher", () => ({ adminFetcher: vi.fn() }));

import { adminFetcher } from "./fetcher";
const mockFetcher = vi.mocked(adminFetcher);

beforeEach(() => {
    mockFetcher.mockReset();
});

const PLATFORM_KEY = "test-platform-key";
const PLAN_ID = "plan-111";
const TENANT_ID = "tenant-222";

const JSON_HEADERS = { "Content-Type": "application/json" };

const mockPlan = {
    id: PLAN_ID,
    name: "Starter",
    max_clubs: 1,
    max_courts_per_club: 4,
    max_staff_users: -1,
    open_games_feature: false,
    waitlist_feature: false,
    white_label_enabled: false,
    analytics_enabled: false,
    price_per_month: 49,
    setup_fee: 0,
    trial_days: 14,
    booking_fee_pct: null,
    revenue_share_pct: null,
    third_party_revenue_share_pct: null,
    overage_fee_per_booking: null,
    max_api_calls_per_month: null,
    stripe_price_id: "price_abc",
};

const mockTenantSummary = {
    id: TENANT_ID,
    name: "Ace Club",
    subdomain: "ace",
    custom_domain: null,
    plan_id: PLAN_ID,
    plan_name: "Starter",
    is_active: true,
    subscription_status: "active" as const,
    subscription_start_date: "2026-01-01T00:00:00Z",
    club_count: 1,
    created_at: "2026-01-01T00:00:00Z",
};

const mockTenantDetail = {
    ...mockTenantSummary,
    stripe_customer_id: "cus_abc",
    stripe_subscription_id: "sub_abc",
    updated_at: "2026-01-02T00:00:00Z",
};

describe("onboardTenantEndpoint", () => {
    it("calls POST /api/v1/admin/onboard with platform key and body", async () => {
        mockFetcher.mockResolvedValue({ tenant_id: TENANT_ID, club_id: "club-1", courts: [] });
        const data = {
            name: "Ace Club",
            subdomain: "ace",
            plan_id: PLAN_ID,
            club: { name: "Ace Club London" },
            courts: [{ name: "Court 1", surface_type: "indoor" as const }],
            owner: { email: "owner@ace.com", full_name: "Owner", password: "secret" },
        };
        await onboardTenantEndpoint(PLATFORM_KEY, data);
        expect(mockFetcher).toHaveBeenCalledWith("/api/v1/admin/onboard", PLATFORM_KEY, {
            method: "POST",
            headers: JSON_HEADERS,
            body: JSON.stringify(data),
        });
    });
});

describe("listPlansEndpoint", () => {
    it("calls GET /api/v1/admin/plans with platform key", async () => {
        mockFetcher.mockResolvedValue([mockPlan]);
        await listPlansEndpoint(PLATFORM_KEY);
        expect(mockFetcher).toHaveBeenCalledWith("/api/v1/admin/plans", PLATFORM_KEY);
    });
});

describe("createPlanEndpoint", () => {
    it("calls POST /api/v1/admin/plans with platform key and body", async () => {
        mockFetcher.mockResolvedValue(mockPlan);
        const data = { name: "Starter", max_clubs: 1, max_courts_per_club: 4, price_per_month: 49 };
        await createPlanEndpoint(PLATFORM_KEY, data);
        expect(mockFetcher).toHaveBeenCalledWith("/api/v1/admin/plans", PLATFORM_KEY, {
            method: "POST",
            headers: JSON_HEADERS,
            body: JSON.stringify(data),
        });
    });
});

describe("getPlanEndpoint", () => {
    it("calls GET /api/v1/admin/plans/:planId with platform key", async () => {
        mockFetcher.mockResolvedValue(mockPlan);
        await getPlanEndpoint(PLATFORM_KEY, PLAN_ID);
        expect(mockFetcher).toHaveBeenCalledWith(`/api/v1/admin/plans/${PLAN_ID}`, PLATFORM_KEY);
    });
});

describe("updatePlanEndpoint", () => {
    it("calls PUT /api/v1/admin/plans/:planId with platform key and body", async () => {
        mockFetcher.mockResolvedValue(mockPlan);
        const data = { name: "Starter Plus" };
        await updatePlanEndpoint(PLATFORM_KEY, PLAN_ID, data);
        expect(mockFetcher).toHaveBeenCalledWith(`/api/v1/admin/plans/${PLAN_ID}`, PLATFORM_KEY, {
            method: "PUT",
            headers: JSON_HEADERS,
            body: JSON.stringify(data),
        });
    });
});

describe("listTenantsEndpoint", () => {
    it("calls GET /api/v1/admin/tenants with platform key", async () => {
        mockFetcher.mockResolvedValue([mockTenantSummary]);
        await listTenantsEndpoint(PLATFORM_KEY);
        expect(mockFetcher).toHaveBeenCalledWith("/api/v1/admin/tenants", PLATFORM_KEY);
    });
});

describe("getTenantEndpoint", () => {
    it("calls GET /api/v1/admin/tenants/:tenantId with platform key", async () => {
        mockFetcher.mockResolvedValue(mockTenantDetail);
        await getTenantEndpoint(PLATFORM_KEY, TENANT_ID);
        expect(mockFetcher).toHaveBeenCalledWith(
            `/api/v1/admin/tenants/${TENANT_ID}`,
            PLATFORM_KEY
        );
    });
});

describe("updateTenantEndpoint", () => {
    it("calls PATCH /api/v1/admin/tenants/:tenantId with platform key and body", async () => {
        mockFetcher.mockResolvedValue(mockTenantDetail);
        const data = { subdomain: "ace-new" };
        await updateTenantEndpoint(PLATFORM_KEY, TENANT_ID, data);
        expect(mockFetcher).toHaveBeenCalledWith(
            `/api/v1/admin/tenants/${TENANT_ID}`,
            PLATFORM_KEY,
            { method: "PATCH", headers: JSON_HEADERS, body: JSON.stringify(data) }
        );
    });
});

describe("activateTenantEndpoint", () => {
    it("calls POST /api/v1/admin/tenants/:tenantId/activate with platform key and body", async () => {
        mockFetcher.mockResolvedValue(mockTenantDetail);
        const data = { billing_email: "billing@ace.com" };
        await activateTenantEndpoint(PLATFORM_KEY, TENANT_ID, data);
        expect(mockFetcher).toHaveBeenCalledWith(
            `/api/v1/admin/tenants/${TENANT_ID}/activate`,
            PLATFORM_KEY,
            { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(data) }
        );
    });
});

describe("suspendTenantEndpoint", () => {
    it("calls POST /api/v1/admin/tenants/:tenantId/suspend with platform key", async () => {
        mockFetcher.mockResolvedValue(mockTenantDetail);
        await suspendTenantEndpoint(PLATFORM_KEY, TENANT_ID);
        expect(mockFetcher).toHaveBeenCalledWith(
            `/api/v1/admin/tenants/${TENANT_ID}/suspend`,
            PLATFORM_KEY,
            { method: "POST" }
        );
    });
});

describe("changeTenantPlanEndpoint", () => {
    it("calls POST /api/v1/admin/tenants/:tenantId/change-plan with platform key and body", async () => {
        mockFetcher.mockResolvedValue(mockTenantDetail);
        const data = { plan_id: "plan-999" };
        await changeTenantPlanEndpoint(PLATFORM_KEY, TENANT_ID, data);
        expect(mockFetcher).toHaveBeenCalledWith(
            `/api/v1/admin/tenants/${TENANT_ID}/change-plan`,
            PLATFORM_KEY,
            { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(data) }
        );
    });
});
