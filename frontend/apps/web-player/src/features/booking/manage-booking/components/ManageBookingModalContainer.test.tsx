import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ManageBookingModalContainer from "./ManageBookingModalContainer";

const mockUseGetBooking = vi.fn();
const mockInviteMutate = vi.fn();
const mockRespondMutate = vi.fn();
const mockRefetch = vi.fn();
const mockOnSuccess = vi.fn();
let mockProfile = { id: "user-1" };

vi.mock("../../hooks", () => ({
    useGetBooking: (...args: unknown[]) => mockUseGetBooking(...args),
    useInvitePlayer: vi.fn(() => ({ mutate: mockInviteMutate, isPending: false })),
    useRespondInvite: vi.fn(() => ({ mutate: mockRespondMutate, isPending: false })),
}));

vi.mock("@repo/player-domain/hooks", () => ({
    useMyProfile: () => ({ data: mockProfile }),
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

vi.mock("./ManageBookingView", () => ({
    default: ({
        booking,
        playerRole,
        myInfo,
        apiError,
        onInvitePlayer,
        onRespondInvite,
        onPayClick,
        onDismissError,
        onRefresh,
        onClose,
    }: {
        booking: typeof bookingFixture;
        playerRole: string;
        myInfo?: { paymentStatus: string; amountDue: number };
        apiError: string;
        onInvitePlayer: (userId: string) => void;
        onRespondInvite: (action: "accepted") => void;
        onPayClick: (item: unknown) => void;
        onDismissError: () => void;
        onRefresh: () => void;
        onClose: () => void;
    }) => (
        <div>
            <span>{booking.court_name}</span>
            <span>Role: {playerRole}</span>
            <span>Due: {myInfo?.amountDue ?? 0}</span>
            {apiError ? <div role="alert">{apiError}</div> : null}
            <button onClick={() => onInvitePlayer("player-2")}>Invite player</button>
            <button onClick={() => onRespondInvite("accepted")}>Accept invite</button>
            <button
                onClick={() =>
                    onPayClick({
                        booking_id: booking.id,
                        club_id: booking.club_id,
                        court_id: booking.court_id,
                        court_name: booking.court_name,
                        booking_type: booking.booking_type,
                        status: booking.status,
                        start_datetime: booking.start_datetime,
                        end_datetime: booking.end_datetime,
                        role: playerRole,
                        invite_status: "accepted",
                        payment_status: "pending",
                        amount_due: myInfo?.amountDue ?? 0,
                    })
                }
            >
                Pay
            </button>
            <button onClick={onRefresh}>Refresh</button>
            <button onClick={onDismissError}>Dismiss</button>
            <button onClick={onClose}>Close</button>
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
            discount_amount: "0",
            discount_source: "",
        },
    ],
};

function setupBooking(overrides: Partial<ReturnType<typeof mockUseGetBooking>> = {}) {
    mockUseGetBooking.mockReturnValue({
        data: bookingFixture,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
        ...overrides,
    });
}

describe("ManageBookingModalContainer", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        mockProfile = { id: "user-1" };
        mockUseGetBooking.mockReset();
        mockInviteMutate.mockReset();
        mockRespondMutate.mockReset();
        mockRefetch.mockReset();
        mockOnSuccess.mockReset();
        setupBooking();
    });

    afterEach(() => {
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
    });

    it("renders loading and error states", () => {
        setupBooking({ data: undefined, isLoading: true });
        const { rerender } = render(
            <ManageBookingModalContainer
                bookingId="booking-1"
                clubId="club-1"
                onClose={vi.fn()}
            />
        );
        expect(screen.getByText("Loading booking…")).toBeInTheDocument();

        setupBooking({ data: undefined, isLoading: false, error: new Error("Missing booking") });
        rerender(
            <ManageBookingModalContainer
                bookingId="booking-1"
                clubId="club-1"
                onClose={vi.fn()}
            />
        );
        expect(screen.getByText("Missing booking")).toBeInTheDocument();
    });

    it("passes booking and current player role to the view", () => {
        render(
            <ManageBookingModalContainer
                bookingId="booking-1"
                clubId="club-1"
                onClose={vi.fn()}
            />
        );

        expect(screen.getByText("Court One")).toBeInTheDocument();
        expect(screen.getByText("Role: organiser")).toBeInTheDocument();
        expect(screen.getByText("Due: 24")).toBeInTheDocument();
    });

    it("invites players, handles invite errors, and dismisses them", async () => {
        mockInviteMutate.mockImplementation((_payload, options) => {
            options.onError(new Error("Invite failed"));
        });
        render(
            <ManageBookingModalContainer
                bookingId="booking-1"
                clubId="club-1"
                onClose={vi.fn()}
                onSuccess={mockOnSuccess}
            />
        );

        fireEvent.click(screen.getByRole("button", { name: "Invite player" }));
        expect(mockInviteMutate).toHaveBeenCalledWith(
            { user_id: "player-2" },
            expect.any(Object)
        );
        expect(screen.getByRole("alert")).toHaveTextContent("Invite failed");

        fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("responds to invites and refetches on success", () => {
        mockRespondMutate.mockImplementation((_payload, options) => {
            options.onSuccess();
        });
        render(
            <ManageBookingModalContainer
                bookingId="booking-1"
                clubId="club-1"
                onClose={vi.fn()}
                onSuccess={mockOnSuccess}
            />
        );

        fireEvent.click(screen.getByRole("button", { name: "Accept invite" }));
        expect(mockRespondMutate).toHaveBeenCalledWith({ action: "accepted" }, expect.any(Object));
        expect(mockRefetch).toHaveBeenCalled();
        expect(mockOnSuccess).toHaveBeenCalled();
    });

    it("opens payment modal and refreshes when payment closes", () => {
        render(
            <ManageBookingModalContainer
                bookingId="booking-1"
                clubId="club-1"
                onClose={vi.fn()}
                onSuccess={mockOnSuccess}
            />
        );

        fireEvent.click(screen.getByRole("button", { name: "Pay" }));
        expect(screen.getByText("Payment for booking-1")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Close payment" }));
        expect(mockRefetch).toHaveBeenCalled();
        expect(mockOnSuccess).toHaveBeenCalled();
    });
});
