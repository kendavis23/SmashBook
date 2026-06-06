import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TrainersView from "./TrainersView";
import type { Trainer, TrainerBookingItem } from "../../types";

vi.mock("@repo/ui", () => ({
    Breadcrumb: ({ items }: { items: { label: string }[] }) => (
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
    Pagination: ({
        page,
        totalPages,
        totalItems,
        pageSize,
        onPageChange,
    }: {
        page: number;
        totalPages: number;
        totalItems: number;
        pageSize: number;
        onPageChange: (page: number) => void;
    }) =>
        totalPages > 1 ? (
            <nav aria-label="pagination">
                <span>
                    {page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalItems)} of{" "}
                    {totalItems}
                </span>
                <button onClick={() => onPageChange(page - 1)} disabled={page === 0}>
                    Previous page
                </button>
                {Array.from({ length: totalPages }, (_, index) => (
                    <button key={index} onClick={() => onPageChange(index)}>
                        Page {index + 1}
                    </button>
                ))}
                <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages - 1}>
                    Next page
                </button>
            </nav>
        ) : null,
    formatUTCDateTime: (value: string) => value,
}));

const mockTrainers: Trainer[] = [
    {
        id: "trainer-001-abcd",
        club_id: "club-1",
        user_id: "user-1",
        full_name: "Aarav Shah",
        bio: "Expert padel coach",
        is_active: true,
        availability: [{ id: "avail-1" } as never, { id: "avail-2" } as never],
    },
    {
        id: "trainer-002-efgh",
        club_id: "club-1",
        user_id: "user-2",
        full_name: "Mira Kapoor",
        bio: null,
        is_active: false,
        availability: [],
    },
];

const [aaravTrainer, miraTrainer] = mockTrainers as [Trainer, Trainer];

function makeTrainer(index: number): Trainer {
    return {
        id: `trainer-${index}`,
        club_id: "club-1",
        user_id: `user-${index}`,
        full_name: `Trainer ${String(index).padStart(2, "0")}`,
        bio: null,
        is_active: true,
        availability: [],
    };
}

function makeBooking(overrides: Partial<TrainerBookingItem> = {}): TrainerBookingItem {
    const start = new Date(Date.now() + 24 * 60 * 60 * 1000); // +1 day
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    return {
        booking_id: "booking-1",
        club_id: "club-1",
        court_id: "court-1",
        court_name: "Court 1",
        booking_type: "lesson_individual",
        status: "confirmed",
        start_datetime: start.toISOString(),
        end_datetime: end.toISOString(),
        participants: [],
        ...overrides,
    };
}

const defaultProps = {
    trainers: [],
    isLoading: false,
    error: null,
    canManage: true,
    selectedTrainer: null,
    bookings: [],
    bookingsLoading: false,
    bookingsError: null,
    onRefresh: vi.fn(),
    onRefreshBookings: vi.fn(),
    onSelectTrainer: vi.fn(),
    onViewTrainer: vi.fn(),
};

describe("TrainersView — loading state", () => {
    it("shows loading spinner", () => {
        render(<TrainersView {...defaultProps} isLoading={true} />);
        expect(screen.getByText("Loading trainers…")).toBeInTheDocument();
    });
});

describe("TrainersView — error state", () => {
    it("shows error message via AlertToast", () => {
        render(<TrainersView {...defaultProps} error={new Error("Network error")} />);
        expect(screen.getByText("Network error")).toBeInTheDocument();
    });

    it("calls onRefresh when error toast dismiss is clicked", () => {
        const handleRefresh = vi.fn();
        render(
            <TrainersView {...defaultProps} error={new Error("Oops")} onRefresh={handleRefresh} />
        );
        fireEvent.click(screen.getByText("Dismiss"));
        expect(handleRefresh).toHaveBeenCalled();
    });
});

