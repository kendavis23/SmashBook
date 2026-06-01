import { describe, expect, it, vi } from "vitest";

vi.mock("@repo/player-domain/hooks", () => ({
    useMyProfile: vi.fn(),
    useCreateBooking: vi.fn(),
    useGetCourtAvailability: vi.fn(),
    useJoinBooking: vi.fn(),
    useListCourts: vi.fn(),
    useListOpenGames: vi.fn(),
}));

describe("dashboard hooks barrel", () => {
    it("re-exports player-domain dashboard hooks", async () => {
        const domainHooks = await import("@repo/player-domain/hooks");
        const dashboardHooks = await import("./index");

        expect(dashboardHooks.useMyProfile).toBe(domainHooks.useMyProfile);
        expect(dashboardHooks.useCreateBooking).toBe(domainHooks.useCreateBooking);
        expect(dashboardHooks.useGetCourtAvailability).toBe(domainHooks.useGetCourtAvailability);
        expect(dashboardHooks.useJoinBooking).toBe(domainHooks.useJoinBooking);
        expect(dashboardHooks.useListCourts).toBe(domainHooks.useListCourts);
        expect(dashboardHooks.useListOpenGames).toBe(domainHooks.useListOpenGames);
    });
});
