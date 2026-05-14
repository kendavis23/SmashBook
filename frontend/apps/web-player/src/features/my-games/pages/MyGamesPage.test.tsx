import { describe, expect, it, vi } from "vitest";

vi.mock("../my-games-list/pages/MyGamesPage", () => ({
    default: function MyGamesPageMock() {
        return null;
    },
}));

describe("MyGamesPage route barrel", () => {
    it("re-exports the my-games-list page", async () => {
        const source = await import("../my-games-list/pages/MyGamesPage");
        const barrel = await import("./MyGamesPage");

        expect(barrel.default).toBe(source.default);
    });
});
