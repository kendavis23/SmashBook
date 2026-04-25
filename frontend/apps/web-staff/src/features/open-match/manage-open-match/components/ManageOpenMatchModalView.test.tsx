import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Booking } from "../../types";
import { ManageOpenMatchModalView } from "./ManageOpenMatchModalView";

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
    formatUTCDateTime: (iso: string) => `dt:${iso}`,
    formatUTCDate: (iso: string) => `date:${iso}`,
    formatUTCTime: (iso: string) => `time:${iso}`,
    formatCurrency: (amount: number | null | undefined) =>
        amount == null ? "—" : `£${amount.toFixed(2)}`,
}));

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
    notes: "Test notes",
    event_name: null,
    players: [
        {
            id: "player-1",
            booking_id: "booking-1",
            user_id: "user-1",
            full_name: "Alice",
            role: "organiser",
            invite_status: "accepted",
            payment_status: "paid",
            amount_due: 25,
        },
    ],
    created_at: "2026-04-10T09:00:00Z",
};

function renderView(overrides: Partial<Parameters<typeof ManageOpenMatchModalView>[0]> = {}) {
    return render(
        <ManageOpenMatchModalView
            booking={mockBooking}
            apiError=""
            isInviting={false}
            onInvitePlayer={vi.fn()}
            onDismissError={vi.fn()}
            onClose={vi.fn()}
            {...overrides}
        />
    );
}

describe("ManageOpenMatchModalView", () => {
    it("renders court name and status badge in header", () => {
        renderView();
        expect(screen.getByRole("heading", { name: "Court A" })).toBeInTheDocument();
        expect(screen.getByText("Confirmed")).toBeInTheDocument();
    });

    it("renders formatted datetime range in header subtitle", () => {
        renderView();
        expect(screen.getByText(/dt:2026-04-11T10:00:00Z/)).toBeInTheDocument();
    });

    it("renders StatPill context pills", () => {
        renderView();
        // StatPill labels
        expect(screen.getByText("Court")).toBeInTheDocument();
        expect(screen.getByText("Date")).toBeInTheDocument();
        expect(screen.getByText("Start")).toBeInTheDocument();
        expect(screen.getByText("End")).toBeInTheDocument();
        // StatPill values (may appear multiple times — use getAllByText)
        expect(screen.getAllByText("Court A").length).toBeGreaterThan(0);
        expect(screen.getByText("date:2026-04-11T10:00:00Z")).toBeInTheDocument();
        expect(screen.getByText("time:2026-04-11T11:30:00Z")).toBeInTheDocument();
    });

    it("renders all read-only game detail fields", () => {
        renderView();
        expect(screen.getByText("Slots Available")).toBeInTheDocument();
        // "2" appears multiple times (slots_available, min_skill_level) — use getAllByText
        expect(screen.getAllByText("2").length).toBeGreaterThan(0);
        expect(screen.getByText("Max Players")).toBeInTheDocument();
        expect(screen.getByText("4")).toBeInTheDocument();
        expect(screen.getByText("Min Skill Level")).toBeInTheDocument();
        expect(screen.getByText("Max Skill Level")).toBeInTheDocument();
        expect(screen.getByText("Total Price")).toBeInTheDocument();
        expect(screen.getByText("£50.00")).toBeInTheDocument();
        expect(screen.getByText("Booking Type")).toBeInTheDocument();
        expect(screen.getByText("regular")).toBeInTheDocument();
    });

    it("renders notes section when present", () => {
        renderView();
        expect(screen.getByText("Test notes")).toBeInTheDocument();
    });

    it("does not render notes section when notes is null", () => {
        renderView({ booking: { ...mockBooking, notes: null } });
        expect(screen.queryByText("Notes")).not.toBeInTheDocument();
    });

    it("renders players collapsible toggle when players exist", () => {
        renderView();
        expect(screen.getByText("Players (1)")).toBeInTheDocument();
    });

    it("calls onInvitePlayer with the entered player id", () => {
        const onInvitePlayer = vi.fn();
        renderView({ onInvitePlayer });

        fireEvent.change(screen.getByLabelText("Player ID"), {
            target: { value: "user-123" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Invite" }));

        expect(onInvitePlayer).toHaveBeenCalledWith("user-123");
    });

    it("shows invite loading state", () => {
        renderView({ isInviting: true });
        expect(screen.getByRole("button", { name: "Inviting…" })).toBeDisabled();
        expect(screen.getByLabelText("Player ID")).toBeDisabled();
    });

    it("expands players table when toggle is clicked", () => {
        renderView();
        const toggle = screen.getByRole("button", { name: "Players (1)" });
        fireEvent.click(toggle);
        expect(screen.getByText("Alice")).toBeInTheDocument();
        expect(screen.getByText("organiser")).toBeInTheDocument();
        expect(screen.getByText("paid")).toBeInTheDocument();
        expect(screen.getByText("£25.00")).toBeInTheDocument();
    });

    it("does not render players section when players list is empty", () => {
        renderView({ booking: { ...mockBooking, players: [] } });
        expect(screen.queryByText(/Players \(/)).not.toBeInTheDocument();
    });

    it("renders api error alert and calls onDismissError on dismiss", () => {
        const onDismissError = vi.fn();
        renderView({ apiError: "Something went wrong", onDismissError });
        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(screen.getByText("Something went wrong")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
        expect(onDismissError).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when Close button is clicked", () => {
        const onClose = vi.fn();
        renderView({ onClose });
        fireEvent.click(screen.getByRole("button", { name: "Close" }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when X button is clicked", () => {
        const onClose = vi.fn();
        renderView({ onClose });
        fireEvent.click(screen.getByRole("button", { name: "Close modal" }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("renders dash for null max_players", () => {
        renderView({ booking: { ...mockBooking, max_players: null } });
        expect(screen.getAllByText("—").length).toBeGreaterThan(0);
    });
});
