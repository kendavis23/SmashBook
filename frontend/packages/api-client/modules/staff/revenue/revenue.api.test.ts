import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    getClubRevenueTimeseriesEndpoint,
    getClubRevenueByTypeEndpoint,
    getClubRevenueSummaryEndpoint,
    getTenantRevenueComparisonEndpoint,
} from "./revenue.api";

vi.mock("../../../core/fetcher", () => ({ fetcher: vi.fn() }));

import { fetcher } from "../../../core/fetcher";
const mockFetcher = vi.mocked(fetcher);

beforeEach(() => {
    mockFetcher.mockReset();
});

describe("getClubRevenueTimeseriesEndpoint", () => {
    it("calls GET /api/v1/analytics/revenue/clubs/:clubId/timeseries with no params", async () => {
        mockFetcher.mockResolvedValue({});
        await getClubRevenueTimeseriesEndpoint("club-1");
        expect(mockFetcher).toHaveBeenCalledWith(
            "/api/v1/analytics/revenue/clubs/club-1/timeseries"
        );
    });

    it("appends query params when provided", async () => {
        mockFetcher.mockResolvedValue({});
        await getClubRevenueTimeseriesEndpoint("club-1", {
            granularity: "week",
            basis: "cash",
            date_from: "2026-01-01",
            date_to: "2026-01-31",
        });
        expect(mockFetcher).toHaveBeenCalledWith(
            "/api/v1/analytics/revenue/clubs/club-1/timeseries?granularity=week&basis=cash&date_from=2026-01-01&date_to=2026-01-31"
        );
    });
});

describe("getClubRevenueByTypeEndpoint", () => {
    it("calls GET /api/v1/analytics/revenue/clubs/:clubId/by-type with no params", async () => {
        mockFetcher.mockResolvedValue({});
        await getClubRevenueByTypeEndpoint("club-1");
        expect(mockFetcher).toHaveBeenCalledWith("/api/v1/analytics/revenue/clubs/club-1/by-type");
    });

    it("appends query params when provided", async () => {
        mockFetcher.mockResolvedValue({});
        await getClubRevenueByTypeEndpoint("club-1", {
            basis: "service",
            date_from: "2026-01-01",
            date_to: "2026-01-31",
        });
        expect(mockFetcher).toHaveBeenCalledWith(
            "/api/v1/analytics/revenue/clubs/club-1/by-type?basis=service&date_from=2026-01-01&date_to=2026-01-31"
        );
    });
});

describe("getClubRevenueSummaryEndpoint", () => {
    it("calls GET /api/v1/analytics/revenue/clubs/:clubId/summary with no params", async () => {
        mockFetcher.mockResolvedValue({});
        await getClubRevenueSummaryEndpoint("club-1");
        expect(mockFetcher).toHaveBeenCalledWith("/api/v1/analytics/revenue/clubs/club-1/summary");
    });

    it("appends query params when provided", async () => {
        mockFetcher.mockResolvedValue({});
        await getClubRevenueSummaryEndpoint("club-1", {
            basis: "cash",
            date_from: "2026-05-01",
            date_to: "2026-05-31",
        });
        expect(mockFetcher).toHaveBeenCalledWith(
            "/api/v1/analytics/revenue/clubs/club-1/summary?basis=cash&date_from=2026-05-01&date_to=2026-05-31"
        );
    });
});

describe("getTenantRevenueComparisonEndpoint", () => {
    it("calls GET /api/v1/analytics/revenue/clubs with no params", async () => {
        mockFetcher.mockResolvedValue({});
        await getTenantRevenueComparisonEndpoint();
        expect(mockFetcher).toHaveBeenCalledWith("/api/v1/analytics/revenue/clubs");
    });

    it("appends query params when provided", async () => {
        mockFetcher.mockResolvedValue({});
        await getTenantRevenueComparisonEndpoint({
            basis: "service",
            date_from: "2026-01-01",
            date_to: "2026-03-31",
        });
        expect(mockFetcher).toHaveBeenCalledWith(
            "/api/v1/analytics/revenue/clubs?basis=service&date_from=2026-01-01&date_to=2026-03-31"
        );
    });
});
