import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ManageBookingView from "./ManageBookingView";

vi.mock("../../components/PlayerAutocomplete", () => ({
    PlayerAutocomplete: ({
        label,
        value,
        onChange,
        disabled,
    }: {
        label: string;
        value: string;
        onChange: (value: string) => void;
        disabled?: boolean;
    }) => (
        <input
            type="text"
            aria-label={label}
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
        />
    ),
}));

vi.mock("./ManageBookingModalView", () => ({
    ManageBookingModalView: ({
        booking,
        onClose,
    }: {
        booking: { court_name: string };
        onClose: () => void;
    }) => (
        <div data-testid="modal-view">
            <span>{booking.court_name}</span>
            <button onClick={onClose}>Close modal</button>
        </div>
    ),
}));

vi.mock("@repo/ui", () => ({
    Breadcrumb: ({ items }: { items: { label: string }[] }) => (
        <nav>
            {items.map((item) => (
                <span key={item.label}>{item.label}</span>
            ))}
        </nav>
    ),
    AlertToast: ({ title, onClose }: { title: string; onClose: () => void }) => (
        <div role="alert">
            <span>{title}</span>
            <button onClick={onClose}>Dismiss</button>
        </div>
    ),
    StatPill: ({ label, value }: { label: string; value: string }) => (
        <div>
            <span>{label}</span>
            <span>{value}</span>
        </div>
    ),
    formatUTCDate: (v: string) => v,
    formatUTCDateTime: (v: string) => v,
    formatUTCTime: (v: string) => v,
    formatCurrency: (amount: number | null) => (amount == null ? "—" : `£${amount.toFixed(2)}`),
}));

const booking = {
    id: "booking-1",
    club_id: "club-1",
    court_id: "court-1",
    court_name: "Court 1",
    booking_type: "regular",
    status: "confirmed",
    start_datetime: "2026-04-20T10:00:00Z",
    end_datetime: "2026-04-20T11:30:00Z",
    created_at: "2026-04-18T09:00:00Z",
    notes: "",
    event_name: null,
    is_open_game: false,
    total_price: 20,
    max_players: 4,
    slots_available: 2,
    min_skill_level: null,
    max_skill_level: null,
    players: [
        {
            id: "player-1",
            full_name: "Alex Doe",
            role: "player",
            invite_status: "accepted",
            payment_status: "paid",
            amount_due: 10,
        },
    ],
};

const defaultProps = {
    booking: booking as never,
    playerRole: "player" as const,
    apiError: "",
    isInvitePending: false,
    isRespondPending: false,
    onInvitePlayer: vi.fn(),
    onRespondInvite: vi.fn(),
    onDismissError: vi.fn(),
    onRefresh: vi.fn(),
    onBack: vi.fn(),
};

