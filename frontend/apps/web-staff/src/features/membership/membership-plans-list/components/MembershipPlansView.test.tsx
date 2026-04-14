import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MembershipPlansView from "./MembershipPlansView";
import type { MembershipPlan } from "../../types";

vi.mock("@repo/ui", () => ({
    Breadcrumb: ({ items }: { items: { label: string }[] }) => (
        <nav>
            {items.map((i) => (
                <span key={i.label}>{i.label}</span>
            ))}
        </nav>
    ),
}));

const mockPlans: MembershipPlan[] = [
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
    {
        id: "plan-2",
        club_id: "club-1",
        name: "Silver Member",
        description: null,
        billing_period: "annual",
        price: 399.0,
        trial_days: 0,
        booking_credits_per_period: null,
        guest_passes_per_period: null,
        discount_pct: null,
        priority_booking_days: null,
        max_active_members: null,
        is_active: false,
        stripe_price_id: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
    },
];

const firstPlan = mockPlans[0];
if (!firstPlan) throw new Error("Expected at least one mock plan");

const defaultProps = {
    plans: [],
    isLoading: false,
    error: null,
    canManagePlans: true,
    onCreateClick: vi.fn(),
    onEditPlan: vi.fn(),
    onRefresh: vi.fn(),
};

describe("MembershipPlansView — loading state", () => {
    it("shows loading spinner", () => {
        render(<MembershipPlansView {...defaultProps} isLoading={true} />);
        expect(screen.getByText("Loading membership plans…")).toBeInTheDocument();
    });
});

describe("MembershipPlansView — error state", () => {
    it("shows error message", () => {
        render(<MembershipPlansView {...defaultProps} error={new Error("Network error")} />);
        expect(screen.getByText("Network error")).toBeInTheDocument();
    });
});

describe("MembershipPlansView — empty state", () => {
    it("shows empty state message", () => {
        render(<MembershipPlansView {...defaultProps} />);
        expect(screen.getByText("No membership plans yet")).toBeInTheDocument();
    });

    it("shows Add Plan button in empty state for admin", () => {
        render(<MembershipPlansView {...defaultProps} />);
        expect(screen.getAllByText("Add Plan").length).toBeGreaterThan(0);
    });

    it("calls onCreateClick from empty state button", () => {
        const handleCreate = vi.fn();
        render(<MembershipPlansView {...defaultProps} onCreateClick={handleCreate} />);
        const buttons = screen.getAllByText("Add Plan");
        fireEvent.click(buttons[buttons.length - 1]!);
        expect(handleCreate).toHaveBeenCalled();
    });

    it("does not show Add Plan in empty state for non-admin", () => {
        render(<MembershipPlansView {...defaultProps} canManagePlans={false} />);
        expect(screen.queryByText("Add Plan")).not.toBeInTheDocument();
    });
});

describe("MembershipPlansView — header", () => {
    it("shows Refresh button", () => {
        render(<MembershipPlansView {...defaultProps} />);
        expect(
            screen.getByRole("button", { name: "Refresh membership plans" })
        ).toBeInTheDocument();
    });

    it("calls onRefresh when Refresh is clicked", () => {
        const handleRefresh = vi.fn();
        render(<MembershipPlansView {...defaultProps} onRefresh={handleRefresh} />);
        fireEvent.click(screen.getByRole("button", { name: "Refresh membership plans" }));
        expect(handleRefresh).toHaveBeenCalled();
    });

    it("shows Add Plan in header for admin", () => {
        render(<MembershipPlansView {...defaultProps} plans={mockPlans} />);
        expect(screen.getByText("Add Plan")).toBeInTheDocument();
    });

    it("does not show Add Plan in header for non-admin", () => {
        render(<MembershipPlansView {...defaultProps} plans={mockPlans} canManagePlans={false} />);
        expect(screen.queryByText("Add Plan")).not.toBeInTheDocument();
    });

    it("shows summary count when plans exist", () => {
        render(<MembershipPlansView {...defaultProps} plans={mockPlans} />);
        expect(screen.getByText("1 active · 2 total")).toBeInTheDocument();
    });

    it("calls onCreateClick from header Add Plan button", () => {
        const handleCreate = vi.fn();
        render(
            <MembershipPlansView {...defaultProps} plans={mockPlans} onCreateClick={handleCreate} />
        );
        fireEvent.click(screen.getByText("Add Plan"));
        expect(handleCreate).toHaveBeenCalled();
    });
});

describe("MembershipPlansView — plans list", () => {
    it("renders plan names", () => {
        render(<MembershipPlansView {...defaultProps} plans={mockPlans} />);
        expect(screen.getByText("Gold Member")).toBeInTheDocument();
        expect(screen.getByText("Silver Member")).toBeInTheDocument();
    });

    it("renders active and inactive status badges", () => {
        render(<MembershipPlansView {...defaultProps} plans={mockPlans} />);
        expect(screen.getByText("Active")).toBeInTheDocument();
        expect(screen.getByText("Inactive")).toBeInTheDocument();
    });

    it("renders price prominently", () => {
        render(<MembershipPlansView {...defaultProps} plans={mockPlans} />);
        expect(screen.getByText("€49.99")).toBeInTheDocument();
        expect(screen.getByText("€399.00")).toBeInTheDocument();
    });

    it("renders trial badge when plan has trial days", () => {
        render(<MembershipPlansView {...defaultProps} plans={mockPlans} />);
        expect(screen.getByText("7d free trial")).toBeInTheDocument();
    });

    it("renders discount badge when plan has discount", () => {
        render(<MembershipPlansView {...defaultProps} plans={mockPlans} />);
        expect(screen.getByText("15% off")).toBeInTheDocument();
    });

    it("shows plan description when present", () => {
        render(<MembershipPlansView {...defaultProps} plans={mockPlans} />);
        expect(screen.getByText("Full access plan")).toBeInTheDocument();
    });

    it("calls onEditPlan with correct plan when Edit is clicked", () => {
        const handleEdit = vi.fn();
        render(<MembershipPlansView {...defaultProps} plans={mockPlans} onEditPlan={handleEdit} />);
        fireEvent.click(screen.getByLabelText("Edit Gold Member"));
        expect(handleEdit).toHaveBeenCalledWith(firstPlan);
    });

    it("does not show Edit buttons for non-admin", () => {
        render(<MembershipPlansView {...defaultProps} plans={mockPlans} canManagePlans={false} />);
        expect(screen.queryByRole("button", { name: /edit/i })).not.toBeInTheDocument();
    });

    it("shows unlimited members label when max_active_members is null", () => {
        render(<MembershipPlansView {...defaultProps} plans={mockPlans} />);
        expect(screen.getByText("Unlimited members")).toBeInTheDocument();
    });

    it("shows capped member count when max_active_members is set", () => {
        render(<MembershipPlansView {...defaultProps} plans={mockPlans} />);
        expect(screen.getByText("Up to 50 members")).toBeInTheDocument();
    });
});