describe("TrainersView — empty state", () => {
    it("shows empty state message", () => {
        render(<TrainersView {...defaultProps} />);
        expect(screen.getByText("No trainers found")).toBeInTheDocument();
    });

    it("shows management hint for canManage=true", () => {
        render(<TrainersView {...defaultProps} canManage={true} />);
        expect(screen.getByText("Trainers are added via staff management.")).toBeInTheDocument();
    });

    it("shows non-admin message for canManage=false", () => {
        render(<TrainersView {...defaultProps} canManage={false} />);
        expect(
            screen.getByText("No trainers are currently assigned to this club.")
        ).toBeInTheDocument();
    });
});

describe("TrainersView — header", () => {
    it("renders Trainers heading", () => {
        render(<TrainersView {...defaultProps} />);
        expect(screen.getByRole("heading", { name: "Trainers" })).toBeInTheDocument();
    });

    it("shows Refresh button", () => {
        render(<TrainersView {...defaultProps} />);
        expect(screen.getByRole("button", { name: "Refresh trainers" })).toBeInTheDocument();
    });

    it("calls onRefresh when Refresh is clicked", () => {
        const handleRefresh = vi.fn();
        render(<TrainersView {...defaultProps} onRefresh={handleRefresh} />);
        fireEvent.click(screen.getByRole("button", { name: "Refresh trainers" }));
        expect(handleRefresh).toHaveBeenCalled();
    });

    it("shows count badge when trainers exist", () => {
        render(<TrainersView {...defaultProps} trainers={mockTrainers} />);
        expect(screen.getByText("2 total")).toBeInTheDocument();
    });

    it("does not show count badge when list is empty", () => {
        render(<TrainersView {...defaultProps} />);
        expect(screen.queryByText(/total/)).not.toBeInTheDocument();
    });
});

describe("TrainersView — breadcrumb", () => {
    it("does not render stale People breadcrumb item", () => {
        render(<TrainersView {...defaultProps} />);
        expect(screen.queryByText("People")).not.toBeInTheDocument();
    });

    it("renders Trainers breadcrumb item", () => {
        render(<TrainersView {...defaultProps} />);
        expect(screen.getAllByText("Trainers").length).toBeGreaterThan(0);
    });
});

