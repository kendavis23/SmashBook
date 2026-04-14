import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import MembershipPlansContainer from "./MembershipPlansContainer";

const mockNavigate = vi.fn();
const mockRefetch = vi.fn();

vi.mock("@tanstack/react-router", () => ({
    useNavigate: vi.fn(() => mockNavigate),
    useSearch: vi.fn(() => ({})),
}));

vi.mock("../../hooks", () => ({
    useListMembershipPlans: vi.fn(),
}));

vi.mock("../../store", () => ({
    useClubAccess: vi.fn(),
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

import { useListMembershipPlans } from "../../hooks";
import { useClubAccess } from "../../store";

const mockUseListMembershipPlans = useListMembershipPlans as ReturnType<typeof vi.fn>;
const mockUseClubAccess = useClubAccess as ReturnType<typeof vi.fn>;

const mockPlans = [
    {
        id: "plan-1",
        club_id: "club-1",
        name: "Gold Member",
        description: "Full access plan",
        billing_period: "monthly",
        price: 49.99,
        trial_days: 7,
        booking_credits_per_period: 10,
        guest_passes_per_period: 2,
        discount_pct: 15,
        priority_booking_days: 7,
        max_active_members: 50,
        is_active: true,
        stripe_price_id: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
    },
];

function setupMocks(overrides: Record<string, unknown> = {}) {
    mockUseListMembershipPlans.mockReturnValue({
        data: mockPlans,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
        ...overrides,
    });
    mockUseClubAccess.mockReturnValue({ clubId: "club-1", role: "owner" });
}

describe("MembershipPlansContainer — loading state", () => {
    it("renders loading indicator", () => {
        mockUseListMembershipPlans.mockReturnValue({
            data: [],
            isLoading: true,
            error: null,
            refetch: mockRefetch,
        });
        mockUseClubAccess.mockReturnValue({ clubId: "club-1", role: "owner" });
        render(<MembershipPlansContainer />);
        expect(screen.getByText("Loading membership plans…")).toBeInTheDocument();
    });
});

describe("MembershipPlansContainer — error state", () => {
    it("renders error message", () => {
        mockUseListMembershipPlans.mockReturnValue({
            data: [],
            isLoading: false,
            error: new Error("Network error"),
            refetch: mockRefetch,
        });
        mockUseClubAccess.mockReturnValue({ clubId: "club-1", role: "owner" });
        render(<MembershipPlansContainer />);
        expect(screen.getByText("Network error")).toBeInTheDocument();
    });
});

describe("MembershipPlansContainer — plans list", () => {
    it("renders all plans", () => {
        setupMocks();
        render(<MembershipPlansContainer />);
        expect(screen.getByText("Gold Member")).toBeInTheDocument();
    });
});

describe("MembershipPlansContainer — navigation", () => {
    beforeEach(() => {
        mockNavigate.mockReset();
    });

    it("navigates to new plan page when Add Plan is clicked", () => {
        setupMocks({ data: [] });
        render(<MembershipPlansContainer />);
        const buttons = screen.getAllByText("Add Plan");
        fireEvent.click(buttons[buttons.length - 1]!);
        expect(mockNavigate).toHaveBeenCalledWith({ to: "/membership-plans/new" });
    });

    it("navigates to edit page when Edit is clicked on a plan", () => {
        setupMocks();
        render(<MembershipPlansContainer />);
        fireEvent.click(screen.getByLabelText("Edit Gold Member"));
        expect(mockNavigate).toHaveBeenCalledWith({
            to: "/membership-plans/$planId",
            params: { planId: "plan-1" },
        });
    });

    it("does not show Add Plan for non-admin roles", () => {
        mockUseListMembershipPlans.mockReturnValue({
            data: [],
            isLoading: false,
            error: null,
            refetch: mockRefetch,
        });
        mockUseClubAccess.mockReturnValue({ clubId: "club-1", role: "staff" });
        render(<MembershipPlansContainer />);
        expect(screen.queryByText("Add Plan")).not.toBeInTheDocument();
    });
});

describe("MembershipPlansContainer — refresh", () => {
    it("calls refetch when Refresh button is clicked", () => {
        setupMocks();
        render(<MembershipPlansContainer />);
        fireEvent.click(screen.getByRole("button", { name: "Refresh membership plans" }));
        expect(mockRefetch).toHaveBeenCalled();
    });
});
