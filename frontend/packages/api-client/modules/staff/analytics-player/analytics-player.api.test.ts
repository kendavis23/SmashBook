import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    getPlayerValueLeaderboardEndpoint,
    getMostActivePlayersEndpoint,
    getInactiveMembersEndpoint,
    getPlayerValueByGroupEndpoint,
    getActivePlayersKpiEndpoint,
    getActivePlayersTimeseriesEndpoint,
    getSignupsTimeseriesEndpoint,
} from "./analytics-player.api";

vi.mock("../../../core/fetcher", () => ({ fetcher: vi.fn() }));

import { fetcher } from "../../../core/fetcher";
const mockFetcher = vi.mocked(fetcher);

beforeEach(() => {
    mockFetcher.mockReset();
});

const BASE = "/api/v1/analytics/players";

describe("getPlayerValueLeaderboardEndpoint", () => {
    it("calls GET /clubs/:clubId/value with no params", async () => {
        mockFetcher.mockResolvedValue({});
        await getPlayerValueLeaderboardEndpoint("club-1");
        expect(mockFetcher).toHaveBeenCalledWith(`${BASE}/clubs/club-1/value`);
    });

    it("appends query params when provided", async () => {
        mockFetcher.mockResolvedValue({});
        await getPlayerValueLeaderboardEndpoint("club-1", {
            members_only: true,
            sort: "bookings_played",
            limit: 10,
            offset: 20,
        });
        expect(mockFetcher).toHaveBeenCalledWith(
            `${BASE}/clubs/club-1/value?members_only=true&sort=bookings_played&limit=10&offset=20`
        );
    });
});

describe("getMostActivePlayersEndpoint", () => {
    it("calls GET /clubs/:clubId/most-active with no params", async () => {
        mockFetcher.mockResolvedValue({});
        await getMostActivePlayersEndpoint("club-1");
        expect(mockFetcher).toHaveBeenCalledWith(`${BASE}/clubs/club-1/most-active`);
    });

    it("appends window_days param", async () => {
        mockFetcher.mockResolvedValue({});
        await getMostActivePlayersEndpoint("club-1", { window_days: 90, limit: 25 });
        expect(mockFetcher).toHaveBeenCalledWith(
            `${BASE}/clubs/club-1/most-active?window_days=90&limit=25`
        );
    });
});

describe("getInactiveMembersEndpoint", () => {
    it("calls GET /clubs/:clubId/inactive-members with no params", async () => {
        mockFetcher.mockResolvedValue({});
        await getInactiveMembersEndpoint("club-1");
        expect(mockFetcher).toHaveBeenCalledWith(`${BASE}/clubs/club-1/inactive-members`);
    });

    it("appends inactive_days param", async () => {
        mockFetcher.mockResolvedValue({});
        await getInactiveMembersEndpoint("club-1", { inactive_days: 60, limit: 50, offset: 0 });
        expect(mockFetcher).toHaveBeenCalledWith(
            `${BASE}/clubs/club-1/inactive-members?inactive_days=60&limit=50&offset=0`
        );
    });
});

describe("getPlayerValueByGroupEndpoint", () => {
    it("calls GET /clubs/:clubId/value/by-group with no params", async () => {
        mockFetcher.mockResolvedValue({});
        await getPlayerValueByGroupEndpoint("club-1");
        expect(mockFetcher).toHaveBeenCalledWith(`${BASE}/clubs/club-1/value/by-group`);
    });

    it("appends dimension and inactive_days params", async () => {
        mockFetcher.mockResolvedValue({});
        await getPlayerValueByGroupEndpoint("club-1", {
            dimension: "activity_status",
            inactive_days: 45,
        });
        expect(mockFetcher).toHaveBeenCalledWith(
            `${BASE}/clubs/club-1/value/by-group?dimension=activity_status&inactive_days=45`
        );
    });
});

describe("getActivePlayersKpiEndpoint", () => {
    it("calls GET /clubs/:clubId/active with no params", async () => {
        mockFetcher.mockResolvedValue({});
        await getActivePlayersKpiEndpoint("club-1");
        expect(mockFetcher).toHaveBeenCalledWith(`${BASE}/clubs/club-1/active`);
    });

    it("appends window_days and as_of params", async () => {
        mockFetcher.mockResolvedValue({});
        await getActivePlayersKpiEndpoint("club-1", { window_days: 90, as_of: "2026-06-01" });
        expect(mockFetcher).toHaveBeenCalledWith(
            `${BASE}/clubs/club-1/active?window_days=90&as_of=2026-06-01`
        );
    });
});

describe("getActivePlayersTimeseriesEndpoint", () => {
    it("calls GET /clubs/:clubId/active/timeseries with no params", async () => {
        mockFetcher.mockResolvedValue({});
        await getActivePlayersTimeseriesEndpoint("club-1");
        expect(mockFetcher).toHaveBeenCalledWith(`${BASE}/clubs/club-1/active/timeseries`);
    });

    it("appends granularity and date range params", async () => {
        mockFetcher.mockResolvedValue({});
        await getActivePlayersTimeseriesEndpoint("club-1", {
            granularity: "month",
            date_from: "2026-01-01",
            date_to: "2026-06-01",
        });
        expect(mockFetcher).toHaveBeenCalledWith(
            `${BASE}/clubs/club-1/active/timeseries?granularity=month&date_from=2026-01-01&date_to=2026-06-01`
        );
    });
});

describe("getSignupsTimeseriesEndpoint", () => {
    it("calls GET /clubs/:clubId/signups with no params", async () => {
        mockFetcher.mockResolvedValue({});
        await getSignupsTimeseriesEndpoint("club-1");
        expect(mockFetcher).toHaveBeenCalledWith(`${BASE}/clubs/club-1/signups`);
    });

    it("appends granularity and date range params", async () => {
        mockFetcher.mockResolvedValue({});
        await getSignupsTimeseriesEndpoint("club-1", {
            granularity: "week",
            date_from: "2026-05-01",
            date_to: "2026-06-01",
        });
        expect(mockFetcher).toHaveBeenCalledWith(
            `${BASE}/clubs/club-1/signups?granularity=week&date_from=2026-05-01&date_to=2026-06-01`
        );
    });
});
