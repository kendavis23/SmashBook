import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TrainerDetailView from "./TrainerDetailView";
import type { Trainer, TrainerAvailability, TrainerBookingItem } from "../../types";

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
    formatUTCDate: (v: string) => `date:${v}`,
    formatUTCTime: (v: string) => `time:${v}`,
}));

const mockTrainer: Trainer = {
    id: "trainer-001-abcd",
    club_id: "club-1",
    user_id: "user-1",
    bio: "Expert padel coach",
    is_active: true,
    availability: [],
};

const mockAvailability: TrainerAvailability[] = [
    {
        id: "avail-1",
        staff_profile_id: "trainer-001-abcd",
        day_of_week: 1,
        start_time: "09:00",
        end_time: "12:00",
        set_by_user_id: "user-1",
        effective_from: "2026-01-01",
        effective_until: "2026-12-31",
        notes: "Morning slots only",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
    },
];

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
        participants: [{ id: "p1" } as never],
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
    canManage: true,
    activeTab: "availability" as const,
    onTabChange: vi.fn(),
    onRefreshAvailability: vi.fn(),
    onRefreshBookings: vi.fn(),
};

describe("TrainerDetailView — header", () => {
    it("shows trainer ID (first 8 chars)", () => {
        render(<TrainerDetailView {...defaultProps} />);
        expect(screen.getByText("Trainer #trainer-")).toBeInTheDocument();
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
        expect(screen.getByText("Loading availability…")).toBeInTheDocument();
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

    it("shows empty state when no availability", () => {
        render(<TrainerDetailView {...defaultProps} availability={[]} />);
        expect(screen.getByText("No availability set")).toBeInTheDocument();
    });

    it("renders availability row for each slot", () => {
        render(<TrainerDetailView {...defaultProps} availability={mockAvailability} />);
        expect(screen.getByText("Tuesday")).toBeInTheDocument();
        expect(screen.getByText("09:00 – 12:00")).toBeInTheDocument();
    });

    it("shows Refresh button for availability", () => {
        render(<TrainerDetailView {...defaultProps} />);
        expect(screen.getByRole("button", { name: "Refresh availability" })).toBeInTheDocument();
    });

    it("calls onRefreshAvailability when Refresh is clicked", () => {
        const handleRefresh = vi.fn();
        render(<TrainerDetailView {...defaultProps} onRefreshAvailability={handleRefresh} />);
        fireEvent.click(screen.getByRole("button", { name: "Refresh availability" }));
        expect(handleRefresh).toHaveBeenCalled();
    });

    it("expands availability row on click to show details", () => {
        render(<TrainerDetailView {...defaultProps} availability={mockAvailability} />);
        const row = screen.getByRole("button", { expanded: false });
        fireEvent.click(row);
        expect(screen.getByText("Morning slots only")).toBeInTheDocument();
        expect(screen.getByText(/Effective from:/)).toBeInTheDocument();
    });

    it("shows effective_until when set", () => {
        render(<TrainerDetailView {...defaultProps} availability={mockAvailability} />);
        fireEvent.click(screen.getByRole("button", { expanded: false }));
        expect(screen.getByText(/Effective until:/)).toBeInTheDocument();
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
        expect(screen.getByText("Confirmed")).toBeInTheDocument();
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
        expect(screen.getByText("Date")).toBeInTheDocument();
        expect(screen.getByText("Time")).toBeInTheDocument();
        expect(screen.getByText("Players")).toBeInTheDocument();
        expect(screen.getByText("Status")).toBeInTheDocument();
    });
});
