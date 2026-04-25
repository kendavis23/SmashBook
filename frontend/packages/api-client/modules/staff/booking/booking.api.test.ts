import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    listBookingsEndpoint,
    getCalendarViewEndpoint,
    listOpenGamesEndpoint,
    createBookingEndpoint,
    createRecurringBookingEndpoint,
    getBookingEndpoint,
    updateBookingEndpoint,
    cancelBookingEndpoint,
    joinBookingEndpoint,
    invitePlayerEndpoint,
    respondInviteEndpoint,
} from "./booking.api";

vi.mock("../../../core/fetcher", () => ({ fetcher: vi.fn() }));

import { fetcher } from "../../../core/fetcher";
const mockFetcher = vi.mocked(fetcher);

beforeEach(() => {
    mockFetcher.mockReset();
});

const CLUB_ID = "club-123";
const BOOKING_ID = "booking-456";
const USER_ID = "user-789";

const mockBooking = {
    id: BOOKING_ID,
    club_id: CLUB_ID,
    court_id: "court-1",
    court_name: "Court 1",
    booking_type: "regular" as const,
    status: "confirmed" as const,
    is_open_game: false,
    start_datetime: "2026-04-11T10:00:00Z",
    end_datetime: "2026-04-11T11:30:00Z",
    min_skill_level: null,
    max_skill_level: null,
    max_players: 4,
    slots_available: 2,
    total_price: 30,
    notes: null,
    event_name: null,
    players: [],
    created_at: "2026-04-10T08:00:00Z",
};

describe("listBookingsEndpoint", () => {
    it("calls GET /api/v1/bookings with required club_id", async () => {
        mockFetcher.mockResolvedValue([mockBooking]);
        await listBookingsEndpoint({ club_id: CLUB_ID });
        expect(mockFetcher).toHaveBeenCalledWith(`/api/v1/bookings?club_id=${CLUB_ID}`);
    });

    it("calls GET /api/v1/bookings with all optional params", async () => {
        mockFetcher.mockResolvedValue([mockBooking]);
        await listBookingsEndpoint({
            club_id: CLUB_ID,
            date_from: "2026-04-11T00:00:00Z",
            date_to: "2026-04-12T00:00:00Z",
            booking_type: "regular",
            booking_status: "confirmed",
            court_id: "court-1",
            player_search: "alice",
        });
        expect(mockFetcher).toHaveBeenCalledWith(
            `/api/v1/bookings?club_id=${CLUB_ID}&date_from=2026-04-11T00%3A00%3A00Z&date_to=2026-04-12T00%3A00%3A00Z&booking_type=regular&booking_status=confirmed&court_id=court-1&player_search=alice`
        );
    });
});

describe("getCalendarViewEndpoint", () => {
    it("calls GET /api/v1/bookings/calendar with required club_id", async () => {
        mockFetcher.mockResolvedValue({
            view: "week",
            date_from: "2026-04-07",
            date_to: "2026-04-13",
            days: [],
        });
        await getCalendarViewEndpoint({ club_id: CLUB_ID });
        expect(mockFetcher).toHaveBeenCalledWith(`/api/v1/bookings/calendar?club_id=${CLUB_ID}`);
    });

    it("calls GET /api/v1/bookings/calendar with view and anchor_date", async () => {
        mockFetcher.mockResolvedValue({
            view: "day",
            date_from: "2026-04-11",
            date_to: "2026-04-11",
            days: [],
        });
        await getCalendarViewEndpoint({ club_id: CLUB_ID, view: "day", anchor_date: "2026-04-11" });
        expect(mockFetcher).toHaveBeenCalledWith(
            `/api/v1/bookings/calendar?club_id=${CLUB_ID}&view=day&anchor_date=2026-04-11`
        );
    });

    it("calls GET /api/v1/bookings/calendar with court_id for week view", async () => {
        mockFetcher.mockResolvedValue({
            view: "week",
            date_from: "2026-04-07",
            date_to: "2026-04-13",
            days: [],
        });
        await getCalendarViewEndpoint({
            club_id: CLUB_ID,
            view: "week",
            anchor_date: "2026-04-11",
            court_id: "court-1",
        });
        expect(mockFetcher).toHaveBeenCalledWith(
            `/api/v1/bookings/calendar?club_id=${CLUB_ID}&view=week&anchor_date=2026-04-11&court_id=court-1`
        );
    });
});

describe("listOpenGamesEndpoint", () => {
    it("calls GET /api/v1/bookings/open-games with required club_id", async () => {
        mockFetcher.mockResolvedValue([]);
        await listOpenGamesEndpoint({ club_id: CLUB_ID });
        expect(mockFetcher).toHaveBeenCalledWith(`/api/v1/bookings/open-games?club_id=${CLUB_ID}`);
    });

    it("calls GET /api/v1/bookings/open-games with all optional params", async () => {
        mockFetcher.mockResolvedValue([]);
        await listOpenGamesEndpoint({
            club_id: CLUB_ID,
            date: "2026-04-11",
            min_skill: 3,
            max_skill: 7,
        });
        expect(mockFetcher).toHaveBeenCalledWith(
            `/api/v1/bookings/open-games?club_id=${CLUB_ID}&date=2026-04-11&min_skill=3&max_skill=7`
        );
    });
});

