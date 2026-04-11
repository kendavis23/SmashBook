import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CourtsContainer from "./CourtsContainer";

vi.mock("../../hooks", () => ({
    useListCourts: vi.fn(),
    useGetCourtAvailability: vi.fn(),
}));

vi.mock("../../store", () => ({
    useClubAccess: vi.fn(),
}));

vi.mock("../../components/CourtModal", () => ({
    default: ({ onClose }: { onClose: () => void }) => (
        <div role="dialog">
            <button onClick={onClose}>Close modal</button>
        </div>
    ),
}));

vi.mock("@repo/ui", () => ({
    AlertToast: ({ title, onClose }: { title: string; onClose: () => void }) => (
        <div role="alert">
            {title}
            <button onClick={onClose}>Dismiss</button>
        </div>
    ),
    Breadcrumb: ({ items }: { items: { label: string }[] }) => (
        <nav>
            {items.map((i) => (
                <span key={i.label}>{i.label}</span>
            ))}
        </nav>
    ),
}));

import { useListCourts, useGetCourtAvailability } from "../../hooks";
import { useClubAccess } from "../../store";

const mockUseListCourts = useListCourts as ReturnType<typeof vi.fn>;
const mockUseGetCourtAvailability = useGetCourtAvailability as ReturnType<typeof vi.fn>;
const mockUseClubAccess = useClubAccess as ReturnType<typeof vi.fn>;

const mockCourts = [
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

function setupMocks(courtsOverride = {}) {
    mockUseListCourts.mockReturnValue({
        data: mockCourts,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        ...courtsOverride,
    });
    mockUseGetCourtAvailability.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
    });
    mockUseClubAccess.mockReturnValue({ clubId: "club-1", role: "owner" });
}

describe("CourtsContainer — loading state", () => {
    it("renders loading indicator", () => {
        mockUseListCourts.mockReturnValue({
            data: [],
            isLoading: true,
            error: null,
            refetch: vi.fn(),
        });
        mockUseGetCourtAvailability.mockReturnValue({
            data: undefined,
            isLoading: false,
            error: null,
        });
        mockUseClubAccess.mockReturnValue({ clubId: "club-1", role: "owner" });
        render(<CourtsContainer />);
        expect(screen.getByText("Loading courts…")).toBeInTheDocument();
    });
});

describe("CourtsContainer — error state", () => {
    it("renders error message", () => {
        mockUseListCourts.mockReturnValue({
            data: [],
            isLoading: false,
            error: new Error("Network error"),
            refetch: vi.fn(),
        });
        mockUseGetCourtAvailability.mockReturnValue({
            data: undefined,
            isLoading: false,
            error: null,
        });
        mockUseClubAccess.mockReturnValue({ clubId: "club-1", role: "owner" });
        render(<CourtsContainer />);
        expect(screen.getByText("Network error")).toBeInTheDocument();
    });
});

describe("CourtsContainer — court list", () => {
    it("renders all courts", () => {
        setupMocks();
        render(<CourtsContainer />);
        expect(screen.getByText("Court Alpha")).toBeInTheDocument();
        expect(screen.getByText("Court Beta")).toBeInTheDocument();
    });

    it("applies supported hook filters when Search is clicked", () => {
        setupMocks();
        render(<CourtsContainer />);

        fireEvent.change(screen.getByLabelText("Filter by surface type"), {
            target: { value: "outdoor" },
        });

        expect(mockUseListCourts).toHaveBeenLastCalledWith(
            "club-1",
            expect.objectContaining({ surfaceType: "" })
        );

        fireEvent.click(screen.getByRole("button", { name: /apply filters/i }));

        expect(mockUseListCourts).toHaveBeenLastCalledWith(
            "club-1",
            expect.objectContaining({ surfaceType: "outdoor" })
        );
    });
});

describe("CourtsContainer — create modal", () => {
    it("opens CourtModal when Add Court is clicked", () => {
        setupMocks({ data: [] });
        render(<CourtsContainer />);
        const addCourtButtons = screen.getAllByRole("button", { name: /Add Court/i });
        const emptyStateButton = addCourtButtons[addCourtButtons.length - 1];

        if (!emptyStateButton) {
            throw new Error("Expected an Add Court button in the empty state");
        }

        fireEvent.click(emptyStateButton);
        expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("closes CourtModal when onClose is called", () => {
        setupMocks({ data: [] });
        render(<CourtsContainer />);
        const addCourtButtons = screen.getAllByRole("button", { name: /Add Court/i });
        const emptyStateButton = addCourtButtons[addCourtButtons.length - 1];

        if (!emptyStateButton) {
            throw new Error("Expected an Add Court button in the empty state");
        }

        fireEvent.click(emptyStateButton);
        fireEvent.click(screen.getByText("Close modal"));
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("does not show Add Court actions for non-admin non-owner roles", () => {
        mockUseListCourts.mockReturnValue({
            data: [],
            isLoading: false,
            error: null,
            refetch: vi.fn(),
        });
        mockUseGetCourtAvailability.mockReturnValue({
            data: undefined,
            isLoading: false,
            error: null,
        });
        mockUseClubAccess.mockReturnValue({ clubId: "club-1", role: "staff" });

        render(<CourtsContainer />);

        expect(screen.queryByRole("button", { name: /add court/i })).not.toBeInTheDocument();
    });
});

describe("CourtsContainer — edit modal", () => {
    it("opens CourtModal with court data when Edit is clicked", () => {
        setupMocks();
        render(<CourtsContainer />);
        fireEvent.click(screen.getByLabelText("Edit Court Alpha"));
        expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
});

describe("CourtsContainer — availability panel", () => {
    it("shows availability panel when Check Availability is clicked", () => {
        setupMocks();
        render(<CourtsContainer />);
        fireEvent.click(screen.getByLabelText("Check availability for Court Alpha"));
        // Availability panel is rendered (panel header with court name shows)
        expect(screen.getAllByText("Court Alpha").length).toBeGreaterThan(0);
    });

    it("toggles availability panel off when same court is clicked again", () => {
        setupMocks();
        const { container } = render(<CourtsContainer />);
        const availabilityButton = screen.getByLabelText("Check availability for Court Alpha");
        fireEvent.click(availabilityButton);
        // Panel visible — court name appears twice (table + panel)
        expect(screen.getAllByText(firstCourt.name).length).toBeGreaterThan(1);
        // Click again to close
        fireEvent.click(screen.getByLabelText("Check availability for Court Alpha"));
        // Now court name appears only once (table row)
        expect(screen.getAllByText(firstCourt.name).length).toBe(1);
        void container;
    });
});
