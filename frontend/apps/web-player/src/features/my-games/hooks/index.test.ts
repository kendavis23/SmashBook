import { describe, expect, it, vi } from "vitest";

vi.mock("@repo/player-domain/hooks", () => ({
    useMyMatchHistory: vi.fn(),
}));

describe("my-games hooks barrel", () => {
    it("re-exports player-domain match history hook", async () => {
        const domainHooks = await import("@repo/player-domain/hooks");
        const myGamesHooks = await import("./index");

        expect(myGamesHooks.useMyMatchHistory).toBe(domainHooks.useMyMatchHistory);
    });
});
