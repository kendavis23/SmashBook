import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    getMyProfileEndpoint,
    updateMyProfileEndpoint,
    getMyBookingsEndpoint,
    getMyMatchHistoryEndpoint,
} from "./profile.api";

vi.mock("../../../core/fetcher", () => ({ fetcher: vi.fn() }));

import { fetcher } from "../../../core/fetcher";
const mockFetcher = vi.mocked(fetcher);

beforeEach(() => {
    mockFetcher.mockReset();
});

describe("getMyProfileEndpoint", () => {
    it("calls GET /api/v1/players/me", async () => {
        mockFetcher.mockResolvedValue({});
        await getMyProfileEndpoint();
        expect(mockFetcher).toHaveBeenCalledWith("/api/v1/players/me");
    });
});

describe("updateMyProfileEndpoint", () => {
    it("calls PATCH /api/v1/players/me with body", async () => {
        mockFetcher.mockResolvedValue({});
        const data = { full_name: "Jane Doe", phone: "+1234567890" };
        await updateMyProfileEndpoint(data);
        expect(mockFetcher).toHaveBeenCalledWith("/api/v1/players/me", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
    });
});

describe("getMyBookingsEndpoint", () => {
    it("calls GET /api/v1/players/me/bookings", async () => {
        mockFetcher.mockResolvedValue({ upcoming: [], past: [] });
        await getMyBookingsEndpoint();
        expect(mockFetcher).toHaveBeenCalledWith("/api/v1/players/me/bookings");
    });
});

describe("getMyMatchHistoryEndpoint", () => {
    it("calls GET /api/v1/players/me/match-history", async () => {
        mockFetcher.mockResolvedValue([]);
        await getMyMatchHistoryEndpoint();
        expect(mockFetcher).toHaveBeenCalledWith("/api/v1/players/me/match-history");
    });
});
