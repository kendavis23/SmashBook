import { describe, expect, it, vi } from "vitest";

vi.mock("../bookings-list/pages/BookingsPage", () => ({
    default: function BookingsPageMock() {
        return null;
    },
}));

describe("BookingsPage route barrel", () => {
    it("re-exports the bookings-list page", async () => {
        const source = await import("../bookings-list/pages/BookingsPage");
        const barrel = await import("./BookingsPage");

        expect(barrel.default).toBe(source.default);
    });
});
