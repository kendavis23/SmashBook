import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    listCourtsEndpoint,
    createCourtEndpoint,
    getCourtEndpoint,
    updateCourtEndpoint,
    deleteCourtEndpoint,
    getCourtAvailabilityEndpoint,
    listCalendarReservationsEndpoint,
    createCalendarReservationEndpoint,
    updateCalendarReservationEndpoint,
    deleteCalendarReservationEndpoint,
} from "./court.api";

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
const RESERVATION_ID = "res-789";

const mockCourt = {
    id: COURT_ID,
    club_id: CLUB_ID,
    name: "Court 1",
    surface_type: "artificial_grass" as const,
    has_lighting: true,
    lighting_surcharge: 5,
    is_active: true,
};

const mockReservation = {
    id: RESERVATION_ID,
    club_id: CLUB_ID,
    court_id: COURT_ID,
    reservation_type: "block" as const,
    title: "Maintenance",
    start_datetime: "2026-04-08T08:00:00Z",
    end_datetime: "2026-04-08T10:00:00Z",
    anchor_skill_level: null,
    skill_range_above: null,
    skill_range_below: null,
    allowed_booking_types: null,
    is_recurring: false,
    recurrence_rule: null,
    recurrence_end_date: null,
    created_by: "user-1",
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
};

describe("listCourtsEndpoint", () => {
    it("calls GET /api/v1/clubs/:clubId/courts", async () => {
        mockFetcher.mockResolvedValue([mockCourt]);
        const result = await listCourtsEndpoint(CLUB_ID);
        expect(mockFetcher).toHaveBeenCalledWith(`/api/v1/clubs/${CLUB_ID}/courts`);
        expect(result).toEqual([mockCourt]);
    });
});

describe("createCourtEndpoint", () => {
    it("calls POST /api/v1/clubs/:clubId/courts with body", async () => {
        mockFetcher.mockResolvedValue(mockCourt);
        const data = { club_id: CLUB_ID, name: "Court 1", surface_type: "artificial_grass" as const };
        await createCourtEndpoint(CLUB_ID, data);
        expect(mockFetcher).toHaveBeenCalledWith(`/api/v1/clubs/${CLUB_ID}/courts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
    });
});

describe("getCourtEndpoint", () => {
    it("calls GET /api/v1/clubs/:clubId/courts/:courtId", async () => {
        mockFetcher.mockResolvedValue(mockCourt);
        await getCourtEndpoint(CLUB_ID, COURT_ID);
        expect(mockFetcher).toHaveBeenCalledWith(`/api/v1/clubs/${CLUB_ID}/courts/${COURT_ID}`);
    });
});

describe("updateCourtEndpoint", () => {
    it("calls PATCH /api/v1/clubs/:clubId/courts/:courtId with body", async () => {
        mockFetcher.mockResolvedValue(mockCourt);
        const data = { name: "Court A" };
        await updateCourtEndpoint(CLUB_ID, COURT_ID, data);
        expect(mockFetcher).toHaveBeenCalledWith(`/api/v1/clubs/${CLUB_ID}/courts/${COURT_ID}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
    });
});

describe("deleteCourtEndpoint", () => {
    it("calls DELETE /api/v1/clubs/:clubId/courts/:courtId", async () => {
        mockFetcher.mockResolvedValue(undefined);
        await deleteCourtEndpoint(CLUB_ID, COURT_ID);
        expect(mockFetcher).toHaveBeenCalledWith(`/api/v1/clubs/${CLUB_ID}/courts/${COURT_ID}`, {
            method: "DELETE",
        });
    });
});

describe("getCourtAvailabilityEndpoint", () => {
    it("calls GET with date query param", async () => {
        const mockAvailability = { court_id: COURT_ID, date: "2026-04-08", slots: [] };
        mockFetcher.mockResolvedValue(mockAvailability);
        await getCourtAvailabilityEndpoint(CLUB_ID, COURT_ID, "2026-04-08");
        expect(mockFetcher).toHaveBeenCalledWith(
            `/api/v1/clubs/${CLUB_ID}/courts/${COURT_ID}/availability?date=2026-04-08`
        );
    });
});

describe("listCalendarReservationsEndpoint", () => {
    it("calls GET /api/v1/clubs/:clubId/calendar-reservations", async () => {
        mockFetcher.mockResolvedValue([mockReservation]);
        await listCalendarReservationsEndpoint(CLUB_ID);
        expect(mockFetcher).toHaveBeenCalledWith(`/api/v1/clubs/${CLUB_ID}/calendar-reservations`);
    });
});

describe("createCalendarReservationEndpoint", () => {
    it("calls POST /api/v1/clubs/:clubId/calendar-reservations with body", async () => {
        mockFetcher.mockResolvedValue(mockReservation);
        const data = {
            club_id: CLUB_ID,
            reservation_type: "block" as const,
            title: "Maintenance",
            start_datetime: "2026-04-08T08:00:00Z",
            end_datetime: "2026-04-08T10:00:00Z",
        };
        await createCalendarReservationEndpoint(CLUB_ID, data);
        expect(mockFetcher).toHaveBeenCalledWith(`/api/v1/clubs/${CLUB_ID}/calendar-reservations`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
    });
});

describe("updateCalendarReservationEndpoint", () => {
    it("calls PATCH /api/v1/clubs/:clubId/calendar-reservations/:id with body", async () => {
        mockFetcher.mockResolvedValue(mockReservation);
        const data = { title: "Updated" };
        await updateCalendarReservationEndpoint(CLUB_ID, RESERVATION_ID, data);
        expect(mockFetcher).toHaveBeenCalledWith(
            `/api/v1/clubs/${CLUB_ID}/calendar-reservations/${RESERVATION_ID}`,
            {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            }
        );
    });
});

describe("deleteCalendarReservationEndpoint", () => {
    it("calls DELETE /api/v1/clubs/:clubId/calendar-reservations/:id", async () => {
        mockFetcher.mockResolvedValue(undefined);
        await deleteCalendarReservationEndpoint(CLUB_ID, RESERVATION_ID);
        expect(mockFetcher).toHaveBeenCalledWith(
            `/api/v1/clubs/${CLUB_ID}/calendar-reservations/${RESERVATION_ID}`,
            { method: "DELETE" }
        );
    });
});
