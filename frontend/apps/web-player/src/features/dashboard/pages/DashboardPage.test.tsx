import { describe, expect, it, vi } from "vitest";

vi.mock("../dashboard-home/pages/DashboardPage", () => ({
    default: function DashboardPageMock() {
        return null;
    },
}));

describe("DashboardPage route barrel", () => {
    it("re-exports the dashboard-home page", async () => {
        const source = await import("../dashboard-home/pages/DashboardPage");
        const barrel = await import("./DashboardPage");

        expect(barrel.default).toBe(source.default);
    });
});
