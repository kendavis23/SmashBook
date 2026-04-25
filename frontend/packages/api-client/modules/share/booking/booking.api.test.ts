import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    listOpenGamesEndpoint,
    createBookingEndpoint,
    getBookingEndpoint,
    cancelBookingEndpoint,
    invitePlayerEndpoint,
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
