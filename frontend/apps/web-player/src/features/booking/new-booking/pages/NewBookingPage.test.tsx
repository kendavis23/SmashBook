import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import NewBookingPage from "./NewBookingPage";

vi.mock("../components/NewBookingContainer", () => ({
    default: () => <div>New booking container</div>,
}));

describe("NewBookingPage", () => {
    it("renders the new booking container", () => {
        render(<NewBookingPage />);
        expect(screen.getByText("New booking container")).toBeInTheDocument();
    });
});
