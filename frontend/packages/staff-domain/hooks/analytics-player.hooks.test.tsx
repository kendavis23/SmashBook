import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("@repo/api-client/modules/staff", () => ({
    getPlayerValueLeaderboardEndpoint: vi.fn(),
    getMostActivePlayersEndpoint: vi.fn(),
    getInactiveMembersEndpoint: vi.fn(),
    getPlayerValueByGroupEndpoint: vi.fn(),
    getActivePlayersKpiEndpoint: vi.fn(),
    getActivePlayersTimeseriesEndpoint: vi.fn(),
    getSignupsTimeseriesEndpoint: vi.fn(),
}));

import * as staffApi from "@repo/api-client/modules/staff";
import {
    usePlayerValueLeaderboard,
    useMostActivePlayers,
    useInactiveMembers,
    usePlayerValueByGroup,
    useActivePlayersKpi,
    useActivePlayersTimeseries,
    useSignupsTimeseries,
} from "./analytics-player.hooks";

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

const mockPlayerRow = {
    user_id: "user-1",
    full_name: "Ana Gomez",
    email: "ana@example.com",
    is_paid_member: true,
    membership_plan_name: "Pro",
    first_played_at: "2025-01-01T10:00:00Z",
    last_played_at: "2026-05-30T10:00:00Z",
    bookings_played: 42,
    played_last_30d: 4,
    played_last_90d: 12,
    lifetime_gross: 1200,
    lifetime_refunds: 50,
    lifetime_spend: 1150,
    payments_count: 20,
    currency: "EUR",
    recency_score: 4,
    frequency_score: 5,
    value_score: 3,
    rfv_total: 12,
    rfv_cell: "453",
};

const mockValueLeaderboard = {
    club_id: CLUB_ID,
    members_only: false,
    sort: "lifetime_spend" as const,
    limit: 50,
    offset: 0,
    rows: [mockPlayerRow],
};

const mockActivityLeaderboard = {
    club_id: CLUB_ID,
    window_days: 30,
    limit: 50,
    offset: 0,
    rows: [mockPlayerRow],
};

const mockInactiveReport = {
    club_id: CLUB_ID,
    inactive_days: 30,
    cutoff: "2026-05-03T00:00:00Z",
    member_count: 100,
    inactive_count: 15,
    limit: 50,
    offset: 0,
    rows: [mockPlayerRow],
};

const mockGroupReport = {
    club_id: CLUB_ID,
    dimension: "membership_tier" as const,
    inactive_days: 30,
    currency: "EUR",
    rows: [
        {
            group_key: "Pro",
            group_label: "Pro",
            player_count: 20,
            paid_member_count: 20,
            total_lifetime_spend: 24000,
            avg_lifetime_spend: 1200,
            total_lifetime_refunds: 1000,
            total_bookings_played: 840,
        },
    ],
};

const mockActiveKpi = {
    club_id: CLUB_ID,
    as_of: "2026-06-03",
    window_days: 30,
    active_players: 87,
};

const mockActiveTimeseries = {
    club_id: CLUB_ID,
    granularity: "week" as const,
    date_from: "2026-05-01",
    date_to: "2026-06-01",
    points: [{ period_start: "2026-05-05", active_players: 40 }],
};

const mockSignupsTimeseries = {
    club_id: CLUB_ID,
    granularity: "month" as const,
    date_from: "2026-01-01",
    date_to: "2026-06-01",
    total_signups: 85,
    points: [{ period_start: "2026-01-01", signups: 15 }],
};

// ---------------------------------------------------------------------------
// usePlayerValueLeaderboard
// ---------------------------------------------------------------------------

