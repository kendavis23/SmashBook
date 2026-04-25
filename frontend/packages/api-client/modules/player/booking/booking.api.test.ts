import { describe, it, expect, vi, beforeEach } from "vitest";
import { joinBookingEndpoint, respondInviteEndpoint } from "./booking.api";

vi.mock("../../../core/fetcher", () => ({ fetcher: vi.fn() }));

import { fetcher } from "../../../core/fetcher";
const mockFetcher = vi.mocked(fetcher);

beforeEach(() => {
    mockFetcher.mockReset();
});

const CLUB_ID = "club-123";
const BOOKING_ID = "booking-456";

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
