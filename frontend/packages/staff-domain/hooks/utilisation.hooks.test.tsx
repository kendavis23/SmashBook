import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("@repo/api-client/modules/staff", () => ({
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
    createCourtEndpoint: vi.fn(),
    updateCourtEndpoint: vi.fn(),
    listCalendarReservationsEndpoint: vi.fn(),
    createCalendarReservationEndpoint: vi.fn(),
    getCalendarReservationEndpoint: vi.fn(),
    updateCalendarReservationEndpoint: vi.fn(),
    deleteCalendarReservationEndpoint: vi.fn(),
    getClubDailyUtilisationEndpoint: vi.fn(),
    getClubCourtsUtilisationEndpoint: vi.fn(),
    getClubUtilisationHeatmapEndpoint: vi.fn(),
}));

import * as staffApi from "@repo/api-client/modules/staff";
import {
    useClubDailyUtilisation,
    useClubCourtsUtilisation,
    useClubUtilisationHeatmap,
} from "./utilisation.hooks";

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

const mockDailyUtilisation = {
    club_id: CLUB_ID,
    date_from: "2026-05-01",
    date_to: "2026-05-31",
    points: [
        {
            snapshot_date: "2026-05-01",
            total_slots: 10,
            booked_slots: 7,
            utilisation_pct: 70,
            revenue_actual: 140,
            revenue_potential: 200,
        },
    ],
};

const mockCourtsUtilisation = {
    club_id: CLUB_ID,
    date_from: "2026-05-01",
    date_to: "2026-05-31",
    courts: [
        {
            court_id: "court-1",
            court_name: "Court 1",
            total_slots: 10,
            booked_slots: 8,
            utilisation_pct: 80,
            revenue_actual: 160,
            revenue_potential: 200,
        },
    ],
};

const mockHeatmap = {
    club_id: CLUB_ID,
    date_from: "2026-05-01",
    date_to: "2026-05-31",
    cells: [
        {
            day_of_week: 0,
            hour_of_day: 9,
            avg_utilisation_pct: 75,
            total_slots: 4,
            booked_slots: 3,
        },
    ],
};

// ---------------------------------------------------------------------------
// useClubDailyUtilisation
// ---------------------------------------------------------------------------

describe("useClubDailyUtilisation", () => {
    it("returns daily utilisation for a club", async () => {
        vi.mocked(staffApi.getClubDailyUtilisationEndpoint).mockResolvedValue(mockDailyUtilisation);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useClubDailyUtilisation(CLUB_ID), {
            wrapper: Wrapper,
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(mockDailyUtilisation);
        expect(staffApi.getClubDailyUtilisationEndpoint).toHaveBeenCalledWith(CLUB_ID, {
            date_from: undefined,
            date_to: undefined,
        });
    });

    it("passes date range params to the endpoint", async () => {
        vi.mocked(staffApi.getClubDailyUtilisationEndpoint).mockResolvedValue(mockDailyUtilisation);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(
            () =>
                useClubDailyUtilisation(CLUB_ID, { dateFrom: "2026-05-01", dateTo: "2026-05-31" }),
            { wrapper: Wrapper }
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(staffApi.getClubDailyUtilisationEndpoint).toHaveBeenCalledWith(CLUB_ID, {
            date_from: "2026-05-01",
            date_to: "2026-05-31",
        });
    });

    it("does not fetch when clubId is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useClubDailyUtilisation(""), { wrapper: Wrapper });
        expect(staffApi.getClubDailyUtilisationEndpoint).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// useClubCourtsUtilisation
// ---------------------------------------------------------------------------

describe("useClubCourtsUtilisation", () => {
    it("returns per-court utilisation for a club", async () => {
        vi.mocked(staffApi.getClubCourtsUtilisationEndpoint).mockResolvedValue(
            mockCourtsUtilisation
        );
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useClubCourtsUtilisation(CLUB_ID), {
            wrapper: Wrapper,
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(mockCourtsUtilisation);
        expect(staffApi.getClubCourtsUtilisationEndpoint).toHaveBeenCalledWith(CLUB_ID, {
            date_from: undefined,
            date_to: undefined,
        });
    });

    it("passes date range params to the endpoint", async () => {
        vi.mocked(staffApi.getClubCourtsUtilisationEndpoint).mockResolvedValue(
            mockCourtsUtilisation
        );
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(
            () =>
                useClubCourtsUtilisation(CLUB_ID, {
                    dateFrom: "2026-05-01",
                    dateTo: "2026-05-31",
                }),
            { wrapper: Wrapper }
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(staffApi.getClubCourtsUtilisationEndpoint).toHaveBeenCalledWith(CLUB_ID, {
            date_from: "2026-05-01",
            date_to: "2026-05-31",
        });
    });

    it("does not fetch when clubId is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useClubCourtsUtilisation(""), { wrapper: Wrapper });
        expect(staffApi.getClubCourtsUtilisationEndpoint).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// useClubUtilisationHeatmap
// ---------------------------------------------------------------------------

describe("useClubUtilisationHeatmap", () => {
    it("returns heatmap data for a club", async () => {
        vi.mocked(staffApi.getClubUtilisationHeatmapEndpoint).mockResolvedValue(mockHeatmap);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useClubUtilisationHeatmap(CLUB_ID), {
            wrapper: Wrapper,
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(mockHeatmap);
        expect(staffApi.getClubUtilisationHeatmapEndpoint).toHaveBeenCalledWith(CLUB_ID, {
            date_from: undefined,
            date_to: undefined,
        });
    });

    it("passes date range params to the endpoint", async () => {
        vi.mocked(staffApi.getClubUtilisationHeatmapEndpoint).mockResolvedValue(mockHeatmap);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(
            () =>
                useClubUtilisationHeatmap(CLUB_ID, {
                    dateFrom: "2026-05-01",
                    dateTo: "2026-05-31",
                }),
            { wrapper: Wrapper }
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(staffApi.getClubUtilisationHeatmapEndpoint).toHaveBeenCalledWith(CLUB_ID, {
            date_from: "2026-05-01",
            date_to: "2026-05-31",
        });
    });

    it("does not fetch when clubId is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useClubUtilisationHeatmap(""), { wrapper: Wrapper });
        expect(staffApi.getClubUtilisationHeatmapEndpoint).not.toHaveBeenCalled();
    });
});
