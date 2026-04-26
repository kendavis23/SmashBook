import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import BookingsView from "./BookingsView";
import type { PlayerBookingItem } from "../../types";

vi.mock("@repo/ui", () => ({
    Breadcrumb: ({ items }: { items: { label: string }[] }) => (
        <nav>
            {items.map((i) => (
                <span key={i.label}>{i.label}</span>
            ))}
        </nav>
    ),
    AlertToast: ({ title }: { title: string }) => <div role="alert">{title}</div>,
    formatUTCDate: (v: string) => v,
    formatUTCTime: (v: string) => v,
    formatCurrency: (v: number) => `£${v.toFixed(2)}`,
}));

const makeBooking = (overrides: Partial<PlayerBookingItem> = {}): PlayerBookingItem => ({
    booking_id: "b1",
    club_id: "c1",
    court_id: "ct1",
    court_name: "Court Alpha",
    booking_type: "regular",
    status: "confirmed",
    start_datetime: "2026-05-01T10:00:00Z",
    end_datetime: "2026-05-01T11:00:00Z",
    role: "organiser",
    invite_status: "accepted",
    payment_status: "paid",
    amount_due: 50,
    ...overrides,
});

const defaultProps = {
    upcoming: [],
    past: [],
    activeTab: "upcoming" as const,
    isLoading: false,
    error: null,
    onTabChange: vi.fn(),
    onRefresh: vi.fn(),
    onManageClick: vi.fn(),
    onInvitePlayer: vi.fn().mockResolvedValue(undefined),
    onRespondInvite: vi.fn().mockResolvedValue(undefined),
};

describe("BookingsView — loading state", () => {
    it("shows loading spinner", () => {
        render(<BookingsView {...defaultProps} isLoading />);
        expect(screen.getByText("Loading bookings…")).toBeInTheDocument();
    });
});

describe("BookingsView — error state", () => {
    it("renders error alert", () => {
        const error = new Error("Network failure");
        render(<BookingsView {...defaultProps} error={error} />);
        expect(screen.getByRole("alert")).toHaveTextContent("Network failure");
    });
});

describe("BookingsView — empty state", () => {
    it("shows empty message for upcoming tab", () => {
        render(<BookingsView {...defaultProps} />);
        expect(screen.getByText("No upcoming bookings.")).toBeInTheDocument();
    });

    it("shows empty message for past tab", () => {
        render(<BookingsView {...defaultProps} activeTab="past" />);
        expect(screen.getByText("No past bookings.")).toBeInTheDocument();
    });
});

describe("BookingsView — data state", () => {
    it("renders booking row with court name", () => {
        const upcoming = [makeBooking({ court_name: "Court Alpha" })];
        render(<BookingsView {...defaultProps} upcoming={upcoming} />);
        expect(screen.getByText("Court Alpha")).toBeInTheDocument();
    });

    it("renders formatted amount", () => {
        const upcoming = [makeBooking({ amount_due: 50 })];
        render(<BookingsView {...defaultProps} upcoming={upcoming} />);
        expect(screen.getByText("£50.00")).toBeInTheDocument();
    });

    it("renders status badge", () => {
        const upcoming = [makeBooking({ status: "confirmed" })];
        render(<BookingsView {...defaultProps} upcoming={upcoming} />);
        expect(screen.getByText("confirmed")).toBeInTheDocument();
    });

    it("shows View button for upcoming bookings and calls onManageClick", () => {
        const onManageClick = vi.fn();
        const upcoming = [makeBooking()];
        render(
            <BookingsView {...defaultProps} upcoming={upcoming} onManageClick={onManageClick} />
        );
        fireEvent.click(screen.getByRole("button", { name: /view booking on court alpha/i }));
        expect(onManageClick).toHaveBeenCalledWith(expect.objectContaining({ booking_id: "b1" }));
    });

    it("does not show View button for past bookings", () => {
        const past = [makeBooking()];
        render(<BookingsView {...defaultProps} activeTab="past" past={past} />);
        expect(screen.queryByRole("button", { name: /view booking/i })).not.toBeInTheDocument();
    });

    it("shows invite status text instead of Invite button for past bookings", () => {
        const past = [makeBooking({ role: "organiser", invite_status: "accepted" })];
        render(<BookingsView {...defaultProps} activeTab="past" past={past} />);
        expect(screen.queryByRole("button", { name: /invite a player/i })).not.toBeInTheDocument();
        expect(screen.getByText("accepted")).toBeInTheDocument();
    });
});

describe("BookingsView — header", () => {
    it("renders Refresh button and calls onRefresh", () => {
        const onRefresh = vi.fn();
        render(<BookingsView {...defaultProps} onRefresh={onRefresh} />);
        fireEvent.click(screen.getByRole("button", { name: /refresh bookings/i }));
        expect(onRefresh).toHaveBeenCalledOnce();
    });

    it("shows total count badge when bookings exist", () => {
        const upcoming = [makeBooking()];
        render(<BookingsView {...defaultProps} upcoming={upcoming} />);
        expect(screen.getByText("1 total")).toBeInTheDocument();
    });
});

describe("BookingsView — tabs", () => {
    it("calls onTabChange when Past tab clicked", () => {
        const onTabChange = vi.fn();
        render(<BookingsView {...defaultProps} onTabChange={onTabChange} />);
        fireEvent.click(screen.getByRole("button", { name: /past/i }));
        expect(onTabChange).toHaveBeenCalledWith("past");
    });

    it("calls onTabChange when Upcoming tab clicked", () => {
        const onTabChange = vi.fn();
        render(<BookingsView {...defaultProps} activeTab="past" onTabChange={onTabChange} />);
        fireEvent.click(screen.getByRole("button", { name: /upcoming/i }));
        expect(onTabChange).toHaveBeenCalledWith("upcoming");
    });

    it("shows upcoming count badge when upcoming > 0", () => {
        const upcoming = [makeBooking(), makeBooking({ booking_id: "b2" })];
        render(<BookingsView {...defaultProps} upcoming={upcoming} />);
        expect(screen.getByText("2")).toBeInTheDocument();
    });
});
