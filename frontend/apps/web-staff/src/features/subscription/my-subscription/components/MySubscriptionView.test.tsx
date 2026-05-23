import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MySubscriptionView from "./MySubscriptionView";
import type { Subscription } from "../../types";

vi.mock("@repo/ui", () => ({
    Breadcrumb: ({ items }: { items: { label: string }[] }) => (
        <nav>
            {items.map((i) => (
                <span key={i.label}>{i.label}</span>
            ))}
        </nav>
    ),
    formatUTCDate: (iso: string) => iso.split("T")[0] ?? iso,
}));

const mockSubscription: Subscription = {
    plan_id: "plan-uuid",
    plan_name: "Pro",
    price_per_month: 99,
    limits: { max_clubs: 5, max_courts_per_club: 10, max_staff_users: 20 },
    usage: { clubs_used: 1, courts_used: 3, staff_used: 4 },
    features: { open_games: true, waitlist: false, white_label: false, analytics: true },
    is_active: true,
    subscription_status: "active",
    subscription_start_date: "2026-01-01T00:00:00Z",
    current_period_end: "2026-06-01T00:00:00Z",
    has_payment_method: true,
};

const defaultProps = {
    subscription: mockSubscription,
    isLoading: false,
    error: null,
    onRefresh: vi.fn(),
};

describe("MySubscriptionView — loading state", () => {
    it("shows loading spinner", () => {
        render(<MySubscriptionView {...defaultProps} isLoading={true} subscription={null} />);
        expect(screen.getByText("Loading subscription…")).toBeInTheDocument();
    });
});

describe("MySubscriptionView — error state", () => {
    it("shows error message", () => {
        render(
            <MySubscriptionView
                {...defaultProps}
                error={new Error("Failed to load")}
                subscription={null}
            />
        );
        expect(screen.getByText("Failed to load")).toBeInTheDocument();
    });
});

describe("MySubscriptionView — header", () => {
    it("shows Refresh button", () => {
        render(<MySubscriptionView {...defaultProps} />);
        expect(screen.getByRole("button", { name: "Refresh subscription" })).toBeInTheDocument();
    });

    it("calls onRefresh when Refresh is clicked", () => {
        const handleRefresh = vi.fn();
        render(<MySubscriptionView {...defaultProps} onRefresh={handleRefresh} />);
        fireEvent.click(screen.getByRole("button", { name: "Refresh subscription" }));
        expect(handleRefresh).toHaveBeenCalled();
    });

    it("shows breadcrumb with My Plan only (no Subscription segment)", () => {
        render(<MySubscriptionView {...defaultProps} />);
        expect(screen.getAllByText("My Plan").length).toBeGreaterThan(0);
        expect(screen.queryByText("Subscription")).not.toBeInTheDocument();
    });

    it("shows status badge for active plan", () => {
        render(<MySubscriptionView {...defaultProps} />);
        expect(screen.getByText("Active")).toBeInTheDocument();
    });
});

describe("MySubscriptionView — plan details", () => {
    it("renders plan name and price", () => {
        render(<MySubscriptionView {...defaultProps} />);
        expect(screen.getByText("Pro")).toBeInTheDocument();
        expect(screen.getByText("£99.00 / month")).toBeInTheDocument();
    });

    it("shows payment method on file", () => {
        render(<MySubscriptionView {...defaultProps} />);
        expect(screen.getByText("On file")).toBeInTheDocument();
    });

    it("shows warning when no payment method", () => {
        render(
            <MySubscriptionView
                {...defaultProps}
                subscription={{ ...mockSubscription, has_payment_method: false }}
            />
        );
        expect(screen.getByText("Not set up")).toBeInTheDocument();
    });

    it("renders period end date", () => {
        render(<MySubscriptionView {...defaultProps} />);
        expect(screen.getByText("2026-06-01")).toBeInTheDocument();
    });
});

describe("MySubscriptionView — usage section", () => {
    it("renders clubs, courts, staff usage", () => {
        render(<MySubscriptionView {...defaultProps} />);
        expect(screen.getByText("Clubs")).toBeInTheDocument();
        expect(screen.getByText("Courts")).toBeInTheDocument();
        expect(screen.getByText("Staff users")).toBeInTheDocument();
    });

    it("renders usage counts", () => {
        render(<MySubscriptionView {...defaultProps} />);
        expect(screen.getByText("1 / 5")).toBeInTheDocument();
        expect(screen.getByText("3 / 10")).toBeInTheDocument();
        expect(screen.getByText("4 / 20")).toBeInTheDocument();
    });
});

describe("MySubscriptionView — features section", () => {
    it("renders all four feature flags", () => {
        render(<MySubscriptionView {...defaultProps} />);
        expect(screen.getByText("Open Games")).toBeInTheDocument();
        expect(screen.getByText("Waitlist")).toBeInTheDocument();
        expect(screen.getByText("White Label")).toBeInTheDocument();
        expect(screen.getByText("Analytics")).toBeInTheDocument();
    });
});
