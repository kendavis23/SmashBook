import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("@repo/api-client/modules/staff", () => ({
    getClubRevenueTimeseriesEndpoint: vi.fn(),
    getClubRevenueByTypeEndpoint: vi.fn(),
    getClubRevenueSummaryEndpoint: vi.fn(),
    getTenantRevenueComparisonEndpoint: vi.fn(),
}));

import * as staffApi from "@repo/api-client/modules/staff";
import {
    useClubRevenueTimeseries,
    useClubRevenueByType,
    useClubRevenueSummary,
    useTenantRevenueComparison,
} from "./revenue.hooks";

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

const mockByTypeRow = {
    revenue_type: "regular",
    gross_amount: 500,
    refund_amount: 50,
    net_amount: 450,
    transaction_count: 10,
};

const mockTimeseries = {
    club_id: CLUB_ID,
    basis: "service" as const,
    granularity: "day" as const,
    date_from: "2026-05-01",
    date_to: "2026-05-31",
    currency: "EUR",
    points: [
        {
            period_start: "2026-05-01",
            gross_amount: 200,
            refund_amount: 20,
            net_amount: 180,
            transaction_count: 4,
        },
    ],
};

const mockByType = {
    club_id: CLUB_ID,
    basis: "service" as const,
    date_from: "2026-05-01",
    date_to: "2026-05-31",
    currency: "EUR",
    rows: [mockByTypeRow],
};

const mockSummary = {
    club_id: CLUB_ID,
    basis: "service" as const,
    date_from: "2026-05-01",
    date_to: "2026-05-31",
    currency: "EUR",
    gross_amount: 500,
    refund_amount: 50,
    net_amount: 450,
    transaction_count: 10,
    avg_transaction_value: 45,
    by_type: [mockByTypeRow],
};

const mockComparison = {
    basis: "service" as const,
    date_from: "2026-05-01",
    date_to: "2026-05-31",
    clubs: [
        {
            club_id: CLUB_ID,
            club_name: "Club One",
            currency: "EUR",
            gross_amount: 500,
            refund_amount: 50,
            net_amount: 450,
            transaction_count: 10,
        },
    ],
};

// ---------------------------------------------------------------------------
// useClubRevenueTimeseries
// ---------------------------------------------------------------------------

describe("useClubRevenueTimeseries", () => {
    it("returns timeseries data for a club", async () => {
        vi.mocked(staffApi.getClubRevenueTimeseriesEndpoint).mockResolvedValue(mockTimeseries);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useClubRevenueTimeseries(CLUB_ID), {
            wrapper: Wrapper,
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(mockTimeseries);
        expect(staffApi.getClubRevenueTimeseriesEndpoint).toHaveBeenCalledWith(CLUB_ID, {
            granularity: undefined,
            basis: undefined,
            date_from: undefined,
            date_to: undefined,
        });
    });

    it("passes params to the endpoint", async () => {
        vi.mocked(staffApi.getClubRevenueTimeseriesEndpoint).mockResolvedValue(mockTimeseries);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(
            () =>
                useClubRevenueTimeseries(CLUB_ID, {
                    granularity: "week",
                    basis: "cash",
                    dateFrom: "2026-05-01",
                    dateTo: "2026-05-31",
                }),
            { wrapper: Wrapper }
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(staffApi.getClubRevenueTimeseriesEndpoint).toHaveBeenCalledWith(CLUB_ID, {
            granularity: "week",
            basis: "cash",
            date_from: "2026-05-01",
            date_to: "2026-05-31",
        });
    });

    it("does not fetch when clubId is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useClubRevenueTimeseries(""), { wrapper: Wrapper });
        expect(staffApi.getClubRevenueTimeseriesEndpoint).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// useClubRevenueByType
// ---------------------------------------------------------------------------

describe("useClubRevenueByType", () => {
    it("returns by-type data for a club", async () => {
        vi.mocked(staffApi.getClubRevenueByTypeEndpoint).mockResolvedValue(mockByType);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useClubRevenueByType(CLUB_ID), {
            wrapper: Wrapper,
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(mockByType);
        expect(staffApi.getClubRevenueByTypeEndpoint).toHaveBeenCalledWith(CLUB_ID, {
            basis: undefined,
            date_from: undefined,
            date_to: undefined,
        });
    });

    it("passes params to the endpoint", async () => {
        vi.mocked(staffApi.getClubRevenueByTypeEndpoint).mockResolvedValue(mockByType);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(
            () =>
                useClubRevenueByType(CLUB_ID, {
                    basis: "cash",
                    dateFrom: "2026-05-01",
                    dateTo: "2026-05-31",
                }),
            { wrapper: Wrapper }
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(staffApi.getClubRevenueByTypeEndpoint).toHaveBeenCalledWith(CLUB_ID, {
            basis: "cash",
            date_from: "2026-05-01",
            date_to: "2026-05-31",
        });
    });

    it("does not fetch when clubId is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useClubRevenueByType(""), { wrapper: Wrapper });
        expect(staffApi.getClubRevenueByTypeEndpoint).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// useClubRevenueSummary
// ---------------------------------------------------------------------------

describe("useClubRevenueSummary", () => {
    it("returns summary data for a club", async () => {
        vi.mocked(staffApi.getClubRevenueSummaryEndpoint).mockResolvedValue(mockSummary);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useClubRevenueSummary(CLUB_ID), {
            wrapper: Wrapper,
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(mockSummary);
        expect(staffApi.getClubRevenueSummaryEndpoint).toHaveBeenCalledWith(CLUB_ID, {
            basis: undefined,
            date_from: undefined,
            date_to: undefined,
        });
    });

    it("passes params to the endpoint", async () => {
        vi.mocked(staffApi.getClubRevenueSummaryEndpoint).mockResolvedValue(mockSummary);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(
            () =>
                useClubRevenueSummary(CLUB_ID, {
                    basis: "service",
                    dateFrom: "2026-05-01",
                    dateTo: "2026-05-31",
                }),
            { wrapper: Wrapper }
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(staffApi.getClubRevenueSummaryEndpoint).toHaveBeenCalledWith(CLUB_ID, {
            basis: "service",
            date_from: "2026-05-01",
            date_to: "2026-05-31",
        });
    });

    it("does not fetch when clubId is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useClubRevenueSummary(""), { wrapper: Wrapper });
        expect(staffApi.getClubRevenueSummaryEndpoint).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// useTenantRevenueComparison
// ---------------------------------------------------------------------------

describe("useTenantRevenueComparison", () => {
    it("returns tenant-wide comparison data", async () => {
        vi.mocked(staffApi.getTenantRevenueComparisonEndpoint).mockResolvedValue(mockComparison);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useTenantRevenueComparison(), { wrapper: Wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(mockComparison);
        expect(staffApi.getTenantRevenueComparisonEndpoint).toHaveBeenCalledWith({
            basis: undefined,
            date_from: undefined,
            date_to: undefined,
        });
    });

    it("passes params to the endpoint", async () => {
        vi.mocked(staffApi.getTenantRevenueComparisonEndpoint).mockResolvedValue(mockComparison);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(
            () =>
                useTenantRevenueComparison({
                    basis: "cash",
                    dateFrom: "2026-01-01",
                    dateTo: "2026-03-31",
                }),
            { wrapper: Wrapper }
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(staffApi.getTenantRevenueComparisonEndpoint).toHaveBeenCalledWith({
            basis: "cash",
            date_from: "2026-01-01",
            date_to: "2026-03-31",
        });
    });
});
