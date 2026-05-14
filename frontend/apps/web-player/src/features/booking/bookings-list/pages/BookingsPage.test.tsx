import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import BookingsPage from "./BookingsPage";

vi.mock("../components/BookingsContainer", () => ({
    default: () => <div>Bookings container</div>,
}));

describe("BookingsPage", () => {
    it("renders the bookings container", () => {
        render(<BookingsPage />);
        expect(screen.getByText("Bookings container")).toBeInTheDocument();
    });
});
