import { describe, expect, it, vi } from "vitest";

vi.mock("../book-by-court/pages/BookByCourtPage", () => ({
    default: function BookByCourtPageMock() {
        return null;
    },
}));

describe("BookByCourtPage route barrel", () => {
    it("re-exports the book-by-court page", async () => {
        const source = await import("../book-by-court/pages/BookByCourtPage");
        const barrel = await import("./BookByCourtPage");

        expect(barrel.default).toBe(source.default);
    });
});
