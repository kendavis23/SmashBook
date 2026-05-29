import { describe, it, expect, vi, beforeEach } from "vitest";
import { getClubAvailabilityEndpoint } from "./club.api";

vi.mock("../../../core/fetcher", () => ({ fetcher: vi.fn() }));

import { fetcher } from "../../../core/fetcher";
const mockFetcher = vi.mocked(fetcher);

beforeEach(() => {
    mockFetcher.mockReset();
});

describe("getClubAvailabilityEndpoint", () => {
    it("calls GET with required start_date param", async () => {
        mockFetcher.mockResolvedValue({ club_id: "c1", courts: [], days: [], next_cursor: null });
        await getClubAvailabilityEndpoint("club-1", { start_date: "2026-06-01" });
        expect(mockFetcher).toHaveBeenCalledWith(
            "/api/v1/clubs/club-1/availability?start_date=2026-06-01"
        );
    });

    it("appends optional params when provided", async () => {
        mockFetcher.mockResolvedValue({ club_id: "c1", courts: [], days: [], next_cursor: null });
        await getClubAvailabilityEndpoint("club-1", {
            start_date: "2026-06-01",
            end_date: "2026-06-07",
            surface: "clay",
            from_time: "08:00",
            to_time: "20:00",
        });
        expect(mockFetcher).toHaveBeenCalledWith(
            "/api/v1/clubs/club-1/availability?start_date=2026-06-01&end_date=2026-06-07&surface=clay&from_time=08%3A00&to_time=20%3A00"
        );
    });
});
