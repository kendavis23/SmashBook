import { render, screen, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import CreateBookingModal from "./CreateBookingModal";

vi.mock("../hooks", () => ({
    useCreateBooking: vi.fn(() => ({
        mutate: vi.fn(),
        isPending: false,
        error: null,
        reset: vi.fn(),
    })),
}));

vi.mock("@repo/ui", () => ({
    AlertToast: ({ title }: { title: string }) => <div role="alert">{title}</div>,
}));

// createPortal renders into document.body in tests
vi.mock("react-dom", async () => {
    const actual = await vi.importActual<typeof import("react-dom")>("react-dom");
    return {
        ...actual,
        createPortal: (node: ReactNode) => node,
    };
});

import * as hooks from "../hooks";

const courts = [
    { id: "court-1", name: "Court A" },
    { id: "court-2", name: "Court B" },
];

function renderModal(overrides: Partial<Parameters<typeof CreateBookingModal>[0]> = {}) {
    const props = {
        clubId: "club-1",
        courts,
        onClose: vi.fn(),
        onSuccess: vi.fn(),
        ...overrides,
    };
    return render(<CreateBookingModal {...props} />);
}

describe("CreateBookingModal", () => {
    beforeEach(() => {
        vi.mocked(hooks.useCreateBooking).mockReturnValue({
            mutate: vi.fn(),
            isPending: false,
            error: null,
            reset: vi.fn(),
        } as unknown as ReturnType<typeof hooks.useCreateBooking>);
    });

    it("renders 'New Booking' heading", () => {
        renderModal();
        expect(screen.getByText("New Booking")).toBeInTheDocument();
    });

    it("calls onClose when Cancel button is clicked", () => {
        const handleClose = vi.fn();
        renderModal({ onClose: handleClose });
        fireEvent.click(screen.getByText("Cancel"));
        expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when X button is clicked", () => {
        const handleClose = vi.fn();
        renderModal({ onClose: handleClose });
        fireEvent.click(screen.getByLabelText("Close modal"));
        expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it("shows court required error when submitting without a court", () => {
        renderModal({ courts: [] });
        fireEvent.click(screen.getByText("Create Booking"));
        expect(screen.getByText("Court is required.")).toBeInTheDocument();
    });

    it("shows start required error when submitting without a start time", () => {
        renderModal();
        // court is pre-selected from first court option
        fireEvent.click(screen.getByText("Create Booking"));
        expect(screen.getByText("Start date/time is required.")).toBeInTheDocument();
    });

    it("calls mutate with correct payload on valid submit", () => {
        const mutate = vi.fn();
        vi.mocked(hooks.useCreateBooking).mockReturnValue({
            mutate,
            isPending: false,
            error: null,
            reset: vi.fn(),
        } as unknown as ReturnType<typeof hooks.useCreateBooking>);

        renderModal();

        // Set start datetime
        fireEvent.change(screen.getByLabelText(/Start/), {
            target: { value: "2026-04-12T10:00" },
        });

        fireEvent.click(screen.getByText("Create Booking"));

        expect(mutate).toHaveBeenCalledWith(
            expect.objectContaining({
                club_id: "club-1",
                court_id: "court-1",
                booking_type: "regular",
            }),
            expect.any(Object)
        );
    });

    it("shows pending state on the submit button", () => {
        vi.mocked(hooks.useCreateBooking).mockReturnValue({
            mutate: vi.fn(),
            isPending: true,
            error: null,
            reset: vi.fn(),
        } as unknown as ReturnType<typeof hooks.useCreateBooking>);

        renderModal();
        expect(screen.getByText("Creating…")).toBeInTheDocument();
    });

    it("renders api error alert when mutation fails", () => {
        vi.mocked(hooks.useCreateBooking).mockReturnValue({
            mutate: vi.fn(),
            isPending: false,
            error: new Error("Slot conflict"),
            reset: vi.fn(),
        } as unknown as ReturnType<typeof hooks.useCreateBooking>);

        renderModal();
        expect(screen.getByRole("alert")).toHaveTextContent("Slot conflict");
    });
});
