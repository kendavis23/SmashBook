import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Booking } from "../../types";
import ManageOpenMatchModalContainer from "./ManageOpenMatchModalContainer";

vi.mock("../../hooks", () => ({
    useGetBooking: vi.fn(() => ({ data: undefined, isLoading: true, error: null })),
    useInvitePlayer: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock("../../store", () => ({
    useClubAccess: vi.fn(() => ({ clubId: "club-1", role: "admin", isOwner: false })),
}));

vi.mock("./ManageOpenMatchModalView", () => ({
    ManageOpenMatchModalView: ({
        booking,
        apiError,
        isInviting,
        onClose,
        onInvitePlayer,
    }: {
        booking: Booking;
        apiError: string;
        isInviting: boolean;
        onClose: () => void;
        onInvitePlayer: (playerId: string) => void;
    }) => (
        <div>
            <span>court:{booking.court_name}</span>
            {apiError ? <span>error:{apiError}</span> : null}
            {isInviting ? <span>inviting</span> : null}
            <button onClick={() => onInvitePlayer("user-1")}>Invite</button>
            <button onClick={onClose}>Close</button>
        </div>
    ),
}));

import * as hooks from "../../hooks";
import * as store from "../../store";

const mockBooking: Booking = {
    id: "booking-1",
    club_id: "club-1",
    court_id: "court-1",
    court_name: "Court A",
    booking_type: "regular",
    status: "confirmed",
    is_open_game: true,
    start_datetime: "2026-04-11T10:00:00Z",
    end_datetime: "2026-04-11T11:30:00Z",
    min_skill_level: 2,
    max_skill_level: 5,
    max_players: 4,
    slots_available: 2,
    total_price: 50,
    notes: null,
    event_name: null,
    players: [],
    created_at: "2026-04-10T09:00:00Z",
};

describe("ManageOpenMatchModalContainer", () => {
    beforeEach(() => {
        vi.mocked(store.useClubAccess).mockReturnValue({
            clubId: "club-1",
            role: "admin",
            isOwner: false,
        });
        vi.mocked(hooks.useGetBooking).mockReturnValue({
            data: undefined,
            isLoading: true,
            error: null,
        } as unknown as ReturnType<typeof hooks.useGetBooking>);
        vi.mocked(hooks.useInvitePlayer).mockReturnValue({
            mutate: vi.fn(),
            isPending: false,
        } as unknown as ReturnType<typeof hooks.useInvitePlayer>);
    });

    it("shows loading spinner while booking is loading", () => {
        render(<ManageOpenMatchModalContainer bookingId="booking-1" onClose={vi.fn()} />);
        expect(screen.getByText("Loading open match…")).toBeInTheDocument();
    });

    it("shows error message when fetch fails", () => {
        vi.mocked(hooks.useGetBooking).mockReturnValue({
            data: undefined,
            isLoading: false,
            error: new Error("Network error"),
        } as unknown as ReturnType<typeof hooks.useGetBooking>);

        render(<ManageOpenMatchModalContainer bookingId="booking-1" onClose={vi.fn()} />);
        expect(screen.getByText("Network error")).toBeInTheDocument();
    });

    it("shows fallback error when booking is missing with no error object", () => {
        vi.mocked(hooks.useGetBooking).mockReturnValue({
            data: undefined,
            isLoading: false,
            error: null,
        } as unknown as ReturnType<typeof hooks.useGetBooking>);

        render(<ManageOpenMatchModalContainer bookingId="booking-1" onClose={vi.fn()} />);
        expect(screen.getByText("Open match not found.")).toBeInTheDocument();
    });

    it("calls useGetBooking with correct bookingId and clubId", () => {
        render(<ManageOpenMatchModalContainer bookingId="booking-1" onClose={vi.fn()} />);
        expect(hooks.useGetBooking).toHaveBeenCalledWith("booking-1", "club-1");
    });

    it("calls useInvitePlayer with correct clubId and bookingId", () => {
        render(<ManageOpenMatchModalContainer bookingId="booking-1" onClose={vi.fn()} />);
        expect(hooks.useInvitePlayer).toHaveBeenCalledWith("club-1", "booking-1");
    });

    it("renders ManageOpenMatchModalView when booking loads successfully", () => {
        vi.mocked(hooks.useGetBooking).mockReturnValue({
            data: mockBooking,
            isLoading: false,
            error: null,
        } as unknown as ReturnType<typeof hooks.useGetBooking>);

        render(<ManageOpenMatchModalContainer bookingId="booking-1" onClose={vi.fn()} />);
        expect(screen.getByText("court:Court A")).toBeInTheDocument();
    });

    it("submits invite payload from ManageOpenMatchModalView", () => {
        const mutate = vi.fn();
        vi.mocked(hooks.useGetBooking).mockReturnValue({
            data: mockBooking,
            isLoading: false,
            error: null,
        } as unknown as ReturnType<typeof hooks.useGetBooking>);
        vi.mocked(hooks.useInvitePlayer).mockReturnValue({
            mutate,
            isPending: false,
        } as unknown as ReturnType<typeof hooks.useInvitePlayer>);

        render(<ManageOpenMatchModalContainer bookingId="booking-1" onClose={vi.fn()} />);
        screen.getByRole("button", { name: "Invite" }).click();

        expect(mutate).toHaveBeenCalledWith(
            { user_id: "user-1" },
            expect.objectContaining({
                onSuccess: expect.any(Function),
                onError: expect.any(Function),
            })
        );
    });
});