describe("createBookingEndpoint", () => {
    it("calls POST /api/v1/bookings with body", async () => {
        mockFetcher.mockResolvedValue(mockBooking);
        const data = {
            club_id: CLUB_ID,
            court_id: "court-1",
            start_datetime: "2026-04-11T10:00:00Z",
        };
        await createBookingEndpoint(data);
        expect(mockFetcher).toHaveBeenCalledWith("/api/v1/bookings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
    });
});

describe("getBookingEndpoint", () => {
    it("calls GET /api/v1/bookings/:bookingId with club_id query param", async () => {
        mockFetcher.mockResolvedValue(mockBooking);
        await getBookingEndpoint(BOOKING_ID, CLUB_ID);
        expect(mockFetcher).toHaveBeenCalledWith(
            `/api/v1/bookings/${BOOKING_ID}?club_id=${CLUB_ID}`
        );
    });
});

describe("updateBookingEndpoint", () => {
    it("calls PATCH /api/v1/bookings/:bookingId with club_id and body", async () => {
        mockFetcher.mockResolvedValue(mockBooking);
        const data = { notes: "Updated notes" };
        await updateBookingEndpoint(BOOKING_ID, CLUB_ID, data);
        expect(mockFetcher).toHaveBeenCalledWith(
            `/api/v1/bookings/${BOOKING_ID}?club_id=${CLUB_ID}`,
            {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            }
        );
    });
});

describe("cancelBookingEndpoint", () => {
    it("calls DELETE /api/v1/bookings/:bookingId with club_id query param", async () => {
        mockFetcher.mockResolvedValue(mockBooking);
        await cancelBookingEndpoint(BOOKING_ID, CLUB_ID);
        expect(mockFetcher).toHaveBeenCalledWith(
            `/api/v1/bookings/${BOOKING_ID}?club_id=${CLUB_ID}`,
            {
                method: "DELETE",
            }
        );
    });
});

describe("joinBookingEndpoint", () => {
    it("calls POST /api/v1/bookings/:bookingId/join with club_id query param", async () => {
        mockFetcher.mockResolvedValue(mockBooking);
        await joinBookingEndpoint(BOOKING_ID, CLUB_ID);
        expect(mockFetcher).toHaveBeenCalledWith(
            `/api/v1/bookings/${BOOKING_ID}/join?club_id=${CLUB_ID}`,
            {
                method: "POST",
            }
        );
    });
});

describe("invitePlayerEndpoint", () => {
    it("calls POST /api/v1/bookings/:bookingId/invite with body", async () => {
        mockFetcher.mockResolvedValue(mockBooking);
        const data = { user_id: USER_ID };
        await invitePlayerEndpoint(BOOKING_ID, CLUB_ID, data);
        expect(mockFetcher).toHaveBeenCalledWith(
            `/api/v1/bookings/${BOOKING_ID}/invite?club_id=${CLUB_ID}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            }
        );
    });
});

describe("createRecurringBookingEndpoint", () => {
    it("calls POST /api/v1/bookings/recurring with body", async () => {
        mockFetcher.mockResolvedValue({ created: [mockBooking], skipped: [] });
        const data = {
            club_id: CLUB_ID,
            court_id: "court-1",
            first_start: "2026-04-11T10:00:00Z",
            recurrence_rule: "FREQ=WEEKLY;BYDAY=MO;COUNT=4",
        };
        await createRecurringBookingEndpoint(data);
        expect(mockFetcher).toHaveBeenCalledWith("/api/v1/bookings/recurring", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
    });

    it("calls POST /api/v1/bookings/recurring with skip_conflicts and recurrence_end_date", async () => {
        mockFetcher.mockResolvedValue({
            created: [mockBooking],
            skipped: [{ occurrence: "2026-04-18T10:00:00Z", reason: "conflict" }],
        });
        const data = {
            club_id: CLUB_ID,
            court_id: "court-1",
            first_start: "2026-04-11T10:00:00Z",
            recurrence_rule: "FREQ=WEEKLY;BYDAY=MO",
            recurrence_end_date: "2026-06-30",
            skip_conflicts: true,
        };
        await createRecurringBookingEndpoint(data);
        expect(mockFetcher).toHaveBeenCalledWith("/api/v1/bookings/recurring", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
    });
});

describe("respondInviteEndpoint", () => {
    it("calls POST /api/v1/bookings/:bookingId/respond-invite with body", async () => {
        mockFetcher.mockResolvedValue(mockBooking);
        const data = { action: "accepted" as const };
        await respondInviteEndpoint(BOOKING_ID, CLUB_ID, data);
        expect(mockFetcher).toHaveBeenCalledWith(
            `/api/v1/bookings/${BOOKING_ID}/respond-invite?club_id=${CLUB_ID}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            }
        );
    });
});
