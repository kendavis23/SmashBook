import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NewBookingContainer from "./NewBookingContainer";

const mockNavigate = vi.fn();
const mockInvalidateQueries = vi.fn();
const mockCreateMutate = vi.fn();
const mockCreateReset = vi.fn();
const mockRefetchSlots = vi.fn();
let mockSearch = { courtId: "court-1", date: "2026-05-20", startTime: "10:00" };
let mockProfile: { id?: string } = { id: "user-1" };
let mockProfileError = false;

const courtsFixture = [{ id: "court-1", name: "Court One" }];
const availabilityFixture = {
    slots: [
        {
            start_time: "10:00",
            end_time: "11:00",
            is_available: true,
            price: 24,
            price_label: null,
        },
    ],
};
const trainersFixture = [{ staff_profile_id: "staff-1", full_name: "Alex Trainer" }];

vi.mock("@repo/ui", () => ({
    datetimeLocalToApi: (value: string) => `API:${value}`,
}));

vi.mock("@tanstack/react-router", () => ({
    useNavigate: () => mockNavigate,
    useSearch: () => mockSearch,
}));

vi.mock("@tanstack/react-query", () => ({
    useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}));

vi.mock("@repo/player-domain/hooks", () => ({
    useMyProfile: () => ({ data: mockProfile, isError: mockProfileError }),
}));

vi.mock("../../hooks", () => ({
    useCreateBooking: vi.fn(() => ({
        mutate: mockCreateMutate,
        reset: mockCreateReset,
        isPending: false,
        error: null,
    })),
    useListCourts: vi.fn(() => ({
        data: courtsFixture,
    })),
    useGetCourtAvailability: vi.fn(() => ({
        data: availabilityFixture,
        isLoading: false,
        refetch: mockRefetchSlots,
    })),
    useListAvailableTrainers: vi.fn(() => ({
        data: trainersFixture,
        isLoading: false,
        isError: false,
    })),
}));

vi.mock("../../store", () => ({
    useClubAccess: () => ({ clubId: "club-1" }),
}));

vi.mock("../../../payment", () => ({
    PaymentModal: ({
        context,
        onClose,
        onSuccess,
    }: {
        context: { booking: { booking_id: string } };
        onClose: () => void;
        onSuccess: () => void;
    }) => (
        <div>
            <span>Payment for {context.booking.booking_id}</span>
            <button onClick={onClose}>Close payment</button>
            <button onClick={onSuccess}>Payment success</button>
        </div>
    ),
}));

vi.mock("./NewBookingView", () => ({
    default: ({
        form,
        courtError,
        startError,
        staffError,
        apiError,
        isPending,
        onFormChange,
        onSubmit,
        onCancel,
        onDismissError,
        onRefreshSlots,
        selectedPrice,
    }: {
        form: {
            courtId: string;
            bookingDate: string;
            startTime: string;
            bookingType: string;
            playerUserIds: string[];
        };
        courtError: string;
        startError: string;
        staffError: string;
        apiError: string;
        isPending: boolean;
        onFormChange: (patch: Record<string, unknown>) => void;
        onSubmit: (event: { preventDefault: () => void }) => void;
        onCancel: () => void;
        onDismissError: () => void;
        onRefreshSlots: () => void;
        selectedPrice: number | string | null;
    }) => (
        <div>
            <span>court:{form.courtId}</span>
            <span>date:{form.bookingDate}</span>
            <span>time:{form.startTime}</span>
            <span>type:{form.bookingType}</span>
            <span>players:{form.playerUserIds.join(",")}</span>
            <span>price:{selectedPrice}</span>
            <span>pending:{String(isPending)}</span>
            {courtError ? <span>{courtError}</span> : null}
            {startError ? <span>{startError}</span> : null}
            {staffError ? <span>{staffError}</span> : null}
            {apiError ? <span>{apiError}</span> : null}
            <button onClick={() => onFormChange({ courtId: "court-1" })}>Set court</button>
            <button
                onClick={() =>
                    onFormChange({
                        bookingDate: "2026-05-20",
                        startTime: "10:00",
                    })
                }
            >
                Set date time
            </button>
            <button
                onClick={() =>
                    onFormChange({
                        playerUserIds: [" player-2 ", ""],
                        maxPlayers: "6",
                        anchorSkill: "3.5",
                        skillMin: "2",
                        skillMax: "5",
                        eventName: " Club match ",
                    })
                }
            >
                Set optional fields
            </button>
            <button
                onClick={() =>
                    onFormChange({
                        bookingType: "lesson_individual",
                        staffProfileId: "",
                    })
                }
            >
                Set lesson missing trainer
            </button>
            <button
                onClick={() =>
                    onFormChange({
                        bookingType: "lesson_individual",
                        staffProfileId: "staff-1",
                    })
                }
            >
                Set lesson trainer
            </button>
            <button onClick={() => onSubmit({ preventDefault: vi.fn() })}>Submit</button>
            <button onClick={onCancel}>Cancel</button>
            <button onClick={onDismissError}>Dismiss</button>
            <button onClick={onRefreshSlots}>Refresh slots</button>
        </div>
    ),
}));

