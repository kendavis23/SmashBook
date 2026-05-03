import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import BookingsView from "./BookingsView";
import type { PlayerBookingItem } from "../../types";

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
    Breadcrumb: ({ items }: { items: { label: string }[] }) => (
        <nav>
            {items.map((i) => (
                <span key={i.label}>{i.label}</span>
            ))}
        </nav>
    ),
    AlertToast: ({ title }: { title: string }) => <div role="alert">{title}</div>,
    DatePicker: ({
        value,
        onChange,
        className,
    }: {
        value: string;
        onChange: (v: string) => void;
        className?: string;
    }) => (
        <input
            type="date"
            className={className}
            value={value}
            onChange={(e) => onChange(e.target.value)}
        />
    ),
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
    pastFrom: "2026-02-03",
    pastTo: "2026-05-03",
    onTabChange: vi.fn(),
    onRefresh: vi.fn(),
    onCreateClick: vi.fn(),
    onManageClick: vi.fn(),
    onInvitePlayer: vi.fn().mockResolvedValue(undefined),
    onRespondInvite: vi.fn().mockResolvedValue(undefined),
    onPastFilterChange: vi.fn(),
    onPastFilterApply: vi.fn(),
    onPastFilterClear: vi.fn(),
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
        expect(screen.getByText("Accepted")).toBeInTheDocument();
    });
});

describe("BookingsView — header", () => {
    it("renders Refresh button and calls onRefresh", () => {
        const onRefresh = vi.fn();
        render(<BookingsView {...defaultProps} onRefresh={onRefresh} />);
        fireEvent.click(screen.getByRole("button", { name: /refresh bookings/i }));
        expect(onRefresh).toHaveBeenCalledOnce();
    });

    it("does not render a New Booking button in the bookings header", () => {
        const onCreateClick = vi.fn();
        render(<BookingsView {...defaultProps} onCreateClick={onCreateClick} />);
        expect(screen.queryByRole("button", { name: /new booking/i })).not.toBeInTheDocument();
        expect(onCreateClick).not.toHaveBeenCalled();
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

describe("BookingsView — past filter bar", () => {
    it("does not render filter bar on upcoming tab", () => {
        render(<BookingsView {...defaultProps} activeTab="upcoming" />);
        expect(screen.queryByText("From")).not.toBeInTheDocument();
        expect(screen.queryByText("To")).not.toBeInTheDocument();
    });

    it("renders From and To labels on past tab", () => {
        render(<BookingsView {...defaultProps} activeTab="past" />);
        expect(screen.getByText("From")).toBeInTheDocument();
        expect(screen.getByText("To")).toBeInTheDocument();
    });

    it("Apply button is enabled when pastFrom is set", () => {
        render(<BookingsView {...defaultProps} activeTab="past" pastFrom="2026-04-01" pastTo="" />);
        expect(screen.getByRole("button", { name: /apply/i })).not.toBeDisabled();
    });

    it("Apply button is disabled when both dates are empty", () => {
        render(<BookingsView {...defaultProps} activeTab="past" pastFrom="" pastTo="" />);
        expect(screen.getByRole("button", { name: /apply/i })).toBeDisabled();
    });

    it("calls onPastFilterChange with pastFrom when From input changes", () => {
        const onPastFilterChange = vi.fn();
        const { container } = render(
            <BookingsView
                {...defaultProps}
                activeTab="past"
                onPastFilterChange={onPastFilterChange}
            />
        );
        const fromInput = container.querySelectorAll<HTMLInputElement>("input[type='date']")[0]!;
        fireEvent.change(fromInput, { target: { value: "2026-04-01" } });
        expect(onPastFilterChange).toHaveBeenCalledWith({ pastFrom: "2026-04-01" });
    });

    it("calls onPastFilterChange with pastTo when To input changes", () => {
        const onPastFilterChange = vi.fn();
        const { container } = render(
            <BookingsView
                {...defaultProps}
                activeTab="past"
                onPastFilterChange={onPastFilterChange}
            />
        );
        const toInput = container.querySelectorAll<HTMLInputElement>("input[type='date']")[1]!;
        fireEvent.change(toInput, { target: { value: "2026-04-30" } });
        expect(onPastFilterChange).toHaveBeenCalledWith({ pastTo: "2026-04-30" });
    });

    it("calls onPastFilterApply when Apply clicked", () => {
        const onPastFilterApply = vi.fn();
        render(
            <BookingsView
                {...defaultProps}
                activeTab="past"
                pastFrom="2026-04-01"
                pastTo=""
                onPastFilterApply={onPastFilterApply}
            />
        );
        fireEvent.click(screen.getByRole("button", { name: /apply/i }));
        expect(onPastFilterApply).toHaveBeenCalledOnce();
    });

    it("shows Clear button when a date is set and calls onPastFilterClear", () => {
        const onPastFilterClear = vi.fn();
        render(
            <BookingsView
                {...defaultProps}
                activeTab="past"
                pastFrom="2026-04-01"
                pastTo=""
                onPastFilterClear={onPastFilterClear}
            />
        );
        fireEvent.click(screen.getByRole("button", { name: /clear/i }));
        expect(onPastFilterClear).toHaveBeenCalledOnce();
    });

    it("does not show Clear button when both dates are empty", () => {
        render(<BookingsView {...defaultProps} activeTab="past" pastFrom="" pastTo="" />);
        expect(screen.queryByRole("button", { name: /clear/i })).not.toBeInTheDocument();
    });
});
