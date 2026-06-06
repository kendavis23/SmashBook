import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TrainerDetailView from "./TrainerDetailView";
import type { Trainer, TrainerBookingItem } from "../../types";

vi.mock("@repo/ui", () => ({
    Breadcrumb: ({ items }: { items: { label: string; href?: string }[] }) => (
        <nav>
            {items.map((i) => (
                <span key={i.label}>{i.label}</span>
            ))}
        </nav>
    ),
    AlertToast: ({ title, onClose }: { title: string; onClose: () => void }) => (
        <div role="alert">
            {title}
            <button onClick={onClose}>Dismiss</button>
        </div>
    ),
    DatePicker: ({
        value,
        onChange,
        placeholder,
    }: {
        value: string;
        onChange: (value: string) => void;
        placeholder?: string;
    }) => (
        <input
            aria-label={placeholder}
            value={value}
            onChange={(event) => onChange(event.target.value)}
        />
    ),
    SelectInput: ({
        value,
        onValueChange,
        options,
        clearLabel,
        "aria-label": ariaLabel,
    }: {
        value: string;
        onValueChange: (value: string) => void;
        options: { value: string; label: string }[];
        clearLabel?: string;
        "aria-label"?: string;
    }) => (
        <select
            aria-label={ariaLabel}
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
        >
            {clearLabel !== undefined ? <option value="">{clearLabel}</option> : null}
            {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                    {opt.label}
                </option>
            ))}
        </select>
    ),
    ConfirmDeleteModal: ({
        title,
        onConfirm,
        onCancel,
    }: {
        title: string;
        onConfirm: () => void;
        onCancel: () => void;
    }) => (
        <div role="dialog">
            <p>{title}</p>
            <button onClick={onConfirm}>Confirm delete</button>
            <button onClick={onCancel}>Cancel</button>
        </div>
    ),
    formatUTCDate: (v: string) => `date:${v}`,
    formatUTCTime: (v: string) => `time:${v}`,
}));

const mockTrainer: Trainer = {
    id: "trainer-001-abcd",
    club_id: "club-1",
    user_id: "user-1",
    full_name: "Aarav Shah",
    bio: "Expert padel coach",
    is_active: true,
    availability: [],
};

const mockBookings: TrainerBookingItem[] = [
    {
        booking_id: "booking-1",
        club_id: "club-1",
        court_id: "court-1",
        court_name: "Court A",
        booking_type: "lesson_individual",
        start_datetime: "2026-05-01T10:00:00Z",
        end_datetime: "2026-05-01T11:00:00Z",
        status: "confirmed",
        participants: [
            {
                id: "p1",
                user_id: "user-1",
                full_name: "Riya Mehta",
                email: "riya@example.com",
                role: "player",
                invite_status: "accepted",
                payment_status: "paid",
            } as never,
        ],
    },
];

const defaultProps = {
    trainer: mockTrainer,
    availability: [],
    availabilityLoading: false,
    availabilityError: null,
    bookings: [],
    bookingsLoading: false,
    bookingsError: null,
    upcomingOnly: true,
    onUpcomingOnlyChange: vi.fn(),
    canManage: true,
    activeTab: "availability" as const,
    onTabChange: vi.fn(),
    onRefreshAvailability: vi.fn(),
    onRefreshBookings: vi.fn(),
    onCreateAvailability: vi.fn(),
    deletingAvailabilityId: null,
    onDeleteAvailability: vi.fn().mockResolvedValue(undefined),
};

describe("TrainerDetailView — header", () => {
    it("shows trainer full name", () => {
        render(<TrainerDetailView {...defaultProps} />);
        expect(screen.getByText("Aarav Shah")).toBeInTheDocument();
    });

    it("shows Active badge for active trainer", () => {
        render(<TrainerDetailView {...defaultProps} />);
        expect(screen.getByText("Active")).toBeInTheDocument();
    });

    it("shows Inactive badge for inactive trainer", () => {
        render(
            <TrainerDetailView {...defaultProps} trainer={{ ...mockTrainer, is_active: false }} />
        );
        expect(screen.getByText("Inactive")).toBeInTheDocument();
    });

    it("shows bio when present", () => {
        render(<TrainerDetailView {...defaultProps} />);
        expect(screen.getByText("Expert padel coach")).toBeInTheDocument();
    });

    it("shows fallback when bio is null", () => {
        render(<TrainerDetailView {...defaultProps} trainer={{ ...mockTrainer, bio: null }} />);
        expect(screen.getByText("No bio provided.")).toBeInTheDocument();
    });
});

describe("TrainerDetailView — breadcrumb", () => {
    it("renders Trainers and Trainer Detail breadcrumb items", () => {
        render(<TrainerDetailView {...defaultProps} />);
        expect(screen.getByText("Trainers")).toBeInTheDocument();
        expect(screen.getByText("Trainer Detail")).toBeInTheDocument();
    });
});

