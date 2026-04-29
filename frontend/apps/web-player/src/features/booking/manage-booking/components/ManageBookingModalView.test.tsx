import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ManageBookingModalView } from "./ManageBookingModalView";

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

vi.mock("@repo/ui", () => ({
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
    players: [],
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
    onClose: vi.fn(),
};

describe("ManageBookingModalView", () => {
    it("renders court name in heading and status badge", () => {
        render(<ManageBookingModalView {...defaultProps} />);

        expect(screen.getByRole("heading", { name: "Court 1" })).toBeInTheDocument();
        expect(screen.getByText("confirmed")).toBeInTheDocument();
    });

    it("renders stat pills with booking metadata", () => {
        render(<ManageBookingModalView {...defaultProps} />);

        expect(screen.getByText("Type")).toBeInTheDocument();
        expect(screen.getByText("Players")).toBeInTheDocument();
        expect(screen.getByText("Total")).toBeInTheDocument();
    });

    it("calls onClose when X button is clicked", () => {
        const onClose = vi.fn();
        render(<ManageBookingModalView {...defaultProps} onClose={onClose} />);

        fireEvent.click(screen.getByRole("button", { name: "Close modal" }));
        expect(onClose).toHaveBeenCalled();
    });

    it("calls onRefresh when refresh button is clicked", () => {
        const onRefresh = vi.fn();
        render(<ManageBookingModalView {...defaultProps} onRefresh={onRefresh} />);

        fireEvent.click(screen.getByRole("button", { name: "Refresh booking" }));
        expect(onRefresh).toHaveBeenCalled();
    });

    it("calls onClose when Close button in footer is clicked", () => {
        const onClose = vi.fn();
        render(<ManageBookingModalView {...defaultProps} onClose={onClose} />);

        fireEvent.click(screen.getByRole("button", { name: "Close" }));
        expect(onClose).toHaveBeenCalled();
    });

    it("shows api error and dismisses it", () => {
        const onDismissError = vi.fn();
        render(
            <ManageBookingModalView
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
        render(<ManageBookingModalView {...defaultProps} playerRole="organiser" />);

        expect(screen.getByText("Invite Player")).toBeInTheDocument();
        expect(screen.getByLabelText("Player")).toBeInTheDocument();
    });

    it("calls onInvitePlayer and clears input on invite", () => {
        const onInvitePlayer = vi.fn();
        render(
            <ManageBookingModalView
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

    it("disables Invite button when input is empty", () => {
        render(<ManageBookingModalView {...defaultProps} playerRole="organiser" />);

        expect(screen.getByRole("button", { name: "Invite" })).toBeDisabled();
    });

    it("shows respond buttons for player with pending invite status", () => {
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
            <ManageBookingModalView
                {...defaultProps}
                booking={bookingPending as never}
                playerRole="player"
                myInfo={{
                    role: "player",
                    inviteStatus: "pending",
                    paymentStatus: "pending",
                    amountDue: 0,
                }}
            />
        );

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
            <ManageBookingModalView
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
            <ManageBookingModalView
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

    it("shows invite status label for player who already responded", () => {
        const bookingAccepted = {
            ...booking,
            players: [
                {
                    id: "p1",
                    full_name: "Alex",
                    role: "player",
                    invite_status: "accepted",
                    payment_status: "paid",
                    amount_due: 0,
                },
            ],
        };
        render(
            <ManageBookingModalView
                {...defaultProps}
                booking={bookingAccepted as never}
                playerRole="player"
                myInfo={{
                    role: "player",
                    inviteStatus: "accepted",
                    paymentStatus: "paid",
                    amountDue: 0,
                }}
            />
        );

        expect(screen.getByText("accepted")).toBeInTheDocument();
    });

    it("shows no action section for player with no invite record", () => {
        render(<ManageBookingModalView {...defaultProps} playerRole="player" />);

        expect(screen.queryByRole("button", { name: "Accept" })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Invite" })).not.toBeInTheDocument();
    });

    it("expands players table when Players section is clicked", () => {
        const bookingWithPlayers = {
            ...booking,
            players: [
                {
                    id: "p1",
                    full_name: "Alex Doe",
                    role: "player",
                    invite_status: "accepted",
                    payment_status: "paid",
                    amount_due: 10,
                },
            ],
        };
        render(<ManageBookingModalView {...defaultProps} booking={bookingWithPlayers as never} />);

        fireEvent.click(screen.getByRole("button", { name: /Players/i }));
        expect(screen.getByText("Alex Doe")).toBeInTheDocument();
    });

    it("does not render players section when booking has no players", () => {
        render(<ManageBookingModalView {...defaultProps} />);

        expect(screen.queryByRole("button", { name: /Players/i })).not.toBeInTheDocument();
    });
});
