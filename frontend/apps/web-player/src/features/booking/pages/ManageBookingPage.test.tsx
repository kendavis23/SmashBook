import { describe, expect, it, vi } from "vitest";

vi.mock("../manage-booking/pages/ManageBookingPage", () => ({
    default: function ManageBookingPageMock() {
        return null;
    },
}));

describe("ManageBookingPage route barrel", () => {
    it("re-exports the manage-booking page", async () => {
        const source = await import("../manage-booking/pages/ManageBookingPage");
        const barrel = await import("./ManageBookingPage");

        expect(barrel.default).toBe(source.default);
    });
});
