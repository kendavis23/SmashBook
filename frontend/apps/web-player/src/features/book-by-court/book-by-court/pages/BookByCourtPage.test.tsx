import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import BookByCourtPage from "./BookByCourtPage";

vi.mock("../components/BookByCourtContainer", () => ({
    default: () => <div>BookByCourt container</div>,
}));

describe("BookByCourtPage", () => {
    it("renders the book-by-court container", () => {
        render(<BookByCourtPage />);
        expect(screen.getByText("BookByCourt container")).toBeInTheDocument();
    });
});
