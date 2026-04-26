import { describe, it, expect, vi, beforeEach } from "vitest";
import { listCourtsEndpoint, getCourtAvailabilityEndpoint } from "./court.api";

vi.mock("../../../core/fetcher", () => ({
    fetcher: vi.fn(),
}));

import { fetcher } from "../../../core/fetcher";
const mockFetcher = vi.mocked(fetcher);

beforeEach(() => {
    mockFetcher.mockReset();
});

const CLUB_ID = "club-123";
const COURT_ID = "court-456";

const mockCourt = {
    id: COURT_ID,
    club_id: CLUB_ID,
    name: "Court 1",
    surface_type: "indoor" as const,
    has_lighting: true,
    lighting_surcharge: 5,
    is_active: true,
};

describe("listCourtsEndpoint", () => {
    it("calls GET /api/v1/courts with no params", async () => {
        mockFetcher.mockResolvedValue([mockCourt]);
        await listCourtsEndpoint({});
        expect(mockFetcher).toHaveBeenCalledWith("/api/v1/courts");
    });

    it("calls GET /api/v1/courts with query params", async () => {
        mockFetcher.mockResolvedValue([mockCourt]);
        await listCourtsEndpoint({ club_id: CLUB_ID, surface_type: "indoor", date: "2026-04-08" });
        expect(mockFetcher).toHaveBeenCalledWith(
            `/api/v1/courts?club_id=${CLUB_ID}&surface_type=indoor&date=2026-04-08`
        );
    });
});

describe("getCourtAvailabilityEndpoint", () => {
    it("calls GET /api/v1/courts/:courtId/availability with date query param", async () => {
        const mockAvailability = { court_id: COURT_ID, date: "2026-04-08", slots: [] };
        mockFetcher.mockResolvedValue(mockAvailability);
        await getCourtAvailabilityEndpoint(COURT_ID, "2026-04-08");
        expect(mockFetcher).toHaveBeenCalledWith(
            `/api/v1/courts/${COURT_ID}/availability?date=2026-04-08`
        );
    });
});
