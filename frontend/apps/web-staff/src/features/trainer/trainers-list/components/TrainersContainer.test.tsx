import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import TrainersContainer from "./TrainersContainer";

const mockNavigate = vi.fn();
const mockRefetch = vi.fn();
const mockRefetchAvailability = vi.fn();
let mockSearchResult: Record<string, unknown> = {};

vi.mock("@tanstack/react-router", () => ({
    useNavigate: vi.fn(() => mockNavigate),
    useSearch: vi.fn(() => mockSearchResult),
}));

vi.mock("../../hooks", () => ({
    useListTrainers: vi.fn(),
    useGetTrainerAvailability: vi.fn(),
}));

vi.mock("../../store", () => ({
    useClubAccess: vi.fn(),
    canManageTrainers: vi.fn(),
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

import { useListTrainers } from "../../hooks";
import { useGetTrainerAvailability } from "../../hooks";
import { useClubAccess, canManageTrainers } from "../../store";

const mockUseListTrainers = useListTrainers as ReturnType<typeof vi.fn>;
const mockUseGetTrainerAvailability = useGetTrainerAvailability as ReturnType<typeof vi.fn>;
const mockUseClubAccess = useClubAccess as ReturnType<typeof vi.fn>;
const mockCanManageTrainers = canManageTrainers as ReturnType<typeof vi.fn>;

const mockTrainers = [
    {
        id: "trainer-001-abcd",
        club_id: "club-1",
        user_id: "user-1",
        full_name: "Aarav Shah",
        bio: "Expert padel coach",
        is_active: true,
        availability: [],
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
    },
];

function setupMocks(overrides: Record<string, unknown> = {}) {
    mockUseListTrainers.mockReturnValue({
        data: mockTrainers,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
        ...overrides,
    });
    mockUseClubAccess.mockReturnValue({ clubId: "club-1", role: "owner" });
    mockCanManageTrainers.mockReturnValue(true);
    mockUseGetTrainerAvailability.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: mockRefetchAvailability,
    });
}

describe("TrainersContainer — loading state", () => {
    it("renders loading indicator", () => {
        mockUseListTrainers.mockReturnValue({
            data: [],
            isLoading: true,
            error: null,
            refetch: mockRefetch,
        });
        mockUseClubAccess.mockReturnValue({ clubId: "club-1", role: "owner" });
        mockCanManageTrainers.mockReturnValue(true);
        mockUseGetTrainerAvailability.mockReturnValue({
            data: [],
            isLoading: false,
            error: null,
            refetch: mockRefetchAvailability,
        });
        render(<TrainersContainer />);
        expect(screen.getByText("Loading trainers…")).toBeInTheDocument();
    });
});

describe("TrainersContainer — error state", () => {
    it("renders error message", () => {
        mockUseListTrainers.mockReturnValue({
            data: [],
            isLoading: false,
            error: new Error("Network error"),
            refetch: mockRefetch,
        });
        mockUseClubAccess.mockReturnValue({ clubId: "club-1", role: "owner" });
        mockCanManageTrainers.mockReturnValue(true);
        mockUseGetTrainerAvailability.mockReturnValue({
            data: [],
            isLoading: false,
            error: null,
            refetch: mockRefetchAvailability,
        });
        render(<TrainersContainer />);
        expect(screen.getByText("Network error")).toBeInTheDocument();
    });
});

describe("TrainersContainer — trainers list", () => {
    it("renders trainers", () => {
        setupMocks();
        render(<TrainersContainer />);
        expect(screen.getAllByText("Expert padel coach").length).toBeGreaterThan(0);
    });
});

describe("TrainersContainer — navigation", () => {
    beforeEach(() => {
        mockNavigate.mockReset();
    });

    it("navigates to trainer detail when View is clicked", () => {
        setupMocks();
        render(<TrainersContainer />);
        fireEvent.click(screen.getByRole("button", { name: "View" }));
        expect(mockNavigate).toHaveBeenCalledWith({
            to: "/trainers/$trainerId",
            params: { trainerId: "trainer-001-abcd" },
        });
    });
});

describe("TrainersContainer — refresh", () => {
    it("calls refetch when Refresh button is clicked", () => {
        setupMocks();
        render(<TrainersContainer />);
        fireEvent.click(screen.getByRole("button", { name: "Refresh trainers" }));
        expect(mockRefetch).toHaveBeenCalled();
    });
});

describe("TrainersContainer — success toast", () => {
    it("shows success toast when search has created=true", () => {
        mockSearchResult = { created: true };

        mockUseListTrainers.mockReturnValue({
            data: [],
            isLoading: false,
            error: null,
            refetch: mockRefetch,
        });
        mockUseClubAccess.mockReturnValue({ clubId: "club-1", role: "owner" });
        mockCanManageTrainers.mockReturnValue(true);
        mockUseGetTrainerAvailability.mockReturnValue({
            data: [],
            isLoading: false,
            error: null,
            refetch: mockRefetchAvailability,
        });

        render(<TrainersContainer />);
        expect(screen.getByText("Trainer created.")).toBeInTheDocument();
        mockSearchResult = {};
    });

    it("shows success toast when search has updated=true", () => {
        mockSearchResult = { updated: true };

        setupMocks({ data: [] });
        render(<TrainersContainer />);
        expect(screen.getByText("Trainer updated.")).toBeInTheDocument();
        mockSearchResult = {};
    });
});

describe("TrainersContainer — role access", () => {
    it("does not show manage hints for non-admin roles", () => {
        mockUseListTrainers.mockReturnValue({
            data: [],
            isLoading: false,
            error: null,
            refetch: mockRefetch,
        });
        mockUseClubAccess.mockReturnValue({ clubId: "club-1", role: "staff" });
        mockCanManageTrainers.mockReturnValue(false);
        mockUseGetTrainerAvailability.mockReturnValue({
            data: [],
            isLoading: false,
            error: null,
            refetch: mockRefetchAvailability,
        });
        render(<TrainersContainer />);
        expect(
            screen.getByText("No trainers are currently assigned to this club.")
        ).toBeInTheDocument();
    });
});
