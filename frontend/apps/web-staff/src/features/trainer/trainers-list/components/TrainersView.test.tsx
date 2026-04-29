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

const firstTrainer = mockTrainers[0]!;

const defaultProps = {
    trainers: [],
    isLoading: false,
    error: null,
    canManage: true,
    onRefresh: vi.fn(),
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

    it("renders correct availability slot count", () => {
        render(<TrainersView {...defaultProps} trainers={mockTrainers} />);
        expect(screen.getByText("2 slots")).toBeInTheDocument();
        expect(screen.getByText("0 slots")).toBeInTheDocument();
    });

    it("uses singular 'slot' when count is 1", () => {
        const singleSlotTrainer: Trainer[] = [
            {
                ...firstTrainer,
                availability: [{ id: "avail-1" } as never],
            },
        ];
        render(<TrainersView {...defaultProps} trainers={singleSlotTrainer} />);
        expect(screen.getByText("1 slot")).toBeInTheDocument();
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
        fireEvent.click(screen.getAllByRole("button", { name: "View" })[0]!);
        expect(handleView).toHaveBeenCalledWith(firstTrainer);
    });

    it("renders table column headers", () => {
        render(<TrainersView {...defaultProps} trainers={mockTrainers} />);
        expect(screen.getByText("Trainer")).toBeInTheDocument();
        expect(screen.getByText("Availability Slots")).toBeInTheDocument();
        expect(screen.getByText("Status")).toBeInTheDocument();
        expect(screen.getByText("Actions")).toBeInTheDocument();
    });
});
