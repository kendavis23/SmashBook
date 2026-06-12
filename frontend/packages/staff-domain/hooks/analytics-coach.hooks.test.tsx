import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("@repo/api-client/modules/staff", () => ({
    getCoachPopularityLeaderboardEndpoint: vi.fn(),
}));

import * as staffApi from "@repo/api-client/modules/staff";
import { useCoachPopularityLeaderboard } from "./analytics-coach.hooks";

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

const CLUB_ID = "club-123";

const mockLeaderboard = {
    club_id: CLUB_ID,
    sort: "sessions" as const,
    limit: 50,
    offset: 0,
    total_records: 1,
    rows: [
        {
            staff_profile_id: "staff-1",
            user_id: "user-1",
            coach_name: "Carlos Ruiz",
            is_active: true,
            sessions: 80,
            first_session_at: "2025-01-10T10:00:00Z",
            last_session_at: "2026-06-10T10:00:00Z",
            sessions_last_30d: 8,
            sessions_last_90d: 22,
            distinct_players: 35,
            repeat_players: 20,
            return_rate: 0.57,
            total_attendances: 160,
            lesson_revenue: 4800,
            currency: "EUR",
        },
    ],
};

// ---------------------------------------------------------------------------
// useCoachPopularityLeaderboard
// ---------------------------------------------------------------------------

describe("useCoachPopularityLeaderboard", () => {
    it("returns leaderboard data for a club", async () => {
        vi.mocked(staffApi.getCoachPopularityLeaderboardEndpoint).mockResolvedValue(
            mockLeaderboard
        );
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useCoachPopularityLeaderboard(CLUB_ID), {
            wrapper: Wrapper,
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(mockLeaderboard);
        expect(staffApi.getCoachPopularityLeaderboardEndpoint).toHaveBeenCalledWith(CLUB_ID, {});
    });

    it("passes sort, limit, and offset params to the endpoint", async () => {
        vi.mocked(staffApi.getCoachPopularityLeaderboardEndpoint).mockResolvedValue(
            mockLeaderboard
        );
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(
            () =>
                useCoachPopularityLeaderboard(CLUB_ID, {
                    sort: "return_rate",
                    limit: 10,
                    offset: 20,
                }),
            { wrapper: Wrapper }
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(staffApi.getCoachPopularityLeaderboardEndpoint).toHaveBeenCalledWith(CLUB_ID, {
            sort: "return_rate",
            limit: 10,
            offset: 20,
        });
    });

    it("does not fetch when clubId is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useCoachPopularityLeaderboard(""), { wrapper: Wrapper });
        expect(staffApi.getCoachPopularityLeaderboardEndpoint).not.toHaveBeenCalled();
    });
});