const bookingFixture = {
    id: "booking-1",
    club_id: "club-1",
    court_id: "court-1",
    court_name: "Court One",
    booking_type: "regular",
    status: "confirmed",
    start_datetime: "2026-05-20T10:00:00Z",
    end_datetime: "2026-05-20T11:00:00Z",
    is_open_game: false,
    min_skill_level: null,
    max_skill_level: null,
    max_players: 4,
    slots_available: 1,
    total_price: 24,
    notes: null,
    event_name: null,
    created_at: "2026-05-19T10:00:00Z",
    players: [],
};

describe("NewBookingContainer", () => {
    beforeEach(() => {
        mockSearch = { courtId: "court-1", date: "2026-05-20", startTime: "10:00" };
        mockProfile = { id: "user-1" };
        mockProfileError = false;
        mockNavigate.mockReset();
        mockInvalidateQueries.mockReset();
        mockCreateMutate.mockReset();
        mockCreateReset.mockReset();
        mockRefetchSlots.mockReset();
    });

    it("initializes form from search params and refreshes slots", () => {
        render(<NewBookingContainer />);

        expect(screen.getByText("court:court-1")).toBeInTheDocument();
        expect(screen.getByText("date:2026-05-20")).toBeInTheDocument();
        expect(screen.getByText("time:10:00")).toBeInTheDocument();
        expect(screen.getByText("price:24")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Refresh slots" }));
        expect(mockRefetchSlots).toHaveBeenCalledOnce();
    });

    it("validates required date before create", () => {
        mockSearch = { courtId: "", date: "", startTime: "" };
        render(<NewBookingContainer />);

        fireEvent.click(screen.getByRole("button", { name: "Submit" }));

        expect(screen.getByText("Date and start time are required.")).toBeInTheDocument();
        expect(mockCreateMutate).not.toHaveBeenCalled();
    });

    it("validates trainer for individual lessons", async () => {
        render(<NewBookingContainer />);

        fireEvent.click(screen.getByRole("button", { name: "Set lesson missing trainer" }));
        fireEvent.click(screen.getByRole("button", { name: "Submit" }));

        expect(
            await screen.findByText("Staff trainer is required for individual lessons.")
        ).toBeInTheDocument();
        expect(mockCreateMutate).not.toHaveBeenCalled();
    });

    it("creates bookings with normalized payload and navigates on success", async () => {
        mockCreateMutate.mockImplementation((_payload, options) => {
            options.onSuccess(bookingFixture);
        });
        render(<NewBookingContainer />);

        fireEvent.click(screen.getByRole("button", { name: "Set optional fields" }));
        fireEvent.click(screen.getByRole("button", { name: "Submit" }));

        await waitFor(() => expect(mockCreateMutate).toHaveBeenCalledOnce());
        expect(mockCreateMutate).toHaveBeenCalledWith(
            expect.objectContaining({
                club_id: "club-1",
                court_id: "court-1",
                booking_type: "regular",
                start_datetime: "API:2026-05-20T10:00",
                max_players: 6,
                anchor_skill_level: 3.5,
                skill_level_override_min: 2,
                skill_level_override_max: 5,
                event_name: "Club match",
                is_open_game: true,
                player_user_ids: ["player-2"],
                staff_profile_id: null,
            }),
            expect.any(Object)
        );
        expect(mockNavigate).toHaveBeenCalledWith(
            expect.objectContaining({
                to: "/bookings",
                search: expect.objectContaining({ created: true }),
            })
        );
    });

    it("opens payment modal for payable created bookings", async () => {
        mockCreateMutate.mockImplementation((_payload, options) => {
            options.onSuccess({
                ...bookingFixture,
                players: [
                    {
                        id: "bp-1",
                        booking_id: "booking-1",
                        user_id: "user-1",
                        full_name: "Current User",
                        role: "organiser",
                        invite_status: "accepted",
                        payment_status: "pending",
                        amount_due: 24,
                    },
                ],
            });
        });
        render(<NewBookingContainer />);

        fireEvent.click(screen.getByRole("button", { name: "Submit" }));

        expect(await screen.findByText("Payment for booking-1")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Close payment" }));
        expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["player", "bookings"] });
        expect(mockNavigate).toHaveBeenCalledWith(
            expect.objectContaining({
                to: "/bookings",
                search: expect.objectContaining({ created: true }),
            })
        );
    });

    it("cancels to bookings and dismisses mutation errors", () => {
        render(<NewBookingContainer />);

        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
        fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

        expect(mockNavigate).toHaveBeenCalledWith(
            expect.objectContaining({
                to: "/bookings",
                search: expect.objectContaining({ created: undefined }),
            })
        );
        expect(mockCreateReset).toHaveBeenCalledOnce();
    });
});
