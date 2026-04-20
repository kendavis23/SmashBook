import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    listCourtsEndpoint,
    createCourtEndpoint,
    getCourtAvailabilityEndpoint,
    updateCourtEndpoint,
    listCalendarReservationsEndpoint,
    createCalendarReservationEndpoint,
    getCalendarReservationEndpoint,
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
    surface_type: "indoor" as const,
    has_lighting: true,
    lighting_surcharge: 5,
    is_active: true,
};

const mockReservation = {
    id: RESERVATION_ID,
    club_id: CLUB_ID,
    court_id: COURT_ID,
    reservation_type: "training_block" as const,
    title: "Maintenance",
    start_datetime: "2026-04-08T08:00:00Z",
    end_datetime: "2026-04-08T10:00:00Z",
    allowed_booking_types: null,
    is_recurring: false,
    recurrence_rule: null,
    recurrence_end_date: null,
    created_by: "user-1",
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
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

describe("createCourtEndpoint", () => {
    it("calls POST /api/v1/courts with body", async () => {
        mockFetcher.mockResolvedValue(mockCourt);
        const data = {
            club_id: CLUB_ID,
            name: "Court 1",
            surface_type: "artificial_grass" as const,
        };
        await createCourtEndpoint(data);
        expect(mockFetcher).toHaveBeenCalledWith("/api/v1/courts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
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

describe("updateCourtEndpoint", () => {
    it("calls PATCH /api/v1/courts/:courtId with body", async () => {
        mockFetcher.mockResolvedValue(mockCourt);
        const data = { name: "Court A" };
        await updateCourtEndpoint(COURT_ID, data);
        expect(mockFetcher).toHaveBeenCalledWith(`/api/v1/courts/${COURT_ID}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
    });
});

describe("listCalendarReservationsEndpoint", () => {
    it("calls GET /api/v1/calendar-reservations with club_id", async () => {
        mockFetcher.mockResolvedValue([mockReservation]);
        await listCalendarReservationsEndpoint({ club_id: CLUB_ID });
        expect(mockFetcher).toHaveBeenCalledWith(
            `/api/v1/calendar-reservations?club_id=${CLUB_ID}`
        );
    });

    it("calls GET /api/v1/calendar-reservations with all params", async () => {
        mockFetcher.mockResolvedValue([mockReservation]);
        await listCalendarReservationsEndpoint({
            club_id: CLUB_ID,
            reservation_type: "training_block",
            court_id: COURT_ID,
            from_dt: "2026-04-08T00:00:00Z",
            to_dt: "2026-04-09T00:00:00Z",
        });
        expect(mockFetcher).toHaveBeenCalledWith(
            `/api/v1/calendar-reservations?club_id=${CLUB_ID}&reservation_type=training_block&court_id=${COURT_ID}&from_dt=2026-04-08T00%3A00%3A00Z&to_dt=2026-04-09T00%3A00%3A00Z`
        );
    });
});

describe("createCalendarReservationEndpoint", () => {
    it("calls POST /api/v1/calendar-reservations with body", async () => {
        mockFetcher.mockResolvedValue(mockReservation);
        const data = {
            club_id: CLUB_ID,
            reservation_type: "training_block" as const,
            title: "Maintenance",
            start_datetime: "2026-04-08T08:00:00Z",
            end_datetime: "2026-04-08T10:00:00Z",
        };
        await createCalendarReservationEndpoint(data);
        expect(mockFetcher).toHaveBeenCalledWith("/api/v1/calendar-reservations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
    });
});

describe("getCalendarReservationEndpoint", () => {
    it("calls GET /api/v1/calendar-reservations/:id", async () => {
        mockFetcher.mockResolvedValue(mockReservation);
        await getCalendarReservationEndpoint(RESERVATION_ID);
        expect(mockFetcher).toHaveBeenCalledWith(`/api/v1/calendar-reservations/${RESERVATION_ID}`);
    });
});

describe("updateCalendarReservationEndpoint", () => {
    it("calls PATCH /api/v1/calendar-reservations/:id with body", async () => {
        mockFetcher.mockResolvedValue(mockReservation);
        const data = { title: "Updated" };
        await updateCalendarReservationEndpoint(RESERVATION_ID, data);
        expect(mockFetcher).toHaveBeenCalledWith(
            `/api/v1/calendar-reservations/${RESERVATION_ID}`,
            {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            }
        );
    });
});

describe("deleteCalendarReservationEndpoint", () => {
    it("calls DELETE /api/v1/calendar-reservations/:id", async () => {
        mockFetcher.mockResolvedValue(undefined);
        await deleteCalendarReservationEndpoint(RESERVATION_ID);
        expect(mockFetcher).toHaveBeenCalledWith(
            `/api/v1/calendar-reservations/${RESERVATION_ID}`,
            { method: "DELETE" }
        );
    });
});
