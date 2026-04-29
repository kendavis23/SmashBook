import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ManageBookingContainer from "./ManageBookingContainer";

const mockNavigate = vi.fn();
const mockInviteMutate = vi.fn();
const mockRespondMutate = vi.fn();
const mockRefetch = vi.fn();
let mockSearch: {
    clubId: string;
    role?: "player" | "organiser";
    inviteStatus?: "pending" | "accepted" | "declined";
    paymentStatus?: "pending" | "paid" | "unpaid";
    amountDue?: number;
} = { clubId: "club-1" };

vi.mock("@tanstack/react-router", () => ({
    useNavigate: () => mockNavigate,
    useParams: () => ({ bookingId: "booking-1" }),
    useSearch: () => mockSearch,
}));

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

vi.mock("../../hooks", () => ({
    useGetBooking: vi.fn(),
    useInvitePlayer: vi.fn(),
    useRespondInvite: vi.fn(),
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

import { useGetBooking, useInvitePlayer, useRespondInvite } from "../../hooks";

const mockUseGetBooking = useGetBooking as ReturnType<typeof vi.fn>;
const mockUseInvitePlayer = useInvitePlayer as ReturnType<typeof vi.fn>;
const mockUseRespondInvite = useRespondInvite as ReturnType<typeof vi.fn>;

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

function setupMocks(overrides?: { isLoading?: boolean; error?: Error | null; data?: unknown }) {
    mockUseGetBooking.mockReturnValue({
        data: overrides?.data === undefined ? booking : overrides.data,
        isLoading: overrides?.isLoading ?? false,
        error: overrides?.error ?? null,
        refetch: mockRefetch,
    });
    mockUseInvitePlayer.mockReturnValue({
        mutate: mockInviteMutate,
        isPending: false,
    });
    mockUseRespondInvite.mockReturnValue({
        mutate: mockRespondMutate,
        isPending: false,
    });
}

describe("ManageBookingContainer", () => {
    beforeEach(() => {
        mockSearch = { clubId: "club-1" };
        setupMocks();
        mockNavigate.mockReset();
        mockInviteMutate.mockReset();
        mockRespondMutate.mockReset();
        mockRefetch.mockReset();
    });

    it("shows loading state while booking is fetching", () => {
        setupMocks({ isLoading: true, data: undefined });
        render(<ManageBookingContainer />);

        expect(screen.getByText("Loading booking…")).toBeInTheDocument();
    });

    it("shows error state when booking fails to load", () => {
        setupMocks({ data: undefined, error: new Error("Booking not found") });
        render(<ManageBookingContainer />);

        expect(screen.getByText("Booking not found")).toBeInTheDocument();
    });

    it("shows fallback error message when error has no message", () => {
        setupMocks({ data: null, error: null });
        render(<ManageBookingContainer />);

        expect(screen.getByText("Booking not found.")).toBeInTheDocument();
    });

    it("renders booking data on success", async () => {
        render(<ManageBookingContainer />);

        await waitFor(() => {
            expect(screen.getByRole("heading", { name: "Court 1" })).toBeInTheDocument();
        });
    });

    it("navigates to /bookings when Back is clicked", async () => {
        render(<ManageBookingContainer />);

        await waitFor(() => {
            expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
        });
        fireEvent.click(screen.getByRole("button", { name: "Back" }));

        expect(mockNavigate).toHaveBeenCalledWith(expect.objectContaining({ to: "/bookings" }));
    });

    it("calls refetch when Refresh is clicked", async () => {
        render(<ManageBookingContainer />);

        await waitFor(() => {
            expect(screen.getByRole("button", { name: "Refresh booking" })).toBeInTheDocument();
        });
        fireEvent.click(screen.getByRole("button", { name: "Refresh booking" }));

        expect(mockRefetch).toHaveBeenCalled();
    });

    it("shows invite section for organiser role", async () => {
        const bookingAsOrganiser = {
            ...booking,
            players: [
                {
                    id: "p1",
                    full_name: "Alex",
                    role: "organiser",
                    invite_status: "accepted",
                    payment_status: "paid",
                    amount_due: 0,
                },
            ],
        };
        mockSearch = {
            clubId: "club-1",
            role: "organiser",
            inviteStatus: "accepted",
            paymentStatus: "paid",
            amountDue: 0,
        };
        setupMocks({ data: bookingAsOrganiser });
        render(<ManageBookingContainer />);

        await waitFor(() => {
            expect(screen.getByRole("heading", { name: "Invite Player" })).toBeInTheDocument();
        });
    });

    it("invites a player and calls mutate with user_id", async () => {
        const bookingAsOrganiser = {
            ...booking,
            players: [
                {
                    id: "p1",
                    full_name: "Alex",
                    role: "organiser",
                    invite_status: "accepted",
                    payment_status: "paid",
                    amount_due: 0,
                },
            ],
        };
        mockSearch = {
            clubId: "club-1",
            role: "organiser",
            inviteStatus: "accepted",
            paymentStatus: "paid",
            amountDue: 0,
        };
        setupMocks({ data: bookingAsOrganiser });
        render(<ManageBookingContainer />);

        await waitFor(() => {
            expect(screen.getByLabelText("Player")).toBeInTheDocument();
        });

        fireEvent.change(screen.getByLabelText("Player"), {
            target: { value: " user-123 " },
        });
        fireEvent.click(screen.getByRole("button", { name: "Invite" }));

        expect(mockInviteMutate).toHaveBeenCalledWith(
            { user_id: "user-123" },
            expect.objectContaining({
                onSuccess: expect.any(Function),
                onError: expect.any(Function),
            })
        );
    });

    it("shows api error when invite fails", async () => {
        mockUseInvitePlayer.mockReturnValue({
            mutate: (payload: unknown, opts: { onError: (err: Error) => void }) => {
                opts.onError(new Error("Invite failed"));
            },
            isPending: false,
        });
        const bookingAsOrganiser = {
            ...booking,
            players: [
                {
                    id: "p1",
                    full_name: "Alex",
                    role: "organiser",
                    invite_status: "accepted",
                    payment_status: "paid",
                    amount_due: 0,
                },
            ],
        };
        mockSearch = {
            clubId: "club-1",
            role: "organiser",
            inviteStatus: "accepted",
            paymentStatus: "paid",
            amountDue: 0,
        };
        setupMocks({ data: bookingAsOrganiser });
        mockUseInvitePlayer.mockReturnValue({
            mutate: (_payload: unknown, opts: { onError: (err: Error) => void }) => {
                opts.onError(new Error("Invite failed"));
            },
            isPending: false,
        });

        render(<ManageBookingContainer />);

        await waitFor(() => {
            expect(screen.getByLabelText("Player")).toBeInTheDocument();
        });

        fireEvent.change(screen.getByLabelText("Player"), {
            target: { value: "user-xyz" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Invite" }));

        await waitFor(() => {
            expect(screen.getByRole("alert")).toHaveTextContent("Invite failed");
        });
    });

    it("shows respond section for player with pending invite", async () => {
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
        mockSearch = {
            clubId: "club-1",
            role: "player",
            inviteStatus: "pending",
            paymentStatus: "unpaid",
            amountDue: 0,
        };
        setupMocks({ data: bookingPending });
        render(<ManageBookingContainer />);

        await waitFor(() => {
            expect(screen.getByRole("button", { name: "Accept" })).toBeInTheDocument();
        });
    });

    it("calls respondMutate with accepted when Accept is clicked", async () => {
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
        mockSearch = {
            clubId: "club-1",
            role: "player",
            inviteStatus: "pending",
            paymentStatus: "unpaid",
            amountDue: 0,
        };
        setupMocks({ data: bookingPending });
        render(<ManageBookingContainer />);

        await waitFor(() => {
            expect(screen.getByRole("button", { name: "Accept" })).toBeInTheDocument();
        });
        fireEvent.click(screen.getByRole("button", { name: "Accept" }));

        expect(mockRespondMutate).toHaveBeenCalledWith(
            { action: "accepted" },
            expect.objectContaining({
                onSuccess: expect.any(Function),
                onError: expect.any(Function),
            })
        );
    });

    it("calls respondMutate with declined when Decline is clicked", async () => {
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
        mockSearch = {
            clubId: "club-1",
            role: "player",
            inviteStatus: "pending",
            paymentStatus: "unpaid",
            amountDue: 0,
        };
        setupMocks({ data: bookingPending });
        render(<ManageBookingContainer />);

        await waitFor(() => {
            expect(screen.getByRole("button", { name: "Decline" })).toBeInTheDocument();
        });
        fireEvent.click(screen.getByRole("button", { name: "Decline" }));

        expect(mockRespondMutate).toHaveBeenCalledWith(
            { action: "declined" },
            expect.objectContaining({
                onSuccess: expect.any(Function),
                onError: expect.any(Function),
            })
        );
    });

    it("dismisses api error when Dismiss is clicked", async () => {
        mockUseInvitePlayer.mockReturnValue({
            mutate: (_payload: unknown, opts: { onError: (err: Error) => void }) => {
                opts.onError(new Error("Network error"));
            },
            isPending: false,
        });
        const bookingAsOrganiser = {
            ...booking,
            players: [
                {
                    id: "p1",
                    full_name: "Alex",
                    role: "organiser",
                    invite_status: "accepted",
                    payment_status: "paid",
                    amount_due: 0,
                },
            ],
        };
        mockSearch = {
            clubId: "club-1",
            role: "organiser",
            inviteStatus: "accepted",
            paymentStatus: "paid",
            amountDue: 0,
        };
        setupMocks({ data: bookingAsOrganiser });
        mockUseInvitePlayer.mockReturnValue({
            mutate: (_payload: unknown, opts: { onError: (err: Error) => void }) => {
                opts.onError(new Error("Network error"));
            },
            isPending: false,
        });

        render(<ManageBookingContainer />);

        await waitFor(() => {
            expect(screen.getByLabelText("Player")).toBeInTheDocument();
        });

        fireEvent.change(screen.getByLabelText("Player"), {
            target: { value: "user-abc" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Invite" }));

        await waitFor(() => {
            expect(screen.getByRole("alert")).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
});
