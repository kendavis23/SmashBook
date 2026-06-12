import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PlayerValueView from "./PlayerValueView";
import type { PlayerValueSummary } from "../playerValueSummary";
import type { PlayerValueRow, PlayerValueLeaderboard } from "../../types";

vi.mock("@repo/ui", () => ({
    formatCurrency: (n: number | string | null | undefined) => (n == null ? "—" : `₹${n}`),
    Toggle: ({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) => (
        <button role="switch" aria-checked={checked} onClick={() => onChange(!checked)}>
            Members only
        </button>
    ),
    MONTHS_SHORT: [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
    ],
    Pagination: ({ totalItems }: { totalItems: number }) => (
        <div data-testid="pagination">{totalItems} items</div>
    ),
}));

function row(o: Partial<PlayerValueRow>): PlayerValueRow {
    return {
        user_id: "u1",
        full_name: "Arjun Mehta",
        email: "arjun@x.com",
        is_paid_member: true,
        membership_plan_name: "Premium Plus",
        first_played_at: "2023-01-12",
        last_played_at: "2026-06-02",
        bookings_played: 48,
        played_last_30d: 12,
        played_last_90d: 26,
        lifetime_gross: 81250,
        lifetime_refunds: 2800,
        lifetime_spend: 78450,
        payments_count: 24,
        currency: "INR",
        recency_score: null,
        frequency_score: null,
        value_score: null,
        rfv_total: null,
        rfv_cell: null,
        ...o,
    };
}

const value: PlayerValueLeaderboard = {
    club_id: "c1",
    members_only: false,
    sort: "lifetime_spend",
    limit: 10,
    offset: 0,
    total_records: 2,
    rows: [row({}), row({ user_id: "u2", full_name: "Rohan Sharma" })],
};

const summary: PlayerValueSummary = {
    totalBookings: 1842,
    totalLifetimeSpend: 1874560,
    isEmpty: false,
};

const baseProps = {
    summary,
    value,
    topLifetimeSpend: value,
    topBookingsPlayed: {
        ...value,
        sort: "bookings_played" as const,
        rows: [row({ user_id: "u3", full_name: "Priya Kapoor", bookings_played: 72 })],
    },
    topRecentlyPlayed: {
        ...value,
        sort: "last_played_at" as const,
        rows: [row({ user_id: "u4", full_name: "Maya Shah", last_played_at: "2026-06-03" })],
    },
    tab: "value" as const,
    membersOnly: false,
    sort: "lifetime_spend" as const,
    page: 0,
    totalPages: 1,
    totalItems: 2,
    isLoading: false,
    error: null,
    onTabChange: vi.fn(),
    onMembersOnlyChange: vi.fn(),
    onSortChange: vi.fn(),
    onPageChange: vi.fn(),
    onRefresh: vi.fn(),
};

describe("PlayerValueView — state branches", () => {
    it("renders the loading spinner", () => {
        render(<PlayerValueView {...baseProps} isLoading={true} />);
        expect(screen.getByText("Loading player analytics…")).toBeInTheDocument();
    });

    it("renders the error message", () => {
        render(<PlayerValueView {...baseProps} error={new Error("boom")} />);
        expect(screen.getByText(/Failed to load player analytics/)).toBeInTheDocument();
        expect(screen.getByText(/boom/)).toBeInTheDocument();
    });

    it("renders the empty state when summary is empty", () => {
        render(<PlayerValueView {...baseProps} summary={{ ...summary, isEmpty: true }} />);
        expect(screen.getByText("No player data yet")).toBeInTheDocument();
    });
});

describe("PlayerValueView — dashboard", () => {
    it("renders the title, members filter, and top panels", () => {
        render(<PlayerValueView {...baseProps} />);
        expect(screen.getByText("Player Value")).toBeInTheDocument();
        expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
        expect(screen.getByText("Top 5 Lifetime Spend")).toBeInTheDocument();
        expect(screen.getByText("Top 5 Bookings Played")).toBeInTheDocument();
        expect(screen.getByText("Top 5 Recently Played")).toBeInTheDocument();
    });

    it("renders the detail table with pagination", () => {
        render(<PlayerValueView {...baseProps} />);
        expect(screen.getByTestId("pagination")).toHaveTextContent("2 items");
    });

    it("fires onRefresh when Refresh is clicked", () => {
        const onRefresh = vi.fn();
        render(<PlayerValueView {...baseProps} onRefresh={onRefresh} />);
        fireEvent.click(screen.getByLabelText("Refresh analytics"));
        expect(onRefresh).toHaveBeenCalledOnce();
    });

    it("fires filter and panel view changes", () => {
        const onSortChange = vi.fn();
        const onMembersOnlyChange = vi.fn();
        render(
            <PlayerValueView
                {...baseProps}
                onSortChange={onSortChange}
                onMembersOnlyChange={onMembersOnlyChange}
            />
        );
        fireEvent.click(screen.getByRole("switch"));
        const bookingsPanel = screen.getByText("Top 5 Bookings Played").closest("section");
        if (!bookingsPanel) throw new Error("Expected bookings panel");
        const bookingsViewButton = within(bookingsPanel).getByRole("button", {
            name: "View all",
        });
        fireEvent.click(bookingsViewButton);
        expect(onMembersOnlyChange).toHaveBeenCalledWith(true);
        expect(onSortChange).toHaveBeenCalledWith("bookings_played");
    });
});
