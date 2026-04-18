import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CourtsContainer from "./CourtsContainer";

vi.mock("../../hooks", () => ({
    useListCourts: vi.fn(),
    useGetCourtAvailability: vi.fn(),
}));

vi.mock("../../store", () => ({
    useClubAccess: vi.fn(),
    canManageCourts: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
    useNavigate: vi.fn(() => vi.fn()),
    useSearch: vi.fn(() => ({})),
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
    SelectInput: ({
        value,
        onValueChange,
        options,
        placeholder,
    }: {
        value: string;
        onValueChange: (v: string) => void;
        options: Array<{ value: string; label: string }>;
        placeholder?: string;
    }) => (
        <select
            value={value}
            aria-label={placeholder}
            onChange={(e) => onValueChange(e.target.value)}
        >
            {options.map((o) => (
                <option key={o.value} value={o.value}>
                    {o.label}
                </option>
            ))}
        </select>
    ),
    DatePicker: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
        <input
            type="date"
            aria-label="Filter by date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
        />
    ),
    TimeInput: ({ className, ...props }: { className?: string; [k: string]: unknown }) => (
        <input type="time" className={className} {...(props as object)} />
    ),
}));

import { useListCourts, useGetCourtAvailability } from "../../hooks";
import { useClubAccess, canManageCourts } from "../../store";
import { useNavigate, useSearch } from "@tanstack/react-router";

const mockUseListCourts = useListCourts as ReturnType<typeof vi.fn>;
const mockUseGetCourtAvailability = useGetCourtAvailability as ReturnType<typeof vi.fn>;
const mockUseClubAccess = useClubAccess as ReturnType<typeof vi.fn>;
const mockCanManageCourts = canManageCourts as ReturnType<typeof vi.fn>;
const mockUseNavigate = useNavigate as ReturnType<typeof vi.fn>;
const mockUseSearch = useSearch as ReturnType<typeof vi.fn>;

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

function setupMocks(courtsOverride = {}, canManage = true) {
    const mockNavigate = vi.fn();
    mockUseNavigate.mockReturnValue(mockNavigate);
    mockUseSearch.mockReturnValue({});
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
    mockUseClubAccess.mockReturnValue({ clubId: "club-1", role: canManage ? "owner" : "staff" });
    mockCanManageCourts.mockReturnValue(canManage);
    return { mockNavigate };
}

describe("CourtsContainer — loading state", () => {
    it("renders loading indicator", () => {
        const mockNavigate = vi.fn();
        mockUseNavigate.mockReturnValue(mockNavigate);
        mockUseSearch.mockReturnValue({});
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
        mockCanManageCourts.mockReturnValue(true);
        render(<CourtsContainer />);
        expect(screen.getByText("Loading courts…")).toBeInTheDocument();
    });
});

describe("CourtsContainer — error state", () => {
    it("renders error message", () => {
        const mockNavigate = vi.fn();
        mockUseNavigate.mockReturnValue(mockNavigate);
        mockUseSearch.mockReturnValue({});
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
        mockCanManageCourts.mockReturnValue(true);
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

describe("CourtsContainer — Add Court navigation", () => {
    it("navigates to /courts/new when Add Court is clicked (owner)", () => {
        const { mockNavigate } = setupMocks({ data: [] });
        render(<CourtsContainer />);
        const addCourtButtons = screen.getAllByRole("button", { name: /Add Court/i });
        const emptyStateButton = addCourtButtons[addCourtButtons.length - 1];

        if (!emptyStateButton) {
            throw new Error("Expected an Add Court button in the empty state");
        }

        fireEvent.click(emptyStateButton);
        expect(mockNavigate).toHaveBeenCalledWith({ to: "/courts/new" });
    });

    it("does not show Add Court actions for non-admin non-owner roles", () => {
        setupMocks({ data: [] }, false);
        render(<CourtsContainer />);
        expect(screen.queryByRole("button", { name: /add court/i })).not.toBeInTheDocument();
    });
});

describe("CourtsContainer — Edit Court navigation", () => {
    it("navigates to /courts/:courtId when Edit is clicked (owner)", () => {
        const { mockNavigate } = setupMocks();
        render(<CourtsContainer />);
        fireEvent.click(screen.getByLabelText("Edit Court Alpha"));
        expect(mockNavigate).toHaveBeenCalledWith({
            to: "/courts/$courtId",
            params: { courtId: "court-1" },
        });
    });

    it("does not show Edit button for non-admin non-owner roles", () => {
        setupMocks({}, false);
        render(<CourtsContainer />);
        expect(screen.queryByLabelText(/Edit Court/i)).not.toBeInTheDocument();
    });
});

describe("CourtsContainer — availability panel", () => {
    it("shows availability panel when Check Availability is clicked", () => {
        setupMocks();
        render(<CourtsContainer />);
        fireEvent.click(screen.getByLabelText("Check availability for Court Alpha"));
        expect(screen.getAllByText("Court Alpha").length).toBeGreaterThan(0);
    });

    it("toggles availability panel off when same court is clicked again", () => {
        setupMocks();
        const { container } = render(<CourtsContainer />);
        const availabilityButton = screen.getByLabelText("Check availability for Court Alpha");
        fireEvent.click(availabilityButton);
        expect(screen.getAllByText(firstCourt.name).length).toBeGreaterThan(1);
        fireEvent.click(screen.getByLabelText("Check availability for Court Alpha"));
        expect(screen.getAllByText(firstCourt.name).length).toBe(1);
        void container;
    });
});
