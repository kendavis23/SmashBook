import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// ---------------------------------------------------------------------------
// Mock the entire admin api-client module
// ---------------------------------------------------------------------------

vi.mock("@repo/api-client/modules/admin", () => ({
    onboardTenantEndpoint: vi.fn(),
    listPlansEndpoint: vi.fn(),
    createPlanEndpoint: vi.fn(),
    getPlanEndpoint: vi.fn(),
    updatePlanEndpoint: vi.fn(),
    listTenantsEndpoint: vi.fn(),
    getTenantEndpoint: vi.fn(),
    updateTenantEndpoint: vi.fn(),
    activateTenantEndpoint: vi.fn(),
    suspendTenantEndpoint: vi.fn(),
    changeTenantPlanEndpoint: vi.fn(),
}));

import * as adminApi from "@repo/api-client/modules/admin";

import {
    useOnboardTenant,
    useListPlans,
    useCreatePlan,
    useGetPlan,
    useUpdatePlan,
    useListTenants,
    useGetTenant,
    useUpdateTenant,
    useActivateTenant,
    useSuspendTenant,
    useChangeTenantPlan,
} from "./admin.hooks";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeWrapper() {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    return { client, Wrapper };
}

beforeEach(() => {
    vi.clearAllMocks();
});

const PLATFORM_KEY = "platform-key-123";
const PLAN_ID = "plan-abc";
const TENANT_ID = "tenant-xyz";

const mockPlan = {
    id: PLAN_ID,
    name: "Starter",
    max_clubs: 1,
    max_courts_per_club: 4,
    max_staff_users: 5,
    open_games_feature: false,
    waitlist_feature: false,
    white_label_enabled: false,
    analytics_enabled: false,
    price_per_month: 99,
    setup_fee: 0,
    trial_days: 14,
    booking_fee_pct: null,
    revenue_share_pct: null,
    third_party_revenue_share_pct: null,
    overage_fee_per_booking: null,
    max_api_calls_per_month: null,
    stripe_price_id: null,
};

const mockTenantSummary = {
    id: TENANT_ID,
    name: "Ace Club",
    trading_name: "Ace",
    player_subdomain: "ace-player",
    staff_subdomain: "ace-staff",
    custom_domain: null,
    plan_id: PLAN_ID,
    plan_name: "Starter",
    is_active: true,
    subscription_status: "active" as const,
    subscription_start_date: "2026-01-01",
    club_count: 1,
    created_at: "2026-01-01T00:00:00Z",
};

const mockTenantDetail = {
    ...mockTenantSummary,
    stripe_customer_id: "cus_123",
    stripe_subscription_id: "sub_456",
    updated_at: "2026-05-01T00:00:00Z",
};

const mockOnboardResult = {
    tenant_id: TENANT_ID,
    club_ids: ["club-111"],
    owner_id: "owner-999",
};

// ---------------------------------------------------------------------------
// useOnboardTenant
// ---------------------------------------------------------------------------

describe("useOnboardTenant", () => {
    it("calls onboardTenantEndpoint and invalidates tenants list", async () => {
        vi.mocked(adminApi.onboardTenantEndpoint).mockResolvedValue(mockOnboardResult);
        const { Wrapper, client } = makeWrapper();
        const invalidate = vi.spyOn(client, "invalidateQueries");
        const { result } = renderHook(() => useOnboardTenant(PLATFORM_KEY), { wrapper: Wrapper });
        const data = {
            name: "Ace Club",
            trading_name: "Ace",
            player_subdomain: "ace-player",
            staff_subdomain: "ace-staff",
            plan_id: PLAN_ID,
            clubs: [{ name: "Ace Club HQ" }],
            owner: { email: "owner@ace.com", full_name: "Owner", password: "secret" },
        };
        result.current.mutate(data);
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(adminApi.onboardTenantEndpoint).toHaveBeenCalledWith(PLATFORM_KEY, data);
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["tenants", PLATFORM_KEY] })
        );
    });
});

// ---------------------------------------------------------------------------
// useListPlans
// ---------------------------------------------------------------------------