describe("ManageBookingView — page mode", () => {
    it("renders booking header with court name and status", () => {
        render(<ManageBookingView {...defaultProps} />);

        expect(screen.getByRole("heading", { name: "Court 1" })).toBeInTheDocument();
        expect(screen.getByText("confirmed")).toBeInTheDocument();
    });

    it("renders breadcrumb with Bookings and Manage Booking", () => {
        render(<ManageBookingView {...defaultProps} />);

        expect(screen.getByText("Bookings")).toBeInTheDocument();
        expect(screen.getByText("Manage Booking")).toBeInTheDocument();
    });

    it("renders overview fields for Type, Players, Total price", () => {
        render(<ManageBookingView {...defaultProps} />);

        expect(screen.getByText("Type")).toBeInTheDocument();
        expect(screen.getAllByText("Players").length).toBeGreaterThan(0);
        expect(screen.getByText("Total price")).toBeInTheDocument();
    });

    it("calls onRefresh when Refresh button is clicked", () => {
        const onRefresh = vi.fn();
        render(<ManageBookingView {...defaultProps} onRefresh={onRefresh} />);

        fireEvent.click(screen.getByRole("button", { name: "Refresh booking" }));
        expect(onRefresh).toHaveBeenCalled();
    });

    it("calls onBack when Back button is clicked", () => {
        const onBack = vi.fn();
        render(<ManageBookingView {...defaultProps} onBack={onBack} />);

        fireEvent.click(screen.getByRole("button", { name: "Back" }));
        expect(onBack).toHaveBeenCalled();
    });

    it("shows api error and dismisses it", () => {
        const onDismissError = vi.fn();
        render(
            <ManageBookingView
                {...defaultProps}
                apiError="Something went wrong"
                onDismissError={onDismissError}
            />
        );

        expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong");
        fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
        expect(onDismissError).toHaveBeenCalled();
    });

    it("shows invite section for organiser role", () => {
        render(<ManageBookingView {...defaultProps} playerRole="organiser" />);

        expect(screen.getByRole("heading", { name: "Invite Player" })).toBeInTheDocument();
        expect(screen.getByLabelText("Player")).toBeInTheDocument();
    });

    it("calls onInvitePlayer with trimmed id and clears input", () => {
        const onInvitePlayer = vi.fn();
        render(
            <ManageBookingView
                {...defaultProps}
                playerRole="organiser"
                onInvitePlayer={onInvitePlayer}
            />
        );

        fireEvent.change(screen.getByLabelText("Player"), {
            target: { value: " user-abc " },
        });
        fireEvent.click(screen.getByRole("button", { name: "Invite" }));

        expect(onInvitePlayer).toHaveBeenCalledWith("user-abc");
        expect(screen.getByLabelText("Player")).toHaveValue("");
    });

    it("disables Invite button when invite input is empty", () => {
        render(<ManageBookingView {...defaultProps} playerRole="organiser" />);

        expect(screen.getByRole("button", { name: "Invite" })).toBeDisabled();
    });

    it("shows respond section for player with pending invite", () => {
        const bookingWithPendingInvite = {
            ...booking,
            players: [
                {
                    id: "player-1",
                    full_name: "Alex Doe",
                    role: "player",
                    invite_status: "pending",
                    payment_status: "unpaid",
                    amount_due: 10,
                },
            ],
        };
        render(
            <ManageBookingView
                {...defaultProps}
                booking={bookingWithPendingInvite as never}
                playerRole="player"
                myInfo={{
                    role: "player",
                    inviteStatus: "pending",
                    paymentStatus: "pending",
                    amountDue: 10,
                }}
            />
        );

        expect(screen.getByRole("heading", { name: "Respond to Invite" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Accept" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Decline" })).toBeInTheDocument();
    });

    it("calls onRespondInvite with accepted when Accept is clicked", () => {
        const onRespondInvite = vi.fn();
        const bookingPending = {
            ...booking,
            players: [
                {
                    id: "p1",
                    full_name: "Alex",
                    role: "player",
                    invite_status: "pending",
                    payment_status: "unpaid",
                    amount_due: 0,
                },
            ],
        };
        render(
            <ManageBookingView
                {...defaultProps}
                booking={bookingPending as never}
                playerRole="player"
                myInfo={{
                    role: "player",
                    inviteStatus: "pending",
                    paymentStatus: "pending",
                    amountDue: 0,
                }}
                onRespondInvite={onRespondInvite}
            />
        );

        fireEvent.click(screen.getByRole("button", { name: "Accept" }));
        expect(onRespondInvite).toHaveBeenCalledWith("accepted");
    });

    it("calls onRespondInvite with declined when Decline is clicked", () => {
        const onRespondInvite = vi.fn();
        const bookingPending = {
            ...booking,
            players: [
                {
                    id: "p1",
                    full_name: "Alex",
                    role: "player",
                    invite_status: "pending",
                    payment_status: "unpaid",
                    amount_due: 0,
                },
            ],
        };
        render(
            <ManageBookingView
                {...defaultProps}
                booking={bookingPending as never}
                playerRole="player"
                myInfo={{
                    role: "player",
                    inviteStatus: "pending",
                    paymentStatus: "pending",
                    amountDue: 0,
                }}
                onRespondInvite={onRespondInvite}
            />
        );

        fireEvent.click(screen.getByRole("button", { name: "Decline" }));
        expect(onRespondInvite).toHaveBeenCalledWith("declined");
    });

    it("shows accepted invite status for player who already accepted", () => {
        render(<ManageBookingView {...defaultProps} playerRole="player" />);

        expect(screen.getByText("accepted")).toBeInTheDocument();
    });

    it("shows no invite section for player with no invite record", () => {
        const bookingNoPlayers = { ...booking, players: [] };
        render(
            <ManageBookingView
                {...defaultProps}
                booking={bookingNoPlayers as never}
                playerRole="player"
            />
        );

        expect(
            screen.queryByRole("heading", { name: "Respond to Invite" })
        ).not.toBeInTheDocument();
        expect(screen.queryByRole("heading", { name: "Invite Player" })).not.toBeInTheDocument();
    });

    it("renders players table when players exist", () => {
        render(<ManageBookingView {...defaultProps} />);

        expect(screen.getByText("Alex Doe")).toBeInTheDocument();
    });

    it("labels participant invite and payment statuses", () => {
        render(<ManageBookingView {...defaultProps} />);

        expect(screen.getByText("Invite:")).toBeInTheDocument();
        expect(screen.getByText("Payment:")).toBeInTheDocument();
        expect(screen.getByText("accepted")).toBeInTheDocument();
        expect(screen.getByText("paid")).toBeInTheDocument();
    });

    it("does not render players section when booking has no players", () => {
        const bookingNoPlayers = { ...booking, players: [] };
        render(<ManageBookingView {...defaultProps} booking={bookingNoPlayers as never} />);

        expect(screen.queryByRole("heading", { name: "Players" })).not.toBeInTheDocument();
    });
});

describe("ManageBookingView — modal mode", () => {
    const modalProps = { ...defaultProps, mode: "modal" as const, onClose: vi.fn() };

    it("renders modal view instead of page layout", () => {
        render(<ManageBookingView {...modalProps} />);

        expect(screen.getByTestId("modal-view")).toBeInTheDocument();
    });

    it("does not render breadcrumb in modal mode", () => {
        render(<ManageBookingView {...modalProps} />);

        expect(screen.queryByText("Bookings")).not.toBeInTheDocument();
        expect(screen.queryByText("Manage Booking")).not.toBeInTheDocument();
    });

    it("passes booking to modal view", () => {
        render(<ManageBookingView {...modalProps} />);

        expect(screen.getByText("Court 1")).toBeInTheDocument();
    });

    it("calls onClose when close button in modal is clicked", () => {
        const onClose = vi.fn();
        render(<ManageBookingView {...modalProps} onClose={onClose} />);

        fireEvent.click(screen.getByRole("button", { name: "Close modal" }));
        expect(onClose).toHaveBeenCalled();
    });

    it("falls back to onBack when onClose is not provided in modal mode", () => {
        const onBack = vi.fn();
        render(<ManageBookingView {...defaultProps} mode="modal" onBack={onBack} />);

        fireEvent.click(screen.getByRole("button", { name: "Close modal" }));
        expect(onBack).toHaveBeenCalled();
    });
});
