import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TrainerDetailContainer from "./TrainerDetailContainer";

const mockRefetchAvailability = vi.fn();
const mockRefetchBookings = vi.fn();
const mockDeleteAvailabilityMutateAsync = vi.fn();

vi.mock("@tanstack/react-router", () => ({
    useParams: vi.fn(() => ({ trainerId: "trainer-001-abcd" })),
}));

vi.mock("../../hooks", () => ({
    useListTrainers: vi.fn(),
    useGetTrainerAvailability: vi.fn(),
    useGetTrainerBookings: vi.fn(),
    useDeleteTrainerAvailability: vi.fn(),
}));

vi.mock("../../store", () => ({
    useClubAccess: vi.fn(),
    canManageTrainers: vi.fn(),
}));

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
    formatUTCDate: (v: string) => `date:${v}`,
    formatUTCTime: (v: string) => `time:${v}`,
}));

import {
    useDeleteTrainerAvailability,
    useListTrainers,
    useGetTrainerAvailability,
    useGetTrainerBookings,
} from "../../hooks";
import { useClubAccess, canManageTrainers } from "../../store";

const mockUseListTrainers = useListTrainers as ReturnType<typeof vi.fn>;
const mockUseGetTrainerAvailability = useGetTrainerAvailability as ReturnType<typeof vi.fn>;
const mockUseGetTrainerBookings = useGetTrainerBookings as ReturnType<typeof vi.fn>;
const mockUseDeleteTrainerAvailability = useDeleteTrainerAvailability as ReturnType<typeof vi.fn>;
const mockUseClubAccess = useClubAccess as ReturnType<typeof vi.fn>;
const mockCanManageTrainers = canManageTrainers as ReturnType<typeof vi.fn>;

const mockTrainer = {
    id: "trainer-001-abcd",
    club_id: "club-1",
    user_id: "user-1",
    full_name: "Aarav Shah",
    bio: "Expert padel coach",
    is_active: true,
    availability: [],
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
};

function setupMocks(overrides: Record<string, unknown> = {}) {
    mockUseListTrainers.mockReturnValue({
        data: [mockTrainer],
        isLoading: false,
        ...overrides,
    });
    mockUseGetTrainerAvailability.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: mockRefetchAvailability,
    });
    mockUseGetTrainerBookings.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: mockRefetchBookings,
    });
    mockUseDeleteTrainerAvailability.mockReturnValue({
        mutateAsync: mockDeleteAvailabilityMutateAsync,
        isPending: false,
        variables: undefined,
    });
    mockUseClubAccess.mockReturnValue({ clubId: "club-1", role: "owner" });
    mockCanManageTrainers.mockReturnValue(true);
}

describe("TrainerDetailContainer — loading state", () => {
    it("shows loading spinner while trainers are loading", () => {
        mockUseListTrainers.mockReturnValue({ data: [], isLoading: true });
        mockUseGetTrainerAvailability.mockReturnValue({
            data: [],
            isLoading: false,
            error: null,
            refetch: mockRefetchAvailability,
        });
        mockUseGetTrainerBookings.mockReturnValue({
            data: [],
            isLoading: false,
            error: null,
            refetch: mockRefetchBookings,
        });
        mockUseDeleteTrainerAvailability.mockReturnValue({
            mutateAsync: mockDeleteAvailabilityMutateAsync,
            isPending: false,
            variables: undefined,
        });
        mockUseClubAccess.mockReturnValue({ clubId: "club-1", role: "owner" });
        mockCanManageTrainers.mockReturnValue(true);
        render(<TrainerDetailContainer />);
        expect(screen.getByText("Loading…")).toBeInTheDocument();
    });
});

describe("TrainerDetailContainer — not found state", () => {
    it("shows not found message when trainer ID does not match", () => {
        mockUseListTrainers.mockReturnValue({ data: [], isLoading: false });
        mockUseGetTrainerAvailability.mockReturnValue({
            data: [],
            isLoading: false,
            error: null,
            refetch: mockRefetchAvailability,
        });
        mockUseGetTrainerBookings.mockReturnValue({
            data: [],
            isLoading: false,
            error: null,
            refetch: mockRefetchBookings,
        });
        mockUseDeleteTrainerAvailability.mockReturnValue({
            mutateAsync: mockDeleteAvailabilityMutateAsync,
            isPending: false,
            variables: undefined,
        });
        mockUseClubAccess.mockReturnValue({ clubId: "club-1", role: "owner" });
        mockCanManageTrainers.mockReturnValue(true);
        render(<TrainerDetailContainer />);
        expect(screen.getByText("Trainer not found.")).toBeInTheDocument();
    });
});

describe("TrainerDetailContainer — data state", () => {
    it("renders trainer detail view when trainer is found", () => {
        setupMocks();
        render(<TrainerDetailContainer />);
        expect(screen.getByText("Aarav Shah")).toBeInTheDocument();
    });

    it("renders trainer bio", () => {
        setupMocks();
        render(<TrainerDetailContainer />);
        expect(screen.getByText("Expert padel coach")).toBeInTheDocument();
    });

    it("shows availability empty state by default", () => {
        setupMocks();
        render(<TrainerDetailContainer />);
        expect(screen.getByText("No availability set")).toBeInTheDocument();
    });
});

describe("TrainerDetailContainer — tab switching", () => {
    it("switches to bookings tab when Bookings is clicked", () => {
        setupMocks();
        render(<TrainerDetailContainer />);
        fireEvent.click(screen.getByRole("button", { name: /Bookings/i }));
        expect(screen.getByText("No bookings found")).toBeInTheDocument();
    });
});

describe("TrainerDetailContainer — refresh", () => {
    it("calls refetchAvailability when Refresh availability is clicked", () => {
        setupMocks();
        render(<TrainerDetailContainer />);
        fireEvent.click(screen.getByRole("button", { name: "Refresh availability" }));
        expect(mockRefetchAvailability).toHaveBeenCalled();
    });

    it("calls refetchBookings when Refresh bookings is clicked after tab switch", () => {
        setupMocks();
        render(<TrainerDetailContainer />);
        fireEvent.click(screen.getByRole("button", { name: /Bookings/i }));
        fireEvent.click(screen.getByRole("button", { name: "Refresh bookings" }));
        expect(mockRefetchBookings).toHaveBeenCalled();
    });
});

describe("TrainerDetailContainer — availability error", () => {
    it("renders availability error message", () => {
        setupMocks();
        mockUseGetTrainerAvailability.mockReturnValue({
            data: [],
            isLoading: false,
            error: new Error("Avail error"),
            refetch: mockRefetchAvailability,
        });
        render(<TrainerDetailContainer />);
        expect(screen.getByText("Avail error")).toBeInTheDocument();
    });
});

describe("TrainerDetailContainer — bookings error", () => {
    it("renders bookings error message on bookings tab", () => {
        setupMocks();
        mockUseGetTrainerBookings.mockReturnValue({
            data: [],
            isLoading: false,
            error: new Error("Bookings error"),
            refetch: mockRefetchBookings,
        });
        render(<TrainerDetailContainer />);
        fireEvent.click(screen.getByRole("button", { name: /Bookings/i }));
        expect(screen.getByText("Bookings error")).toBeInTheDocument();
    });
});
