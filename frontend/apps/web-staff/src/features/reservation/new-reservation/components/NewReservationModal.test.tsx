import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { NewReservationModal } from "./NewReservationModal";

vi.mock("./NewReservationModalContainer", () => ({
    default: ({ onClose }: { onClose: () => void }) => (
        <div data-testid="modal-container">
            <button onClick={onClose}>Cancel</button>
        </div>
    ),
}));

describe("NewReservationModal", () => {
    const defaultProps = {
        onClose: vi.fn(),
        onSuccess: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders the modal container inside a portal", () => {
        render(<NewReservationModal {...defaultProps} />);
        expect(screen.getByTestId("modal-container")).toBeInTheDocument();
    });

    it("calls onClose when the backdrop is clicked", () => {
        render(<NewReservationModal {...defaultProps} />);
        const backdrop = screen.getByTestId("modal-container").parentElement?.parentElement;
        if (backdrop) fireEvent.click(backdrop);
        expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it("does not call onClose when clicking inside the modal content", () => {
        render(<NewReservationModal {...defaultProps} />);
        fireEvent.click(screen.getByTestId("modal-container"));
        expect(defaultProps.onClose).not.toHaveBeenCalled();
    });

    it("passes date to the container", () => {
        const MockContainer = vi.fn(() => <div data-testid="modal-container" />);
        vi.doMock("./NewReservationModalContainer", () => ({ default: MockContainer }));

        render(<NewReservationModal {...defaultProps} date="2026-05-01" />);
        expect(screen.getByTestId("modal-container")).toBeInTheDocument();
    });
});
