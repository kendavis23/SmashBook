import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    getClubDailyUtilisationEndpoint,
    getClubCourtsUtilisationEndpoint,
    getClubUtilisationHeatmapEndpoint,
} from "./utilisation.api";

vi.mock("../../../core/fetcher", () => ({ fetcher: vi.fn() }));

import { fetcher } from "../../../core/fetcher";
const mockFetcher = vi.mocked(fetcher);

beforeEach(() => {
    mockFetcher.mockReset();
});

describe("getClubDailyUtilisationEndpoint", () => {
    it("calls GET /api/v1/analytics/utilisation/clubs/:clubId/daily with no params", async () => {
        mockFetcher.mockResolvedValue({});
        await getClubDailyUtilisationEndpoint("club-1");
        expect(mockFetcher).toHaveBeenCalledWith(
            "/api/v1/analytics/utilisation/clubs/club-1/daily"
        );
    });

    it("appends date_from and date_to as query params", async () => {
        mockFetcher.mockResolvedValue({});
        await getClubDailyUtilisationEndpoint("club-1", {
            date_from: "2026-01-01",
            date_to: "2026-01-31",
        });
        expect(mockFetcher).toHaveBeenCalledWith(
            "/api/v1/analytics/utilisation/clubs/club-1/daily?date_from=2026-01-01&date_to=2026-01-31"
        );
    });
});

describe("getClubCourtsUtilisationEndpoint", () => {
    it("calls GET /api/v1/analytics/utilisation/clubs/:clubId/courts with no params", async () => {
        mockFetcher.mockResolvedValue({});
        await getClubCourtsUtilisationEndpoint("club-1");
        expect(mockFetcher).toHaveBeenCalledWith(
            "/api/v1/analytics/utilisation/clubs/club-1/courts"
        );
    });

    it("appends date_from and date_to as query params", async () => {
        mockFetcher.mockResolvedValue({});
        await getClubCourtsUtilisationEndpoint("club-1", {
            date_from: "2026-01-01",
            date_to: "2026-01-31",
        });
        expect(mockFetcher).toHaveBeenCalledWith(
            "/api/v1/analytics/utilisation/clubs/club-1/courts?date_from=2026-01-01&date_to=2026-01-31"
        );
    });
});

describe("getClubUtilisationHeatmapEndpoint", () => {
    it("calls GET /api/v1/analytics/utilisation/clubs/:clubId/heatmap with no params", async () => {
        mockFetcher.mockResolvedValue({});
        await getClubUtilisationHeatmapEndpoint("club-1");
        expect(mockFetcher).toHaveBeenCalledWith(
            "/api/v1/analytics/utilisation/clubs/club-1/heatmap"
        );
    });

    it("appends date_from and date_to as query params", async () => {
        mockFetcher.mockResolvedValue({});
        await getClubUtilisationHeatmapEndpoint("club-1", {
            date_from: "2026-01-01",
            date_to: "2026-01-31",
        });
        expect(mockFetcher).toHaveBeenCalledWith(
            "/api/v1/analytics/utilisation/clubs/club-1/heatmap?date_from=2026-01-01&date_to=2026-01-31"
        );
    });
});
