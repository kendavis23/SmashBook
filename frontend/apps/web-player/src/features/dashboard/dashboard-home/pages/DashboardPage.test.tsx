import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DashboardPage from "./DashboardPage";

vi.mock("../components/DashboardContainer", () => ({
    default: () => <div>Dashboard container</div>,
}));

describe("DashboardPage", () => {
    it("renders the dashboard container", () => {
        render(<DashboardPage />);
        expect(screen.getByText("Dashboard container")).toBeInTheDocument();
    });
});
