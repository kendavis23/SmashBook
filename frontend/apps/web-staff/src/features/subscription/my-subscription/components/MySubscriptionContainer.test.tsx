import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import MySubscriptionContainer from "./MySubscriptionContainer";

const mockRefetch = vi.fn();

vi.mock("../../hooks", () => ({
    useGetSubscription: vi.fn(),
}));

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

import { useGetSubscription } from "../../hooks";
const mockUseGetSubscription = useGetSubscription as ReturnType<typeof vi.fn>;

const mockSubscription = {
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

beforeEach(() => {
    vi.clearAllMocks();
    mockRefetch.mockReset();
});

describe("MySubscriptionContainer — loading state", () => {
    it("renders loading indicator", () => {
        mockUseGetSubscription.mockReturnValue({
            data: undefined,
            isLoading: true,
            error: null,
            refetch: mockRefetch,
        });
        render(<MySubscriptionContainer />);
        expect(screen.getByText("Loading subscription…")).toBeInTheDocument();
    });
});

describe("MySubscriptionContainer — error state", () => {
    it("renders error message", () => {
        mockUseGetSubscription.mockReturnValue({
            data: undefined,
            isLoading: false,
            error: new Error("Network error"),
            refetch: mockRefetch,
        });
        render(<MySubscriptionContainer />);
        expect(screen.getByText("Network error")).toBeInTheDocument();
    });
});

describe("MySubscriptionContainer — success state", () => {
    it("renders plan name", () => {
        mockUseGetSubscription.mockReturnValue({
            data: mockSubscription,
            isLoading: false,
            error: null,
            refetch: mockRefetch,
        });
        render(<MySubscriptionContainer />);
        expect(screen.getByText("Pro")).toBeInTheDocument();
    });
});

describe("MySubscriptionContainer — refresh", () => {
    it("calls refetch when Refresh is clicked", () => {
        mockUseGetSubscription.mockReturnValue({
            data: mockSubscription,
            isLoading: false,
            error: null,
            refetch: mockRefetch,
        });
        render(<MySubscriptionContainer />);
        fireEvent.click(screen.getByRole("button", { name: "Refresh subscription" }));
        expect(mockRefetch).toHaveBeenCalled();
    });
});
