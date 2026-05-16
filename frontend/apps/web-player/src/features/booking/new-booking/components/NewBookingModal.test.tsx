import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NewBookingModal } from "./NewBookingModal";

vi.mock("./NewBookingModalContainer", () => ({
    default: ({
        courtId,
        courtName,
        date,
        startTime,
        onClose,
        onSuccess,
    }: {
        courtId: string;
        courtName: string;
        date: string;
        startTime: string;
        onClose: () => void;
        onSuccess?: () => void;
    }) => (
        <div>
            <span>{courtId}</span>
            <span>{courtName}</span>
            <span>{date}</span>
            <span>{startTime}</span>
            <button onClick={onClose}>Close child</button>
            <button onClick={onSuccess}>Success child</button>
        </div>
    ),
}));

describe("NewBookingModal", () => {
    it("renders modal container props through a portal", () => {
        render(
            <NewBookingModal
                courtId="court-1"
                courtName="Court One"
                date="2026-05-20"
                startTime="10:00"
                onClose={vi.fn()}
            />
        );

        expect(screen.getByText("court-1")).toBeInTheDocument();
        expect(screen.getByText("Court One")).toBeInTheDocument();
        expect(screen.getByText("2026-05-20")).toBeInTheDocument();
        expect(screen.getByText("10:00")).toBeInTheDocument();
    });

    it("forwards close and maps success to the court name", () => {
        const onClose = vi.fn();
        const onSuccess = vi.fn();
        render(
            <NewBookingModal
                courtId="court-1"
                courtName="Court One"
                date="2026-05-20"
                startTime="10:00"
                onClose={onClose}
                onSuccess={onSuccess}
            />
        );

        fireEvent.click(screen.getByRole("button", { name: "Close child" }));
        fireEvent.click(screen.getByRole("button", { name: "Success child" }));

        expect(onClose).toHaveBeenCalledOnce();
        expect(onSuccess).toHaveBeenCalledWith("Court One");
    });
});
