import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ManageBookingPage from "./ManageBookingPage";

vi.mock("../components/ManageBookingContainer", () => ({
    default: () => <div>Manage booking container</div>,
}));

describe("ManageBookingPage", () => {
    it("renders the manage booking container", () => {
        render(<ManageBookingPage />);
        expect(screen.getByText("Manage booking container")).toBeInTheDocument();
    });
});
