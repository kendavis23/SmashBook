import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// ---------------------------------------------------------------------------
// Mock the entire staff api-client module
// ---------------------------------------------------------------------------

vi.mock("@repo/api-client/modules/staff", () => ({
    // club endpoints
    listClubsEndpoint: vi.fn(),
    createClubEndpoint: vi.fn(),
    getClubEndpoint: vi.fn(),
    updateClubEndpoint: vi.fn(),
    updateClubSettingsEndpoint: vi.fn(),
    getOperatingHoursEndpoint: vi.fn(),
    setOperatingHoursEndpoint: vi.fn(),
    getPricingRulesEndpoint: vi.fn(),
    setPricingRulesEndpoint: vi.fn(),
    stripeConnectEndpoint: vi.fn(),
    // court endpoints
    listCourtsEndpoint: vi.fn(),
    createCourtEndpoint: vi.fn(),
    updateCourtEndpoint: vi.fn(),
    getCourtAvailabilityEndpoint: vi.fn(),
    listCalendarReservationsEndpoint: vi.fn(),
    createCalendarReservationEndpoint: vi.fn(),
    getCalendarReservationEndpoint: vi.fn(),
    updateCalendarReservationEndpoint: vi.fn(),
    deleteCalendarReservationEndpoint: vi.fn(),
    // booking endpoints
    listBookingsEndpoint: vi.fn(),
    getBookingEndpoint: vi.fn(),
    createBookingEndpoint: vi.fn(),
    updateBookingEndpoint: vi.fn(),
    cancelBookingEndpoint: vi.fn(),
    invitePlayerEndpoint: vi.fn(),
    getCalendarViewEndpoint: vi.fn(),
    listOpenGamesEndpoint: vi.fn(),
    // membership endpoints
    createMembershipPlanEndpoint: vi.fn(),
    listMembershipPlansEndpoint: vi.fn(),
    getMembershipPlanEndpoint: vi.fn(),
    updateMembershipPlanEndpoint: vi.fn(),
}));

import * as staffApi from "@repo/api-client/modules/staff";

import {
    useListMembershipPlans,
    useGetMembershipPlan,
    useCreateMembershipPlan,
    useUpdateMembershipPlan,
} from "./membership.hooks";

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

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const CLUB_ID = "club-123";
const PLAN_ID = "plan-456";

const mockPlan = {
    id: PLAN_ID,
    club_id: CLUB_ID,
    name: "Premium Monthly",
    description: "Full access plan",
    billing_period: "monthly" as const,
    price: 49.99,
    trial_days: 7,
    booking_credits_per_period: 10,
    guest_passes_per_period: 2,
    discount_pct: null,
    priority_booking_days: 3,
    max_active_members: 100,
    is_active: true,
    stripe_price_id: "price_abc123",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
};

// ---------------------------------------------------------------------------
// useListMembershipPlans
// ---------------------------------------------------------------------------

describe("useListMembershipPlans", () => {
    it("returns membership plans for a club", async () => {
        vi.mocked(staffApi.listMembershipPlansEndpoint).mockResolvedValue([mockPlan]);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useListMembershipPlans(CLUB_ID), { wrapper: Wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([mockPlan]);
        expect(staffApi.listMembershipPlansEndpoint).toHaveBeenCalledWith(CLUB_ID);
    });

    it("does not fetch when clubId is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useListMembershipPlans(""), { wrapper: Wrapper });
        expect(staffApi.listMembershipPlansEndpoint).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// useGetMembershipPlan
// ---------------------------------------------------------------------------

describe("useGetMembershipPlan", () => {
    it("returns a single membership plan by id", async () => {
        vi.mocked(staffApi.getMembershipPlanEndpoint).mockResolvedValue(mockPlan);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useGetMembershipPlan(CLUB_ID, PLAN_ID), {
            wrapper: Wrapper,
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(mockPlan);
        expect(staffApi.getMembershipPlanEndpoint).toHaveBeenCalledWith(CLUB_ID, PLAN_ID);
    });

    it("does not fetch when clubId is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useGetMembershipPlan("", PLAN_ID), { wrapper: Wrapper });
        expect(staffApi.getMembershipPlanEndpoint).not.toHaveBeenCalled();
    });

    it("does not fetch when planId is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useGetMembershipPlan(CLUB_ID, ""), { wrapper: Wrapper });
        expect(staffApi.getMembershipPlanEndpoint).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// useCreateMembershipPlan
// ---------------------------------------------------------------------------

describe("useCreateMembershipPlan", () => {
    it("calls createMembershipPlanEndpoint and invalidates list", async () => {
        vi.mocked(staffApi.createMembershipPlanEndpoint).mockResolvedValue(mockPlan);
        const { Wrapper, client } = makeWrapper();
        const invalidate = vi.spyOn(client, "invalidateQueries");
        const { result } = renderHook(() => useCreateMembershipPlan(CLUB_ID), {
            wrapper: Wrapper,
        });
        result.current.mutate({
            club_id: CLUB_ID,
            name: "Premium Monthly",
            billing_period: "monthly",
            price: 49.99,
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(staffApi.createMembershipPlanEndpoint).toHaveBeenCalledWith(CLUB_ID, {
            club_id: CLUB_ID,
            name: "Premium Monthly",
            billing_period: "monthly",
            price: 49.99,
        });
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["membership-plans", CLUB_ID] })
        );
    });
});

// ---------------------------------------------------------------------------
// useUpdateMembershipPlan
// ---------------------------------------------------------------------------

describe("useUpdateMembershipPlan", () => {
    it("calls updateMembershipPlanEndpoint and invalidates detail and list", async () => {
        vi.mocked(staffApi.updateMembershipPlanEndpoint).mockResolvedValue(mockPlan);
        const { Wrapper, client } = makeWrapper();
        const invalidate = vi.spyOn(client, "invalidateQueries");
        const { result } = renderHook(() => useUpdateMembershipPlan(CLUB_ID, PLAN_ID), {
            wrapper: Wrapper,
        });
        result.current.mutate({ name: "Updated Plan", price: 59.99 });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(staffApi.updateMembershipPlanEndpoint).toHaveBeenCalledWith(CLUB_ID, PLAN_ID, {
            name: "Updated Plan",
            price: 59.99,
        });
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["membership-plans", CLUB_ID, PLAN_ID] })
        );
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["membership-plans", CLUB_ID] })
        );
    });
});
