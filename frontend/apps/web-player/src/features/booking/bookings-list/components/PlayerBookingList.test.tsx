import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PlayerBookingList from "./PlayerBookingList";
import type { PlayerBookingItem } from "../../types";

vi.mock("../../components/PlayerAutocomplete", () => ({
    PlayerAutocomplete: ({
        label,
        value,
        onChange,
        onSelect,
        disabled,
    }: {
        label: string;
        value: string;
        onChange: (value: string) => void;
        onSelect: (player: { id: string; full_name: string }) => void;
        disabled?: boolean;
    }) => (
        <input
            aria-label={label}
            value={value}
            disabled={disabled}
            onChange={(event) => {
                onChange(event.target.value);
                if (event.target.value) {
                    onSelect({ id: event.target.value, full_name: event.target.value });
                }
            }}
        />
    ),
}));

vi.mock("@repo/ui", () => ({
    AlertToast: ({ title }: { title: string }) => <div role="alert">{title}</div>,
    formatUTCDate: (value: string) => value.slice(0, 10),
    formatUTCTime: (value: string) => value.slice(11, 16),
    formatCurrency: (value: number) => `£${value.toFixed(2)}`,
}));

const makeBooking = (overrides: Partial<PlayerBookingItem> = {}): PlayerBookingItem => ({
    booking_id: "booking-1",
    club_id: "club-1",
    club_name: "Club One",
    court_id: "court-1",
    court_name: "Court Alpha",
    booking_type: "regular",
    status: "confirmed",
    start_datetime: "2026-05-01T10:00:00Z",
    end_datetime: "2026-05-01T11:00:00Z",
    role: "player",
    invite_status: "accepted",
    payment_status: "paid",
    amount_due: 50,
    ...overrides,
});

const defaultProps = {
    items: [makeBooking()],
    emptyMessage: "No bookings found.",
    showActions: true,
    onManageClick: vi.fn(),
    onPayClick: vi.fn(),
    onInvitePlayer: vi.fn().mockResolvedValue(undefined),
    onRespondInvite: vi.fn().mockResolvedValue(undefined),
};

function firstElement<T>(items: T[]): T {
    const item = items[0];
    if (!item) {
        throw new Error("Expected at least one matching element");
    }
    return item;
}

describe("PlayerBookingList", () => {
    it("renders the configured empty state", () => {
        render(<PlayerBookingList {...defaultProps} items={[]} />);

        expect(screen.getByText("No bookings found.")).toBeInTheDocument();
        expect(screen.getByText("Your bookings will appear here once made.")).toBeInTheDocument();
    });

    it("renders booking details and calls manage from the View action", () => {
        const onManageClick = vi.fn();
        const booking = makeBooking({ court_name: "Court Bravo" });
        render(
            <PlayerBookingList {...defaultProps} items={[booking]} onManageClick={onManageClick} />
        );

        expect(screen.getAllByText("Court Bravo")).not.toHaveLength(0);
        expect(screen.getAllByText("£50.00")).not.toHaveLength(0);

        fireEvent.click(
            firstElement(screen.getAllByRole("button", { name: /view booking on court bravo/i }))
        );
        expect(onManageClick).toHaveBeenCalledWith(booking);
    });

    it("shows Pay only for unpaid accepted bookings and calls the pay handler", () => {
        const onPayClick = vi.fn();
        const booking = makeBooking({
            payment_status: "pending",
            invite_status: "accepted",
        });
        render(<PlayerBookingList {...defaultProps} items={[booking]} onPayClick={onPayClick} />);

        fireEvent.click(firstElement(screen.getAllByRole("button", { name: /pay/i })));
        expect(onPayClick).toHaveBeenCalledWith(booking);
    });

    it("does not render action buttons when actions are disabled", () => {
        render(<PlayerBookingList {...defaultProps} showActions={false} />);

        expect(screen.queryByRole("button", { name: /view booking/i })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /pay/i })).not.toBeInTheDocument();
    });

    it("submits invite requests for organisers with pending bookings", async () => {
        const onInvitePlayer = vi.fn().mockResolvedValue(undefined);
        const booking = makeBooking({
            role: "organiser",
            status: "pending",
            invite_status: "declined",
        });
        render(
            <PlayerBookingList
                {...defaultProps}
                items={[booking]}
                onInvitePlayer={onInvitePlayer}
            />
        );

        fireEvent.click(firstElement(screen.getAllByTitle("Invite player")));
        fireEvent.change(screen.getByLabelText("Search player"), {
            target: { value: "player-2" },
        });
        fireEvent.click(screen.getByRole("button", { name: /send invitation/i }));

        await waitFor(() => expect(onInvitePlayer).toHaveBeenCalledWith(booking, "player-2"));
        expect(await screen.findByRole("alert")).toHaveTextContent("Invitation sent!");
    });

    it("submits invite responses for pending invited players", async () => {
        const onRespondInvite = vi.fn().mockResolvedValue(undefined);
        const booking = makeBooking({
            role: "player",
            invite_status: "pending",
        });
        render(
            <PlayerBookingList
                {...defaultProps}
                items={[booking]}
                onRespondInvite={onRespondInvite}
            />
        );

        fireEvent.click(firstElement(screen.getAllByTitle("Accept invite")));

        await waitFor(() => expect(onRespondInvite).toHaveBeenCalledWith(booking, "accepted"));
        expect(await screen.findByRole("alert")).toHaveTextContent("Invite accepted!");
    });

    it("paginates bookings and resets to the first page when items change", () => {
        const firstItems = Array.from({ length: 11 }, (_, index) =>
            makeBooking({
                booking_id: `booking-${index + 1}`,
                court_name: `Court ${index + 1}`,
            })
        );
        const { rerender } = render(<PlayerBookingList {...defaultProps} items={firstItems} />);

        expect(screen.getByText("Showing 1–10 of 11")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: /next page/i }));
        expect(screen.getByText("Showing 11–11 of 11")).toBeInTheDocument();

        rerender(<PlayerBookingList {...defaultProps} items={[makeBooking()]} />);
        expect(screen.queryByText("Showing 11–11 of 11")).not.toBeInTheDocument();
        expect(screen.getAllByText("Court Alpha")).not.toHaveLength(0);
    });
});
