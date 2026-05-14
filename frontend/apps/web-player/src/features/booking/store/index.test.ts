import { describe, expect, it, vi } from "vitest";

vi.mock("@repo/player-domain/store", () => ({
    useClubAccess: vi.fn(),
}));

describe("booking store barrel", () => {
    it("re-exports player-domain club access store", async () => {
        const domainStore = await import("@repo/player-domain/store");
        const bookingStore = await import("./index");

        expect(bookingStore.useClubAccess).toBe(domainStore.useClubAccess);
    });
});
