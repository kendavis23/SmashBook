import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { InactiveMembersReport, PlayerActivityLeaderboard, PlayerValueRow } from "../../types";
import type { PlayerEngagementSummary } from "../playerEngagementSummary";
import PlayerEngagementView from "./PlayerEngagementView";

vi.mock("@repo/ui", () => ({
    formatCurrency: (n: number | string | null | undefined) => (n == null ? "—" : `₹${n}`),
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
        full_name: "Rohit Bhamore",
        email: "rohit@example.com",
        is_paid_member: true,
        membership_plan_name: "Platinum",
        first_played_at: "2026-03-02",
        last_played_at: "2026-06-02",
        bookings_played: 372,
        played_last_30d: 130,
        played_last_90d: 369,
        lifetime_gross: 1200,
        lifetime_refunds: 0,
        lifetime_spend: 1200,
        payments_count: 4,
        currency: "GBP",
        recency_score: null,
        frequency_score: null,
        value_score: null,
        rfv_total: null,
        rfv_cell: null,
        ...o,
    };
}

const mostActive: PlayerActivityLeaderboard = {
    club_id: "club-1",
    window_days: 30,
    limit: 250,
    offset: 0,
    total_records: 1,
    rows: [row({})],
};

const inactive: InactiveMembersReport = {
    club_id: "club-1",
    inactive_days: 30,
    cutoff: "2026-04-19",
    member_count: 6,
    inactive_count: 1,
    total_records: 1,
    limit: 250,
    offset: 0,
    rows: [row({ user_id: "u2", full_name: "Alice Hartley" })],
};

const summary: PlayerEngagementSummary = {
    totalPaidMembers: 6,
    playedRecently: 1,
    playedRecentlyPct: 16.67,
    inactiveMembers: 1,
    inactivePct: 16.67,
    isEmpty: false,
};

const baseProps = {
    summary,
    mostActive,
    inactive,
    tab: "most-active" as const,
    windowDays: 30 as const,
    isLoading: false,
    error: null,
    onTabChange: vi.fn(),
    onWindowDaysChange: vi.fn(),
    onRefresh: vi.fn(),
};

describe("PlayerEngagementView", () => {
    it("renders compact KPI cards, dynamic labels, and the shared full table", () => {
        render(<PlayerEngagementView {...baseProps} />);

        expect(screen.queryByText("Total Paid Members")).not.toBeInTheDocument();
        expect(screen.getByText("Played in Last 30 Days")).toBeInTheDocument();
        expect(screen.getAllByText("Inactive Members (30+ Days)").length).toBeGreaterThan(1);
        expect(screen.getByText("Top 5 Active Players (Last 30 Days)")).toBeInTheDocument();
        expect(screen.getByText("Lifetime Spend")).toBeInTheDocument();
        expect(screen.getByText("Payments")).toBeInTheDocument();
    });

    it("uses the selected window's booking count in the top active mini-panel", () => {
        render(<PlayerEngagementView {...baseProps} windowDays={90} />);

        const panel = screen.getByText("Top 5 Active Players (Last 90 Days)").closest("section");
        expect(panel).not.toBeNull();
        expect(within(panel as HTMLElement).getByText("369")).toBeInTheDocument();
    });

    it("emits 30 or 90 day window changes", () => {
        const onWindowDaysChange = vi.fn();
        render(<PlayerEngagementView {...baseProps} onWindowDaysChange={onWindowDaysChange} />);

        fireEvent.click(screen.getByRole("button", { name: "90d" }));

        expect(onWindowDaysChange).toHaveBeenCalledWith(90);
    });
});
