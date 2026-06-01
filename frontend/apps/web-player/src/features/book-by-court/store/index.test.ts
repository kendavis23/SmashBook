import { describe, expect, it, vi } from "vitest";

vi.mock("@repo/player-domain/store", () => ({
    useClubAccess: vi.fn(),
}));

describe("dashboard store barrel", () => {
    it("re-exports player-domain club access store", async () => {
        const domainStore = await import("@repo/player-domain/store");
        const dashboardStore = await import("./index");

        expect(dashboardStore.useClubAccess).toBe(domainStore.useClubAccess);
    });
});
