import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TrainersView from "./TrainersView";
import type { Trainer } from "../../types";

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
    formatUTCDate: (value: string) => value,
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

const defaultProps = {
    trainers: [],
    isLoading: false,
    error: null,
    canManage: true,
    selectedTrainer: null,
    availability: [],
    availabilityLoading: false,
    availabilityError: null,
    onRefresh: vi.fn(),
    onRefreshAvailability: vi.fn(),
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

    it("renders trainer bio when present", () => {
        render(<TrainersView {...defaultProps} trainers={mockTrainers} />);
        expect(screen.getByText("Expert padel coach")).toBeInTheDocument();
    });

    it("shows 'No bio provided' when bio is null", () => {
        render(<TrainersView {...defaultProps} trainers={mockTrainers} />);
        expect(screen.getByText("No bio provided")).toBeInTheDocument();
    });

    it("renders Active status badge for active trainer", () => {
        render(<TrainersView {...defaultProps} trainers={mockTrainers} />);
        expect(screen.getByText("Active")).toBeInTheDocument();
    });

    it("renders Inactive status badge for inactive trainer", () => {
        render(<TrainersView {...defaultProps} trainers={mockTrainers} />);
        expect(screen.getByText("Inactive")).toBeInTheDocument();
    });

    it("renders selected trainer availability slot count", () => {
        render(
            <TrainersView
                {...defaultProps}
                trainers={mockTrainers}
                selectedTrainer={aaravTrainer}
                availability={[
                    {
                        id: "avail-1",
                        staff_profile_id: "trainer-001-abcd",
                        day_of_week: 0,
                        start_time: "14:00:00",
                        end_time: "15:00:00",
                        set_by_user_id: "user-1",
                        effective_from: "2026-04-01",
                        effective_until: null,
                        notes: null,
                        created_at: "2026-04-01T00:00:00Z",
                        updated_at: "2026-04-01T00:00:00Z",
                    },
                    {
                        id: "avail-2",
                        staff_profile_id: "trainer-001-abcd",
                        day_of_week: 0,
                        start_time: "16:00:00",
                        end_time: "17:00:00",
                        set_by_user_id: "user-1",
                        effective_from: "2026-04-01",
                        effective_until: null,
                        notes: null,
                        created_at: "2026-04-01T00:00:00Z",
                        updated_at: "2026-04-01T00:00:00Z",
                    },
                ]}
            />
        );
        expect(screen.getByText("Availability")).toBeInTheDocument();
        expect(screen.getAllByText("2 slots").length).toBeGreaterThan(0);
    });

    it("uses singular 'slot' when count is 1", () => {
        render(
            <TrainersView
                {...defaultProps}
                trainers={[aaravTrainer]}
                selectedTrainer={aaravTrainer}
                availability={[
                    {
                        id: "avail-1",
                        staff_profile_id: "trainer-001-abcd",
                        day_of_week: 0,
                        start_time: "14:00:00",
                        end_time: "15:00:00",
                        set_by_user_id: "user-1",
                        effective_from: "2026-04-01",
                        effective_until: null,
                        notes: null,
                        created_at: "2026-04-01T00:00:00Z",
                        updated_at: "2026-04-01T00:00:00Z",
                    },
                ]}
            />
        );
        expect(screen.getAllByText("1 slot").length).toBeGreaterThan(0);
    });

    it("renders View button for each trainer", () => {
        render(<TrainersView {...defaultProps} trainers={mockTrainers} />);
        expect(screen.getAllByRole("button", { name: "View" })).toHaveLength(2);
    });

    it("calls onViewTrainer with correct trainer when View is clicked", () => {
        const handleView = vi.fn();
        render(
            <TrainersView {...defaultProps} trainers={mockTrainers} onViewTrainer={handleView} />
        );
        const [viewButton] = screen.getAllByRole("button", { name: "View" });

        if (viewButton == null) {
            throw new Error("Expected a trainer view button");
        }
        fireEvent.click(viewButton);
        expect(handleView).toHaveBeenCalledWith(aaravTrainer);
    });

    it("renders list and profile headings", () => {
        render(<TrainersView {...defaultProps} trainers={mockTrainers} />);
        expect(screen.getByText("Trainer")).toBeInTheDocument();
        expect(screen.getByText("Trainer list")).toBeInTheDocument();
        expect(screen.getByText("Status")).toBeInTheDocument();
        expect(screen.getByText("Select a trainer")).toBeInTheDocument();
    });

    it("sorts trainers by name from sortable header", () => {
        render(<TrainersView {...defaultProps} trainers={[miraTrainer, aaravTrainer]} />);

        fireEvent.click(screen.getByRole("button", { name: "Sort by Trainer ascending" }));
        expect(
            screen.getAllByText(/Aarav Shah|Mira Kapoor/).map((node) => node.textContent)
        ).toEqual(["Aarav Shah", "Mira Kapoor"]);

        fireEvent.click(screen.getByRole("button", { name: "Sort by Trainer descending" }));
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

        expect(screen.getByText("1-10 of 11")).toBeInTheDocument();
        expect(screen.getByText("Trainer 01")).toBeInTheDocument();
        expect(screen.queryByText("Trainer 11")).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Page 2" }));
        expect(screen.getByText("11-11 of 11")).toBeInTheDocument();
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

    it("groups availability by day and formats times in 12-hour display", () => {
        render(
            <TrainersView
                {...defaultProps}
                trainers={mockTrainers}
                selectedTrainer={aaravTrainer}
                availability={[
                    {
                        id: "avail-1",
                        staff_profile_id: "trainer-001-abcd",
                        day_of_week: 0,
                        start_time: "14:00:00",
                        end_time: "15:30:00",
                        set_by_user_id: "user-1",
                        effective_from: "2026-04-01",
                        effective_until: null,
                        notes: "Afternoon coaching",
                        created_at: "2026-04-01T00:00:00Z",
                        updated_at: "2026-04-01T00:00:00Z",
                    },
                ]}
            />
        );

        expect(screen.getByText("Monday")).toBeInTheDocument();
        expect(screen.getByText("2:00 PM - 3:30 PM")).toBeInTheDocument();
        expect(screen.getByText("Afternoon coaching")).toBeInTheDocument();
    });
});
