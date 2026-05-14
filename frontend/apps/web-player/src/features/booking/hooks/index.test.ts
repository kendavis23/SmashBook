import { describe, expect, it, vi } from "vitest";

vi.mock("@repo/player-domain/hooks", () => ({
    useMyBookings: vi.fn(),
    useGetBooking: vi.fn(),
    useInvitePlayer: vi.fn(),
    useRespondInvite: vi.fn(),
    useCreateBooking: vi.fn(),
    useListCourts: vi.fn(),
    useGetCourtAvailability: vi.fn(),
    useListTrainers: vi.fn(),
    useListAvailableTrainers: vi.fn(),
    useSearchPlayers: vi.fn(),
}));

describe("booking hooks barrel", () => {
    it("re-exports player-domain booking hooks", async () => {
        const domainHooks = await import("@repo/player-domain/hooks");
        const bookingHooks = await import("./index");

        expect(bookingHooks.useMyBookings).toBe(domainHooks.useMyBookings);
        expect(bookingHooks.useGetBooking).toBe(domainHooks.useGetBooking);
        expect(bookingHooks.useInvitePlayer).toBe(domainHooks.useInvitePlayer);
        expect(bookingHooks.useRespondInvite).toBe(domainHooks.useRespondInvite);
        expect(bookingHooks.useCreateBooking).toBe(domainHooks.useCreateBooking);
        expect(bookingHooks.useListCourts).toBe(domainHooks.useListCourts);
        expect(bookingHooks.useGetCourtAvailability).toBe(domainHooks.useGetCourtAvailability);
        expect(bookingHooks.useListTrainers).toBe(domainHooks.useListTrainers);
        expect(bookingHooks.useListAvailableTrainers).toBe(
            domainHooks.useListAvailableTrainers
        );
        expect(bookingHooks.useSearchPlayers).toBe(domainHooks.useSearchPlayers);
    });
});