describe("TrainersView — trainers list", () => {
    it("renders trainer names", () => {
        render(<TrainersView {...defaultProps} trainers={mockTrainers} />);
        expect(screen.getByText("Aarav Shah")).toBeInTheDocument();
        expect(screen.getByText("Mira Kapoor")).toBeInTheDocument();
    });

    it("renders Active status badge for active trainer", () => {
        render(
            <TrainersView
                {...defaultProps}
                trainers={mockTrainers}
                selectedTrainer={aaravTrainer}
            />
        );
        expect(screen.getByText("Active")).toBeInTheDocument();
    });

    it("renders Inactive status badge for inactive trainer", () => {
        render(
            <TrainersView
                {...defaultProps}
                trainers={mockTrainers}
                selectedTrainer={miraTrainer}
            />
        );
        expect(screen.getByText("Inactive")).toBeInTheDocument();
    });

    it("renders upcoming bookings for the selected trainer", () => {
        render(
            <TrainersView
                {...defaultProps}
                trainers={mockTrainers}
                selectedTrainer={aaravTrainer}
                bookings={[makeBooking({ court_name: "Center Court" })]}
            />
        );
        expect(screen.getByText(/Upcoming bookings/)).toBeInTheDocument();
        expect(screen.getByText("Center Court")).toBeInTheDocument();
        expect(screen.getByText("Individual Lesson")).toBeInTheDocument();
        expect(screen.getByText("Confirmed")).toBeInTheDocument();
    });

    it("shows far-future bookings and caps the list at 10", () => {
        const bookings = Array.from({ length: 14 }, (_, index) =>
            makeBooking({
                booking_id: `b-${index}`,
                court_name: `Court ${index}`,
                start_datetime: new Date(
                    Date.now() + (index + 1) * 24 * 60 * 60 * 1000
                ).toISOString(),
            })
        );
        render(
            <TrainersView
                {...defaultProps}
                trainers={mockTrainers}
                selectedTrainer={aaravTrainer}
                bookings={bookings}
            />
        );
        // Far-future (any date) bookings render, but only the first 10.
        expect(screen.getByText("Court 0")).toBeInTheDocument();
        expect(screen.getByText("Court 9")).toBeInTheDocument();
        expect(screen.queryByText("Court 10")).not.toBeInTheDocument();
    });

    it("shows empty state when there are no upcoming bookings", () => {
        render(
            <TrainersView
                {...defaultProps}
                trainers={mockTrainers}
                selectedTrainer={aaravTrainer}
                bookings={[]}
            />
        );
        expect(screen.getByText(/No upcoming bookings/)).toBeInTheDocument();
    });

    it("renders View button for each trainer", () => {
        render(<TrainersView {...defaultProps} trainers={mockTrainers} />);
        expect(screen.getAllByRole("button", { name: /^View profile for / })).toHaveLength(2);
    });

    it("calls onViewTrainer with correct trainer when View is clicked", () => {
        const handleView = vi.fn();
        render(
            <TrainersView {...defaultProps} trainers={mockTrainers} onViewTrainer={handleView} />
        );
        const viewButton = screen.getByRole("button", {
            name: "View profile for Aarav Shah",
        });

        fireEvent.click(viewButton);
        expect(handleView).toHaveBeenCalledWith(aaravTrainer);
    });

    it("renders list and profile headings", () => {
        render(<TrainersView {...defaultProps} trainers={mockTrainers} />);
        expect(screen.getByText("Trainer list")).toBeInTheDocument();
        expect(screen.getByText("Select a trainer")).toBeInTheDocument();
    });

    it("sorts trainers by name from sortable header", () => {
        render(<TrainersView {...defaultProps} trainers={[miraTrainer, aaravTrainer]} />);

        fireEvent.click(screen.getByRole("button", { name: "Sort by Sort ascending" }));
        expect(
            screen.getAllByText(/Aarav Shah|Mira Kapoor/).map((node) => node.textContent)
        ).toEqual(["Aarav Shah", "Mira Kapoor"]);

        fireEvent.click(screen.getByRole("button", { name: "Sort by Sort descending" }));
        expect(
            screen.getAllByText(/Aarav Shah|Mira Kapoor/).map((node) => node.textContent)
        ).toEqual(["Mira Kapoor", "Aarav Shah"]);
    });

    it("paginates trainer rows", () => {
        render(
            <TrainersView
                {...defaultProps}
                trainers={Array.from({ length: 11 }, (_, index) => makeTrainer(index + 1))}
            />
        );

        expect(screen.getByText("1–10 of 11")).toBeInTheDocument();
        expect(screen.getByText("Trainer 01")).toBeInTheDocument();
        expect(screen.queryByText("Trainer 11")).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Page 2" }));
        expect(screen.getByText("11–11 of 11")).toBeInTheDocument();
        expect(screen.getByText("Trainer 11")).toBeInTheDocument();
        expect(screen.queryByText("Trainer 01")).not.toBeInTheDocument();
    });

    it("selects a trainer from the list", () => {
        const handleSelect = vi.fn();
        render(
            <TrainersView
                {...defaultProps}
                trainers={mockTrainers}
                onSelectTrainer={handleSelect}
            />
        );
        fireEvent.click(screen.getByRole("button", { name: "Select trainer Aarav Shah" }));
        expect(handleSelect).toHaveBeenCalledWith(aaravTrainer);
    });

    it("sorts upcoming bookings chronologically", () => {
        const day1 = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        const day3 = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
        render(
            <TrainersView
                {...defaultProps}
                trainers={mockTrainers}
                selectedTrainer={aaravTrainer}
                bookings={[
                    makeBooking({
                        booking_id: "later",
                        court_name: "Later Court",
                        start_datetime: day3,
                    }),
                    makeBooking({
                        booking_id: "sooner",
                        court_name: "Sooner Court",
                        start_datetime: day1,
                    }),
                ]}
            />
        );

        const courts = screen.getAllByText(/Sooner Court|Later Court/).map((n) => n.textContent);
        expect(courts).toEqual(["Sooner Court", "Later Court"]);
    });
});
