import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NewBookingModalContainer from "./NewBookingModalContainer";

const mockInvalidateQueries = vi.fn();
const mockCreateMutate = vi.fn();
const mockCreateReset = vi.fn();
const mockRefetchSlots = vi.fn();
let mockProfile: { id?: string } = { id: "user-1" };
let mockProfileError = false;

vi.mock("@repo/ui", () => ({
    datetimeLocalToApi: (value: string) => `API:${value}`,
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
        data: [{ id: "court-1", name: "Court One" }],
    })),
    useGetCourtAvailability: vi.fn(() => ({
        data: {
            slots: [
                {
                    start_time: "10:00",
                    end_time: "11:00",
                    is_available: true,
                    price: 24,
                    price_label: null,
                },
            ],
        },
        isLoading: false,
        refetch: mockRefetchSlots,
    })),
    useGetPriceQuote: vi.fn(() => ({
        data: { base_price: 24 },
    })),
    useListAvailableTrainers: vi.fn(() => ({
        data: [{ staff_profile_id: "staff-1", full_name: "Alex Trainer" }],
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
        staffError,
        onFormChange,
        onSubmit,
        onCancel,
        onClose,
        onDismissError,
        onRefreshSlots,
        priceQuote,
        mode,
        courtName,
    }: {
        form: {
            courtId: string;
            bookingDate: string;
            startTime: string;
            bookingType: string;
        };
        staffError: string;
        onFormChange: (patch: Record<string, unknown>) => void;
        onSubmit: (event: { preventDefault: () => void }) => void;
        onCancel: () => void;
        onClose?: () => void;
        onDismissError: () => void;
        onRefreshSlots: () => void;
        priceQuote: { base_price?: number | null } | null | undefined;
        mode?: string;
        courtName?: string;
    }) => (
        <div>
            <span>mode:{mode}</span>
            <span>courtName:{courtName}</span>
            <span>court:{form.courtId}</span>
            <span>date:{form.bookingDate}</span>
            <span>time:{form.startTime}</span>
            <span>type:{form.bookingType}</span>
            <span>price:{priceQuote?.base_price ?? null}</span>
            {staffError ? <span>{staffError}</span> : null}
            <button
                onClick={() =>
                    onFormChange({
                        playerUserIds: [" player-2 "],
                        maxPlayers: "6",
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
            <button onClick={onClose}>Close</button>
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

afterEach(cleanup);

describe("NewBookingModalContainer", () => {
    beforeEach(() => {
        mockProfile = { id: "user-1" };
        mockProfileError = false;
        mockInvalidateQueries.mockReset();
        mockCreateMutate.mockReset();
        mockCreateReset.mockReset();
        mockRefetchSlots.mockReset();
    });

    it("initializes modal form from props", () => {
        render(
            <NewBookingModalContainer
                courtId="court-1"
                courtName="Court One"
                date="2026-05-20"
                startTime="10:00"
                onClose={vi.fn()}
            />
        );

        expect(screen.getByText("mode:modal")).toBeInTheDocument();
        expect(screen.getByText("courtName:Court One")).toBeInTheDocument();
        expect(screen.getByText("court:court-1")).toBeInTheDocument();
        expect(screen.getByText("date:2026-05-20")).toBeInTheDocument();
        expect(screen.getByText("time:10:00")).toBeInTheDocument();
    });

    it("creates a booking and closes with success when no payment is due", async () => {
        const onClose = vi.fn();
        const onSuccess = vi.fn();
        mockCreateMutate.mockImplementation((_payload, options) => {
            options.onSuccess(bookingFixture);
        });
        render(
            <NewBookingModalContainer
                courtId="court-1"
                courtName="Court One"
                date="2026-05-20"
                startTime="10:00"
                onClose={onClose}
                onSuccess={onSuccess}
            />
        );

        fireEvent.click(screen.getByRole("button", { name: "Set optional fields" }));
        fireEvent.click(screen.getByRole("button", { name: "Submit" }));

        await waitFor(() => expect(mockCreateMutate).toHaveBeenCalledOnce());
        expect(mockCreateMutate).toHaveBeenCalledWith(
            expect.objectContaining({
                club_id: "club-1",
                court_id: "court-1",
                start_datetime: "API:2026-05-20T10:00",
                max_players: 6,
                event_name: "Club match",
                is_open_game: true,
                player_user_ids: ["player-2"],
                staff_profile_id: null,
            }),
            expect.any(Object)
        );
        expect(onClose).toHaveBeenCalledOnce();
        expect(onSuccess).toHaveBeenCalledOnce();
    });

    it("validates trainer for individual lessons", async () => {
        render(
            <NewBookingModalContainer
                courtId="court-1"
                courtName="Court One"
                date="2026-05-20"
                startTime="10:00"
                onClose={vi.fn()}
            />
        );

        fireEvent.click(screen.getByRole("button", { name: "Set lesson missing trainer" }));
        fireEvent.click(screen.getByRole("button", { name: "Submit" }));

        expect(
            await screen.findByText("Staff trainer is required for individual lessons.")
        ).toBeInTheDocument();
        expect(mockCreateMutate).not.toHaveBeenCalled();
    });

    it("opens payment modal and closes through the payment flow", async () => {
        const onClose = vi.fn();
        const onSuccess = vi.fn();
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
        render(
            <NewBookingModalContainer
                courtId="court-1"
                courtName="Court One"
                date="2026-05-20"
                startTime="10:00"
                onClose={onClose}
                onSuccess={onSuccess}
            />
        );

        fireEvent.click(screen.getByRole("button", { name: "Submit" }));

        expect(await screen.findByText("Payment for booking-1")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Close payment" }));

        expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["player", "bookings"] });
        expect(onSuccess).toHaveBeenCalledOnce();
        expect(onClose).not.toHaveBeenCalled();
    });

    it("cancels, dismisses errors, and refreshes slots", () => {
        const onClose = vi.fn();
        render(
            <NewBookingModalContainer
                courtId="court-1"
                courtName="Court One"
                date="2026-05-20"
                startTime="10:00"
                onClose={onClose}
            />
        );

        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
        fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
        fireEvent.click(screen.getByRole("button", { name: "Refresh slots" }));

        expect(onClose).toHaveBeenCalledOnce();
        expect(mockCreateReset).toHaveBeenCalledOnce();
        expect(mockRefetchSlots).toHaveBeenCalledOnce();
    });
});
