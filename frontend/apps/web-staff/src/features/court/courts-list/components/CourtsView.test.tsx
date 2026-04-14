import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CourtsView from "./CourtsView";
import type { Court, AvailabilityFilters } from "../../types";

vi.mock("@repo/ui", () => ({
    Breadcrumb: ({ items }: { items: { label: string }[] }) => (
        <nav>
            {items.map((i) => (
                <span key={i.label}>{i.label}</span>
            ))}
        </nav>
    ),
}));

vi.mock("./AvailabilityPanel", () => ({
    default: ({ court, onClose }: { court: { name: string }; onClose: () => void }) => (
        <div data-testid="availability-panel">
            <span>{court.name}</span>
            <button onClick={onClose}>Close panel</button>
        </div>
    ),
}));

const mockCourts: Court[] = [
    {
        id: "court-1",
        club_id: "club-1",
        name: "Court Alpha",
        surface_type: "artificial_grass",
        has_lighting: true,
        lighting_surcharge: 5,
        is_active: true,
    },
    {
        id: "court-2",
        club_id: "club-1",
        name: "Court Beta",
        surface_type: "outdoor",
        has_lighting: false,
        lighting_surcharge: null,
        is_active: false,
    },
];

const firstCourt = mockCourts[0];

if (!firstCourt) {
    throw new Error("Expected at least one mock court");
}

const defaultFilters: AvailabilityFilters = {
    search: "",
    surfaceType: "",
    date: "2026-04-11",
    timeFrom: "",
    timeTo: "",
};

const defaultProps = {
    courts: [],
    isLoading: false,
    error: null,
    canCreateCourt: true,
    filters: defaultFilters,
    hasPendingServerFilters: false,
    hasActiveServerFilters: false,
    onFiltersChange: vi.fn(),
    onSearch: vi.fn(),
    onCreateClick: vi.fn(),
    onEditCourt: vi.fn(),
    onRefresh: vi.fn(),
    availabilityCourt: null,
    availabilityDate: "2026-04-11",
    availability: undefined,
    availabilityLoading: false,
    availabilityError: null,
    selectedSlot: null,
    onCheckAvailability: vi.fn(),
    onCloseAvailability: vi.fn(),
    onAvailabilityDateChange: vi.fn(),
    onSelectSlot: vi.fn(),
    onBookSlot: vi.fn(),
};

describe("CourtsView — loading state", () => {
    it("shows loading spinner", () => {
        render(<CourtsView {...defaultProps} isLoading={true} />);
        expect(screen.getByText("Loading courts…")).toBeInTheDocument();
    });
});

describe("CourtsView — error state", () => {
    it("shows error message", () => {
        render(<CourtsView {...defaultProps} error={new Error("Network error")} />);
        expect(screen.getByText("Network error")).toBeInTheDocument();
    });
});

describe("CourtsView — empty state", () => {
    it("shows empty state when no courts exist", () => {
        render(<CourtsView {...defaultProps} />);
        expect(screen.getByText("No courts yet")).toBeInTheDocument();
        expect(screen.getAllByText("Add Court").length).toBeGreaterThan(0);
    });

    it("calls onCreateClick when empty-state Add Court is clicked", () => {
        const handleCreate = vi.fn();
        render(<CourtsView {...defaultProps} onCreateClick={handleCreate} />);
        const buttons = screen.getAllByText("Add Court");
        const emptyStateButton = buttons[buttons.length - 1];

        if (!emptyStateButton) {
            throw new Error("Expected empty-state Add Court button");
        }

        fireEvent.click(emptyStateButton);
        expect(handleCreate).toHaveBeenCalled();
    });

    it("does not show Add Court in the empty state when user cannot manage courts", () => {
        render(<CourtsView {...defaultProps} canCreateCourt={false} />);
        expect(screen.queryByText("Add Court")).not.toBeInTheDocument();
    });

    it("shows filter message when courts exist but none match filter", () => {
        render(<CourtsView {...defaultProps} courts={[]} hasActiveServerFilters={true} />);
        expect(screen.getByText("No courts match your filters")).toBeInTheDocument();
    });
});

