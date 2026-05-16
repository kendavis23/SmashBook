import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ManageBookingModal } from "./ManageBookingModal";

vi.mock("./ManageBookingModalContainer", () => ({
    default: ({
        bookingId,
        clubId,
        onClose,
        onSuccess,
    }: {
        bookingId: string;
        clubId: string;
        onClose: () => void;
        onSuccess?: () => void;
    }) => (
        <div>
            <span>{bookingId}</span>
            <span>{clubId}</span>
            <button onClick={onClose}>Close child</button>
            <button onClick={onSuccess}>Success child</button>
        </div>
    ),
}));

describe("ManageBookingModal", () => {
    it("renders modal container props through a portal", () => {
        render(<ManageBookingModal bookingId="booking-1" clubId="club-1" onClose={vi.fn()} />);

        expect(screen.getByText("booking-1")).toBeInTheDocument();
        expect(screen.getByText("club-1")).toBeInTheDocument();
    });

    it("forwards close and success", () => {
        const onClose = vi.fn();
        const onSuccess = vi.fn();
        render(
            <ManageBookingModal
                bookingId="booking-1"
                clubId="club-1"
                onClose={onClose}
                onSuccess={onSuccess}
            />
        );

        fireEvent.click(screen.getByRole("button", { name: "Close child" }));
        fireEvent.click(screen.getByRole("button", { name: "Success child" }));

        expect(onClose).toHaveBeenCalledOnce();
        expect(onSuccess).toHaveBeenCalledOnce();
    });
});
