import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DashboardView from "./DashboardView";

vi.mock("@repo/ui", () => ({
    Breadcrumb: ({ items }: { items: { label: string }[] }) => (
        <nav>
            {items.map((i) => (
                <span key={i.label}>{i.label}</span>
            ))}
        </nav>
    ),
}));

describe("DashboardView", () => {
    it("renders the dashboard heading and breadcrumb", () => {
        render(<DashboardView />);
        expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
        expect(screen.getAllByText("Dashboard").length).toBeGreaterThan(0);
    });

    it("shows the coming soon message", () => {
        render(<DashboardView />);
        expect(screen.getByText("Coming soon")).toBeInTheDocument();
    });
});