describe("TrainerDetailView — tab navigation", () => {
    it("renders Availability and Bookings tabs", () => {
        render(<TrainerDetailView {...defaultProps} />);
        const tabs = screen.getAllByRole("button", { name: /Availability/i });
        expect(tabs.length).toBeGreaterThan(0);
        expect(screen.getByRole("button", { name: /Bookings/i })).toBeInTheDocument();
    });

    it("calls onTabChange with 'bookings' when Bookings tab is clicked", () => {
        const handleTabChange = vi.fn();
        render(<TrainerDetailView {...defaultProps} onTabChange={handleTabChange} />);
        fireEvent.click(screen.getByRole("button", { name: /Bookings/i }));
        expect(handleTabChange).toHaveBeenCalledWith("bookings");
    });

    it("calls onTabChange with 'availability' when Availability tab is clicked", () => {
        const handleTabChange = vi.fn();
        render(
            <TrainerDetailView
                {...defaultProps}
                activeTab="bookings"
                onTabChange={handleTabChange}
            />
        );
        fireEvent.click(screen.getByRole("button", { name: /Availability/i }));
        expect(handleTabChange).toHaveBeenCalledWith("availability");
    });
});

describe("TrainerDetailView — availability tab", () => {
    it("shows loading spinner while loading", () => {
        render(<TrainerDetailView {...defaultProps} availabilityLoading={true} />);
        expect(screen.getByText("Loading…")).toBeInTheDocument();
    });

    it("shows error toast when availabilityError is set", () => {
        render(
            <TrainerDetailView
                {...defaultProps}
                availabilityError={new Error("Availability error")}
            />
        );
        expect(screen.getByText("Availability error")).toBeInTheDocument();
    });

    it("calls onRefreshAvailability when error toast dismiss is clicked", () => {
        const handleRefresh = vi.fn();
        render(
            <TrainerDetailView
                {...defaultProps}
                availabilityError={new Error("err")}
                onRefreshAvailability={handleRefresh}
            />
        );
        fireEvent.click(screen.getByText("Dismiss"));
        expect(handleRefresh).toHaveBeenCalled();
    });

    it("renders the week navigator for the availability calendar", () => {
        render(<TrainerDetailView {...defaultProps} />);
        expect(screen.getByRole("button", { name: "Previous week" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Next week" })).toBeInTheDocument();
    });

    it("shows Refresh button for availability", () => {
        render(<TrainerDetailView {...defaultProps} />);
        expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
    });

    it("calls onRefreshAvailability when Refresh is clicked", () => {
        const handleRefresh = vi.fn();
        render(<TrainerDetailView {...defaultProps} onRefreshAvailability={handleRefresh} />);
        fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
        expect(handleRefresh).toHaveBeenCalled();
    });

    it("shows Add Slot button for managers and calls onCreateAvailability", () => {
        const handleCreate = vi.fn();
        render(<TrainerDetailView {...defaultProps} onCreateAvailability={handleCreate} />);
        fireEvent.click(screen.getByRole("button", { name: "Create availability" }));
        expect(handleCreate).toHaveBeenCalled();
    });

    it("hides Add Slot button for non-managers", () => {
        render(<TrainerDetailView {...defaultProps} canManage={false} />);
        expect(
            screen.queryByRole("button", { name: "Create availability" })
        ).not.toBeInTheDocument();
    });
});

describe("TrainerDetailView — bookings tab", () => {
    const bookingsProps = { ...defaultProps, activeTab: "bookings" as const };

    it("shows loading spinner while loading", () => {
        render(<TrainerDetailView {...bookingsProps} bookingsLoading={true} />);
        expect(screen.getByText("Loading bookings…")).toBeInTheDocument();
    });

    it("shows error toast when bookingsError is set", () => {
        render(
            <TrainerDetailView {...bookingsProps} bookingsError={new Error("Bookings error")} />
        );
        expect(screen.getByText("Bookings error")).toBeInTheDocument();
    });

    it("calls onRefreshBookings when error toast dismiss is clicked", () => {
        const handleRefresh = vi.fn();
        render(
            <TrainerDetailView
                {...bookingsProps}
                bookingsError={new Error("err")}
                onRefreshBookings={handleRefresh}
            />
        );
        fireEvent.click(screen.getByText("Dismiss"));
        expect(handleRefresh).toHaveBeenCalled();
    });

    it("shows empty state when no bookings", () => {
        render(<TrainerDetailView {...bookingsProps} bookings={[]} />);
        expect(screen.getByText("No bookings found")).toBeInTheDocument();
    });

    it("renders booking row with court name and type", () => {
        render(<TrainerDetailView {...bookingsProps} bookings={mockBookings} />);
        expect(screen.getByText("Court A")).toBeInTheDocument();
        expect(screen.getByText("Individual Lesson")).toBeInTheDocument();
    });

    it("renders booking status badge", () => {
        render(<TrainerDetailView {...bookingsProps} bookings={mockBookings} />);
        expect(screen.getAllByText("Confirmed").length).toBeGreaterThan(0);
    });

    it("renders participant count", () => {
        render(<TrainerDetailView {...bookingsProps} bookings={mockBookings} />);
        expect(screen.getByText("1")).toBeInTheDocument();
    });

    it("shows Refresh button for bookings", () => {
        render(<TrainerDetailView {...bookingsProps} />);
        expect(screen.getByRole("button", { name: "Refresh bookings" })).toBeInTheDocument();
    });

    it("calls onRefreshBookings when Refresh is clicked", () => {
        const handleRefresh = vi.fn();
        render(<TrainerDetailView {...bookingsProps} onRefreshBookings={handleRefresh} />);
        fireEvent.click(screen.getByRole("button", { name: "Refresh bookings" }));
        expect(handleRefresh).toHaveBeenCalled();
    });

    it("renders table column headers", () => {
        render(<TrainerDetailView {...bookingsProps} bookings={mockBookings} />);
        expect(screen.getByText("Court")).toBeInTheDocument();
        expect(screen.getByText("Type")).toBeInTheDocument();
        expect(screen.getAllByText("Date").length).toBeGreaterThan(0);
        expect(screen.getByText("Time")).toBeInTheDocument();
        expect(screen.getByText("Players")).toBeInTheDocument();
        expect(screen.getAllByText("Status").length).toBeGreaterThan(0);
        expect(screen.getByText("Action")).toBeInTheDocument();
    });

    it("filters bookings by date and status when Search is clicked", () => {
        const baseBooking = mockBookings[0]!;
        const bookings: TrainerBookingItem[] = [
            ...mockBookings,
            {
                ...baseBooking,
                booking_id: "booking-2",
                court_name: "Court B",
                start_datetime: "2026-05-02T10:00:00Z",
                end_datetime: "2026-05-02T11:00:00Z",
                status: "pending",
            },
        ];

        render(<TrainerDetailView {...bookingsProps} bookings={bookings} />);
        fireEvent.change(screen.getByLabelText("Booking date"), {
            target: { value: "2026-05-02" },
        });
        fireEvent.change(screen.getByLabelText("Booking status"), {
            target: { value: "pending" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Search bookings" }));

        expect(screen.getByText("Court B")).toBeInTheDocument();
        expect(screen.queryByText("Court A")).not.toBeInTheDocument();
    });

    it("defaults the scope dropdown to upcoming only", () => {
        render(<TrainerDetailView {...bookingsProps} bookings={mockBookings} />);
        expect(screen.getByLabelText("Booking scope")).toHaveValue("upcoming");
    });

    it("commits the scope to onUpcomingOnlyChange when Search is clicked", () => {
        const handleScopeChange = vi.fn();
        render(
            <TrainerDetailView
                {...bookingsProps}
                bookings={mockBookings}
                onUpcomingOnlyChange={handleScopeChange}
            />
        );
        fireEvent.change(screen.getByLabelText("Booking scope"), {
            target: { value: "all" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Search bookings" }));
        expect(handleScopeChange).toHaveBeenCalledWith(false);
    });

    it("shows empty search state when filters match no bookings", () => {
        render(<TrainerDetailView {...bookingsProps} bookings={mockBookings} />);
        fireEvent.change(screen.getByLabelText("Booking date"), {
            target: { value: "2026-06-01" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Search bookings" }));
        expect(screen.getByText("No bookings match your search")).toBeInTheDocument();
    });

    it("paginates bookings", () => {
        const baseBooking = mockBookings[0]!;
        const bookings: TrainerBookingItem[] = Array.from({ length: 11 }, (_, index) => ({
            ...baseBooking,
            booking_id: `booking-${index + 1}`,
            court_name: `Court ${index + 1}`,
        }));

        render(<TrainerDetailView {...bookingsProps} bookings={bookings} />);
        expect(screen.getByText("Court 1")).toBeInTheDocument();
        expect(screen.queryByText("Court 11")).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Next bookings page" }));

        expect(screen.getByText("Court 11")).toBeInTheDocument();
        expect(screen.queryByText("Court 1")).not.toBeInTheDocument();
    });

    it("opens booking detail modal from the action button", () => {
        render(<TrainerDetailView {...bookingsProps} bookings={mockBookings} />);
        fireEvent.click(screen.getByRole("button", { name: "View booking Court A" }));
        expect(screen.getByRole("dialog", { name: "Booking details" })).toBeInTheDocument();
        expect(screen.getByText("Participant details")).toBeInTheDocument();
        expect(screen.getByText("Riya Mehta")).toBeInTheDocument();
    });
});
