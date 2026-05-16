import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import {
    useListMembershipPlans,
    useMyMembership,
    useSubscribeToMembership,
    useCancelMyMembership,
} from "./membership.hooks";

vi.mock("@repo/api-client/modules/player", () => ({
    getMyMembershipEndpoint: vi.fn(),
    subscribeToPlanEndpoint: vi.fn(),
    cancelMyMembershipEndpoint: vi.fn(),
}));

vi.mock("@repo/api-client/modules/share", () => ({
    listMembershipPlansEndpoint: vi.fn(),
}));

import * as playerApi from "@repo/api-client/modules/player";
import * as shareApi from "@repo/api-client/modules/share";

const CLUB_ID = "club-1";

const mockSubscription = {
    id: "sub-1",
    user_id: "user-1",
    club_id: CLUB_ID,
    status: "active" as const,
    current_period_start: "2026-05-01T00:00:00Z",
    current_period_end: "2026-06-01T00:00:00Z",
    cancel_at_period_end: false,
    cancelled_at: null,
    credits_remaining: 4,
    guest_passes_remaining: null,
    plan: {
        id: "plan-1",
        club_id: CLUB_ID,
        name: "Basic",
        description: null,
        billing_period: "monthly" as const,
        price: 29.99,
        trial_days: 0,
        booking_credits_per_period: null,
        guest_passes_per_period: null,
        discount_pct: null,
        priority_booking_days: null,
        max_active_members: null,
        is_active: true,
        stripe_price_id: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
    },
};

function makeWrapper() {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    return { client, Wrapper };
}

const mockPlan = {
    id: "plan-1",
    club_id: CLUB_ID,
    name: "Basic",
    description: null,
    billing_period: "monthly" as const,
    price: 29.99,
    trial_days: 0,
    booking_credits_per_period: null,
    guest_passes_per_period: null,
    discount_pct: null,
    priority_booking_days: null,
    max_active_members: null,
    is_active: true,
    stripe_price_id: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
};

beforeEach(() => {
    vi.mocked(shareApi.listMembershipPlansEndpoint).mockReset();
    vi.mocked(playerApi.getMyMembershipEndpoint).mockReset();
    vi.mocked(playerApi.subscribeToPlanEndpoint).mockReset();
    vi.mocked(playerApi.cancelMyMembershipEndpoint).mockReset();
});

const mockSubscribeResult = {
    subscription_id: "sub-1",
    stripe_subscription_id: "sub_stripe_1",
    status: "active" as const,
    current_period_start: "2026-05-01T00:00:00Z",
    current_period_end: "2026-06-01T00:00:00Z",
    credits_remaining: 4,
    guest_passes_remaining: null,
    client_secret: null,
};

describe("useListMembershipPlans", () => {
    it("returns plans for a club", async () => {
        vi.mocked(shareApi.listMembershipPlansEndpoint).mockResolvedValue([mockPlan]);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useListMembershipPlans(CLUB_ID), { wrapper: Wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([mockPlan]);
    });

    it("does not fetch when clubId is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useListMembershipPlans(""), { wrapper: Wrapper });
        expect(shareApi.listMembershipPlansEndpoint).not.toHaveBeenCalled();
    });
});

describe("useMyMembership", () => {
    it("returns the membership subscription for a club", async () => {
        vi.mocked(playerApi.getMyMembershipEndpoint).mockResolvedValue(mockSubscription);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useMyMembership(CLUB_ID), { wrapper: Wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(mockSubscription);
    });

    it("does not fetch when clubId is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useMyMembership(""), { wrapper: Wrapper });
        expect(playerApi.getMyMembershipEndpoint).not.toHaveBeenCalled();
    });

    it("does not fetch when disabled", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useMyMembership(CLUB_ID, { enabled: false }), { wrapper: Wrapper });
        expect(playerApi.getMyMembershipEndpoint).not.toHaveBeenCalled();
    });
});

describe("useSubscribeToMembership", () => {
    it("calls endpoint with correct args and invalidates membership query", async () => {
        vi.mocked(playerApi.subscribeToPlanEndpoint).mockResolvedValue(mockSubscribeResult);
        const { Wrapper, client } = makeWrapper();
        const invalidate = vi.spyOn(client, "invalidateQueries");
        const { result } = renderHook(() => useSubscribeToMembership(CLUB_ID), {
            wrapper: Wrapper,
        });
        const input = { plan_id: "plan-1", payment_method_id: "pm_123" };
        await act(async () => {
            result.current.mutate(input);
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(playerApi.subscribeToPlanEndpoint).toHaveBeenCalledWith(CLUB_ID, input);
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["membership", "me", CLUB_ID] })
        );
    });
});

describe("useCancelMyMembership", () => {
    it("calls endpoint and invalidates membership query", async () => {
        vi.mocked(playerApi.cancelMyMembershipEndpoint).mockResolvedValue(mockSubscription);
        const { Wrapper, client } = makeWrapper();
        const invalidate = vi.spyOn(client, "invalidateQueries");
        const { result } = renderHook(() => useCancelMyMembership(CLUB_ID), {
            wrapper: Wrapper,
        });
        await act(async () => {
            result.current.mutate();
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(playerApi.cancelMyMembershipEndpoint).toHaveBeenCalledWith(CLUB_ID);
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["membership", "me", CLUB_ID] })
        );
    });
});
