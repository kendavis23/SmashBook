import { describe, expect, it } from "vitest";
import type { BookingModalState, ClubOption } from "./index";

describe("dashboard feature types", () => {
    it("supports club options used by the dashboard club switcher", () => {
        const club: ClubOption = { id: "club-1", name: "Club One", role: "member" };

        expect(club).toEqual({ id: "club-1", name: "Club One", role: "member" });
    });

    it("supports nullable booking modal state", () => {
        const emptyState: BookingModalState = null;
        const bookingState: BookingModalState = {
            courtId: "court-1",
            courtName: "Court One",
            date: "2026-05-20",
            startTime: "10:00",
        };

        expect(emptyState).toBeNull();
        expect(bookingState).toEqual(
            expect.objectContaining({ courtId: "court-1", startTime: "10:00" })
        );
    });
});