describe("useListPlans", () => {
    it("returns plans for a platform key", async () => {
        vi.mocked(adminApi.listPlansEndpoint).mockResolvedValue([mockPlan]);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useListPlans(PLATFORM_KEY), { wrapper: Wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([mockPlan]);
        expect(adminApi.listPlansEndpoint).toHaveBeenCalledWith(PLATFORM_KEY);
    });

    it("does not fetch when platformKey is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useListPlans(""), { wrapper: Wrapper });
        expect(adminApi.listPlansEndpoint).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// useCreatePlan
// ---------------------------------------------------------------------------

describe("useCreatePlan", () => {
    it("calls createPlanEndpoint and invalidates plans list", async () => {
        vi.mocked(adminApi.createPlanEndpoint).mockResolvedValue(mockPlan);
        const { Wrapper, client } = makeWrapper();
        const invalidate = vi.spyOn(client, "invalidateQueries");
        const { result } = renderHook(() => useCreatePlan(PLATFORM_KEY), { wrapper: Wrapper });
        const data = { name: "Starter", max_clubs: 1, max_courts_per_club: 4, price_per_month: 99 };
        result.current.mutate(data);
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(adminApi.createPlanEndpoint).toHaveBeenCalledWith(PLATFORM_KEY, data);
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["plans", PLATFORM_KEY] })
        );
    });
});

// ---------------------------------------------------------------------------
// useGetPlan
// ---------------------------------------------------------------------------

describe("useGetPlan", () => {
    it("returns a single plan by id", async () => {
        vi.mocked(adminApi.getPlanEndpoint).mockResolvedValue(mockPlan);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useGetPlan(PLATFORM_KEY, PLAN_ID), {
            wrapper: Wrapper,
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(mockPlan);
        expect(adminApi.getPlanEndpoint).toHaveBeenCalledWith(PLATFORM_KEY, PLAN_ID);
    });

    it("does not fetch when planId is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useGetPlan(PLATFORM_KEY, ""), { wrapper: Wrapper });
        expect(adminApi.getPlanEndpoint).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// useUpdatePlan
// ---------------------------------------------------------------------------

describe("useUpdatePlan", () => {
    it("calls updatePlanEndpoint and invalidates list and detail", async () => {
        vi.mocked(adminApi.updatePlanEndpoint).mockResolvedValue(mockPlan);
        const { Wrapper, client } = makeWrapper();
        const invalidate = vi.spyOn(client, "invalidateQueries");
        const { result } = renderHook(() => useUpdatePlan(PLATFORM_KEY, PLAN_ID), {
            wrapper: Wrapper,
        });
        result.current.mutate({ name: "Pro" });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(adminApi.updatePlanEndpoint).toHaveBeenCalledWith(PLATFORM_KEY, PLAN_ID, {
            name: "Pro",
        });
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["plans", PLATFORM_KEY, PLAN_ID] })
        );
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["plans", PLATFORM_KEY] })
        );
    });
});

// ---------------------------------------------------------------------------
// useListTenants
// ---------------------------------------------------------------------------

