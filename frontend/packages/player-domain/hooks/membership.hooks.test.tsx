import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useMyMembership } from "./membership.hooks";

vi.mock("@repo/api-client/modules/player", () => ({
    getMyMembershipEndpoint: vi.fn(),
}));

import * as playerApi from "@repo/api-client/modules/player";

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

beforeEach(() => {
    vi.mocked(playerApi.getMyMembershipEndpoint).mockReset();
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