describe("CourtsView — court list", () => {
    it("renders court names", () => {
        render(<CourtsView {...defaultProps} courts={mockCourts} />);
        expect(screen.getByText("Court Alpha")).toBeInTheDocument();
        expect(screen.getByText("Court Beta")).toBeInTheDocument();
    });

    it("renders lighting surcharge when the value arrives as a string", () => {
        render(
            <CourtsView
                {...defaultProps}
                courts={[{ ...firstCourt, lighting_surcharge: "5.5" } as unknown as Court]}
            />
        );

        expect(screen.getByText("Surcharge 5.50")).toBeInTheDocument();
    });

    it("renders surface type labels", () => {
        render(<CourtsView {...defaultProps} courts={mockCourts} />);
        // "Artificial Grass" also appears in filter dropdown, so getAllByText
        expect(screen.getAllByText("Artificial Grass").length).toBeGreaterThan(0);
        expect(screen.getAllByText("Outdoor").length).toBeGreaterThan(0);
    });

    it("renders active/inactive status badges", () => {
        render(<CourtsView {...defaultProps} courts={mockCourts} />);
        expect(screen.getAllByText("Active").length).toBe(1);
        expect(screen.getByText("Inactive")).toBeInTheDocument();
    });

    it("calls onEditCourt with correct court when Edit is clicked", () => {
        const handleEdit = vi.fn();
        render(<CourtsView {...defaultProps} courts={mockCourts} onEditCourt={handleEdit} />);
        const editButton = screen.getByLabelText("Edit Court Alpha");
        fireEvent.click(editButton);
        expect(handleEdit).toHaveBeenCalledWith(firstCourt);
    });

    it("calls onCheckAvailability with correct court when Check Availability is clicked", () => {
        const handleAvailability = vi.fn();
        render(
            <CourtsView
                {...defaultProps}
                courts={mockCourts}
                onCheckAvailability={handleAvailability}
            />
        );
        fireEvent.click(screen.getByLabelText("Check availability for Court Alpha"));
        expect(handleAvailability).toHaveBeenCalledWith(firstCourt);
    });

    it("calls onCreateClick when header Add Court button is clicked", () => {
        const handleCreate = vi.fn();
        render(<CourtsView {...defaultProps} courts={mockCourts} onCreateClick={handleCreate} />);
        fireEvent.click(screen.getByText("Add Court"));
        expect(handleCreate).toHaveBeenCalled();
    });

    it("does not show header Add Court button when user cannot manage courts", () => {
        render(<CourtsView {...defaultProps} courts={mockCourts} canCreateCourt={false} />);
        expect(screen.queryByText("Add Court")).not.toBeInTheDocument();
    });

    it("calls onRefresh when Refresh is clicked", () => {
        const handleRefresh = vi.fn();
        render(<CourtsView {...defaultProps} courts={mockCourts} onRefresh={handleRefresh} />);
        fireEvent.click(screen.getAllByLabelText("Refresh courts")[0]!);
        expect(handleRefresh).toHaveBeenCalled();
    });
});

describe("CourtsView — filter bar", () => {
    it("calls onSearch when Apply Filters is clicked", () => {
        const handleSearch = vi.fn();
        render(
            <CourtsView
                {...defaultProps}
                courts={mockCourts}
                hasPendingServerFilters={true}
                onSearch={handleSearch}
            />
        );
        fireEvent.click(screen.getByRole("button", { name: /apply filters/i }));
        expect(handleSearch).toHaveBeenCalled();
    });

    it("calls onFiltersChange when surface type changes", () => {
        const handleFiltersChange = vi.fn();
        render(
            <CourtsView
                {...defaultProps}
                courts={mockCourts}
                onFiltersChange={handleFiltersChange}
            />
        );
        fireEvent.change(screen.getByLabelText("Filter by surface type"), {
            target: { value: "indoor" },
        });
        expect(handleFiltersChange).toHaveBeenCalledWith(
            expect.objectContaining({ surfaceType: "indoor" })
        );
    });

    it("calls onFiltersChange when date changes", () => {
        const handleFiltersChange = vi.fn();
        render(
            <CourtsView
                {...defaultProps}
                courts={mockCourts}
                onFiltersChange={handleFiltersChange}
            />
        );
        fireEvent.change(screen.getByLabelText("Filter by date"), {
            target: { value: "2026-04-12" },
        });
        expect(handleFiltersChange).toHaveBeenCalledWith(
            expect.objectContaining({ date: "2026-04-12" })
        );
    });

    it("calls onFiltersChange when from time changes", () => {
        const handleFiltersChange = vi.fn();
        render(
            <CourtsView
                {...defaultProps}
                courts={mockCourts}
                onFiltersChange={handleFiltersChange}
            />
        );
        fireEvent.change(screen.getByLabelText("Filter from time"), {
            target: { value: "09:00" },
        });
        expect(handleFiltersChange).toHaveBeenCalledWith(
            expect.objectContaining({ timeFrom: "09:00" })
        );
    });

    it("calls onFiltersChange when to time changes", () => {
        const handleFiltersChange = vi.fn();
        render(
            <CourtsView
                {...defaultProps}
                courts={mockCourts}
                onFiltersChange={handleFiltersChange}
            />
        );
        fireEvent.change(screen.getByLabelText("Filter to time"), {
            target: { value: "11:00" },
        });
        expect(handleFiltersChange).toHaveBeenCalledWith(
            expect.objectContaining({ timeTo: "11:00" })
        );
    });
});

describe("CourtsView — availability panel", () => {
    it("does not render availability panel when no court selected", () => {
        render(<CourtsView {...defaultProps} courts={mockCourts} />);
        expect(screen.queryByTestId("availability-panel")).not.toBeInTheDocument();
    });

    it("renders availability panel when availabilityCourt is set", () => {
        render(<CourtsView {...defaultProps} courts={mockCourts} availabilityCourt={firstCourt} />);
        expect(screen.getByTestId("availability-panel")).toBeInTheDocument();
        // "Court Alpha" appears in table row and panel — both are valid
        expect(screen.getAllByText("Court Alpha").length).toBeGreaterThan(0);
    });

    it("calls onCloseAvailability when panel close is clicked", () => {
        const handleClose = vi.fn();
        render(
            <CourtsView
                {...defaultProps}
                courts={mockCourts}
                availabilityCourt={firstCourt}
                onCloseAvailability={handleClose}
            />
        );
        fireEvent.click(screen.getByText("Close panel"));
        expect(handleClose).toHaveBeenCalled();
    });
});