describe("useListTenants", () => {
    it("returns tenants for a platform key", async () => {
        vi.mocked(adminApi.listTenantsEndpoint).mockResolvedValue([mockTenantSummary]);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useListTenants(PLATFORM_KEY), { wrapper: Wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([mockTenantSummary]);
        expect(adminApi.listTenantsEndpoint).toHaveBeenCalledWith(PLATFORM_KEY);
    });

    it("does not fetch when platformKey is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useListTenants(""), { wrapper: Wrapper });
        expect(adminApi.listTenantsEndpoint).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// useGetTenant
// ---------------------------------------------------------------------------

describe("useGetTenant", () => {
    it("returns tenant detail by id", async () => {
        vi.mocked(adminApi.getTenantEndpoint).mockResolvedValue(mockTenantDetail);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useGetTenant(PLATFORM_KEY, TENANT_ID), {
            wrapper: Wrapper,
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(mockTenantDetail);
        expect(adminApi.getTenantEndpoint).toHaveBeenCalledWith(PLATFORM_KEY, TENANT_ID);
    });

    it("does not fetch when tenantId is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useGetTenant(PLATFORM_KEY, ""), { wrapper: Wrapper });
        expect(adminApi.getTenantEndpoint).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// useUpdateTenant
// ---------------------------------------------------------------------------

describe("useUpdateTenant", () => {
    it("calls updateTenantEndpoint and invalidates list and detail", async () => {
        vi.mocked(adminApi.updateTenantEndpoint).mockResolvedValue(mockTenantDetail);
        const { Wrapper, client } = makeWrapper();
        const invalidate = vi.spyOn(client, "invalidateQueries");
        const { result } = renderHook(() => useUpdateTenant(PLATFORM_KEY, TENANT_ID), {
            wrapper: Wrapper,
        });
        result.current.mutate({
            name: "Ace Club Updated",
            player_subdomain: "ace-player-new",
            staff_subdomain: "ace-staff-new",
            owner_email: "new@ace.com",
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(adminApi.updateTenantEndpoint).toHaveBeenCalledWith(PLATFORM_KEY, TENANT_ID, {
            name: "Ace Club Updated",
            player_subdomain: "ace-player-new",
            staff_subdomain: "ace-staff-new",
            owner_email: "new@ace.com",
        });
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["tenants", PLATFORM_KEY, TENANT_ID] })
        );
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["tenants", PLATFORM_KEY] })
        );
    });
});

// ---------------------------------------------------------------------------
// useActivateTenant
// ---------------------------------------------------------------------------

describe("useActivateTenant", () => {
    it("calls activateTenantEndpoint and invalidates list and detail", async () => {
        vi.mocked(adminApi.activateTenantEndpoint).mockResolvedValue(mockTenantDetail);
        const { Wrapper, client } = makeWrapper();
        const invalidate = vi.spyOn(client, "invalidateQueries");
        const { result } = renderHook(() => useActivateTenant(PLATFORM_KEY, TENANT_ID), {
            wrapper: Wrapper,
        });
        result.current.mutate({ billing_email: "billing@ace.com" });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(adminApi.activateTenantEndpoint).toHaveBeenCalledWith(PLATFORM_KEY, TENANT_ID, {
            billing_email: "billing@ace.com",
        });
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["tenants", PLATFORM_KEY, TENANT_ID] })
        );
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["tenants", PLATFORM_KEY] })
        );
    });
});

// ---------------------------------------------------------------------------
// useSuspendTenant
// ---------------------------------------------------------------------------

describe("useSuspendTenant", () => {
    it("calls suspendTenantEndpoint and invalidates list and detail", async () => {
        vi.mocked(adminApi.suspendTenantEndpoint).mockResolvedValue(mockTenantDetail);
        const { Wrapper, client } = makeWrapper();
        const invalidate = vi.spyOn(client, "invalidateQueries");
        const { result } = renderHook(() => useSuspendTenant(PLATFORM_KEY, TENANT_ID), {
            wrapper: Wrapper,
        });
        result.current.mutate();
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(adminApi.suspendTenantEndpoint).toHaveBeenCalledWith(PLATFORM_KEY, TENANT_ID);
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["tenants", PLATFORM_KEY, TENANT_ID] })
        );
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["tenants", PLATFORM_KEY] })
        );
    });
});

// ---------------------------------------------------------------------------
// useChangeTenantPlan
// ---------------------------------------------------------------------------

describe("useChangeTenantPlan", () => {
    it("calls changeTenantPlanEndpoint and invalidates list and detail", async () => {
        vi.mocked(adminApi.changeTenantPlanEndpoint).mockResolvedValue(mockTenantDetail);
        const { Wrapper, client } = makeWrapper();
        const invalidate = vi.spyOn(client, "invalidateQueries");
        const { result } = renderHook(() => useChangeTenantPlan(PLATFORM_KEY, TENANT_ID), {
            wrapper: Wrapper,
        });
        result.current.mutate({ plan_id: "plan-pro" });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(adminApi.changeTenantPlanEndpoint).toHaveBeenCalledWith(PLATFORM_KEY, TENANT_ID, {
            plan_id: "plan-pro",
        });
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["tenants", PLATFORM_KEY, TENANT_ID] })
        );
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["tenants", PLATFORM_KEY] })
        );
    });
});
