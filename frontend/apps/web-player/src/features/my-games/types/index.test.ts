import { describe, expect, it } from "vitest";
import type { PlayerBookingItem } from "./index";

describe("my-games feature types", () => {
    it("supports player booking history items", () => {
        const game: PlayerBookingItem = {
            booking_id: "booking-1",
            club_id: "club-1",
            court_id: "court-1",
            court_name: "Court One",
            booking_type: "regular",
            status: "completed",
            start_datetime: "2026-05-20T10:00:00Z",
            end_datetime: "2026-05-20T11:00:00Z",
            role: "player",
            invite_status: "accepted",
            payment_status: "paid",
            amount_due: 24,
        };

        expect(game).toEqual(expect.objectContaining({ booking_id: "booking-1" }));
    });
});