describe("usePlayerValueLeaderboard", () => {
    it("returns leaderboard data for a club", async () => {
        vi.mocked(staffApi.getPlayerValueLeaderboardEndpoint).mockResolvedValue(
            mockValueLeaderboard
        );
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => usePlayerValueLeaderboard(CLUB_ID), {
            wrapper: Wrapper,
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(mockValueLeaderboard);
        expect(staffApi.getPlayerValueLeaderboardEndpoint).toHaveBeenCalledWith(CLUB_ID, {});
    });

    it("passes params to the endpoint", async () => {
        vi.mocked(staffApi.getPlayerValueLeaderboardEndpoint).mockResolvedValue(
            mockValueLeaderboard
        );
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(
            () =>
                usePlayerValueLeaderboard(CLUB_ID, {
                    members_only: true,
                    sort: "bookings_played",
                    limit: 10,
                    offset: 20,
                }),
            { wrapper: Wrapper }
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(staffApi.getPlayerValueLeaderboardEndpoint).toHaveBeenCalledWith(CLUB_ID, {
            members_only: true,
            sort: "bookings_played",
            limit: 10,
            offset: 20,
        });
    });

    it("does not fetch when clubId is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => usePlayerValueLeaderboard(""), { wrapper: Wrapper });
        expect(staffApi.getPlayerValueLeaderboardEndpoint).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// useMostActivePlayers
// ---------------------------------------------------------------------------

describe("useMostActivePlayers", () => {
    it("returns most-active players for a club", async () => {
        vi.mocked(staffApi.getMostActivePlayersEndpoint).mockResolvedValue(mockActivityLeaderboard);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useMostActivePlayers(CLUB_ID), {
            wrapper: Wrapper,
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(mockActivityLeaderboard);
        expect(staffApi.getMostActivePlayersEndpoint).toHaveBeenCalledWith(CLUB_ID, {});
    });

    it("passes window_days param", async () => {
        vi.mocked(staffApi.getMostActivePlayersEndpoint).mockResolvedValue(mockActivityLeaderboard);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(
            () => useMostActivePlayers(CLUB_ID, { window_days: 90, limit: 25 }),
            { wrapper: Wrapper }
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(staffApi.getMostActivePlayersEndpoint).toHaveBeenCalledWith(CLUB_ID, {
            window_days: 90,
            limit: 25,
        });
    });

    it("does not fetch when clubId is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useMostActivePlayers(""), { wrapper: Wrapper });
        expect(staffApi.getMostActivePlayersEndpoint).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// useInactiveMembers
// ---------------------------------------------------------------------------

describe("useInactiveMembers", () => {
    it("returns inactive members report for a club", async () => {
        vi.mocked(staffApi.getInactiveMembersEndpoint).mockResolvedValue(mockInactiveReport);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useInactiveMembers(CLUB_ID), { wrapper: Wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(mockInactiveReport);
        expect(staffApi.getInactiveMembersEndpoint).toHaveBeenCalledWith(CLUB_ID, {});
    });

    it("passes inactive_days param", async () => {
        vi.mocked(staffApi.getInactiveMembersEndpoint).mockResolvedValue(mockInactiveReport);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(
            () => useInactiveMembers(CLUB_ID, { inactive_days: 60, limit: 50, offset: 0 }),
            { wrapper: Wrapper }
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(staffApi.getInactiveMembersEndpoint).toHaveBeenCalledWith(CLUB_ID, {
            inactive_days: 60,
            limit: 50,
            offset: 0,
        });
    });

    it("does not fetch when clubId is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useInactiveMembers(""), { wrapper: Wrapper });
        expect(staffApi.getInactiveMembersEndpoint).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// usePlayerValueByGroup
// ---------------------------------------------------------------------------

describe("usePlayerValueByGroup", () => {
    it("returns group value report for a club", async () => {
        vi.mocked(staffApi.getPlayerValueByGroupEndpoint).mockResolvedValue(mockGroupReport);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => usePlayerValueByGroup(CLUB_ID), {
            wrapper: Wrapper,
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(mockGroupReport);
        expect(staffApi.getPlayerValueByGroupEndpoint).toHaveBeenCalledWith(CLUB_ID, {});
    });

    it("passes dimension and inactive_days params", async () => {
        vi.mocked(staffApi.getPlayerValueByGroupEndpoint).mockResolvedValue(mockGroupReport);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(
            () =>
                usePlayerValueByGroup(CLUB_ID, {
                    dimension: "activity_status",
                    inactive_days: 45,
                }),
            { wrapper: Wrapper }
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(staffApi.getPlayerValueByGroupEndpoint).toHaveBeenCalledWith(CLUB_ID, {
            dimension: "activity_status",
            inactive_days: 45,
        });
    });

    it("does not fetch when clubId is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => usePlayerValueByGroup(""), { wrapper: Wrapper });
        expect(staffApi.getPlayerValueByGroupEndpoint).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// useActivePlayersKpi
// ---------------------------------------------------------------------------

describe("useActivePlayersKpi", () => {
    it("returns active players KPI for a club", async () => {
        vi.mocked(staffApi.getActivePlayersKpiEndpoint).mockResolvedValue(mockActiveKpi);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useActivePlayersKpi(CLUB_ID), { wrapper: Wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(mockActiveKpi);
        expect(staffApi.getActivePlayersKpiEndpoint).toHaveBeenCalledWith(CLUB_ID, {});
    });

    it("passes window_days and as_of params", async () => {
        vi.mocked(staffApi.getActivePlayersKpiEndpoint).mockResolvedValue(mockActiveKpi);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(
            () => useActivePlayersKpi(CLUB_ID, { window_days: 90, as_of: "2026-06-01" }),
            { wrapper: Wrapper }
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(staffApi.getActivePlayersKpiEndpoint).toHaveBeenCalledWith(CLUB_ID, {
            window_days: 90,
            as_of: "2026-06-01",
        });
    });

    it("does not fetch when clubId is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useActivePlayersKpi(""), { wrapper: Wrapper });
        expect(staffApi.getActivePlayersKpiEndpoint).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// useActivePlayersTimeseries
// ---------------------------------------------------------------------------

describe("useActivePlayersTimeseries", () => {
    it("returns active players timeseries for a club", async () => {
        vi.mocked(staffApi.getActivePlayersTimeseriesEndpoint).mockResolvedValue(
            mockActiveTimeseries
        );
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useActivePlayersTimeseries(CLUB_ID), {
            wrapper: Wrapper,
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(mockActiveTimeseries);
        expect(staffApi.getActivePlayersTimeseriesEndpoint).toHaveBeenCalledWith(CLUB_ID, {});
    });

    it("passes granularity and date range params", async () => {
        vi.mocked(staffApi.getActivePlayersTimeseriesEndpoint).mockResolvedValue(
            mockActiveTimeseries
        );
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(
            () =>
                useActivePlayersTimeseries(CLUB_ID, {
                    granularity: "month",
                    date_from: "2026-01-01",
                    date_to: "2026-06-01",
                }),
            { wrapper: Wrapper }
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(staffApi.getActivePlayersTimeseriesEndpoint).toHaveBeenCalledWith(CLUB_ID, {
            granularity: "month",
            date_from: "2026-01-01",
            date_to: "2026-06-01",
        });
    });

    it("does not fetch when clubId is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useActivePlayersTimeseries(""), { wrapper: Wrapper });
        expect(staffApi.getActivePlayersTimeseriesEndpoint).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// useSignupsTimeseries
// ---------------------------------------------------------------------------

describe("useSignupsTimeseries", () => {
    it("returns signups timeseries for a club", async () => {
        vi.mocked(staffApi.getSignupsTimeseriesEndpoint).mockResolvedValue(mockSignupsTimeseries);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useSignupsTimeseries(CLUB_ID), {
            wrapper: Wrapper,
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(mockSignupsTimeseries);
        expect(staffApi.getSignupsTimeseriesEndpoint).toHaveBeenCalledWith(CLUB_ID, {});
    });

    it("passes granularity and date range params", async () => {
        vi.mocked(staffApi.getSignupsTimeseriesEndpoint).mockResolvedValue(mockSignupsTimeseries);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(
            () =>
                useSignupsTimeseries(CLUB_ID, {
                    granularity: "week",
                    date_from: "2026-05-01",
                    date_to: "2026-06-01",
                }),
            { wrapper: Wrapper }
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(staffApi.getSignupsTimeseriesEndpoint).toHaveBeenCalledWith(CLUB_ID, {
            granularity: "week",
            date_from: "2026-05-01",
            date_to: "2026-06-01",
        });
    });

    it("does not fetch when clubId is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useSignupsTimeseries(""), { wrapper: Wrapper });
        expect(staffApi.getSignupsTimeseriesEndpoint).not.toHaveBeenCalled();
    });
});
