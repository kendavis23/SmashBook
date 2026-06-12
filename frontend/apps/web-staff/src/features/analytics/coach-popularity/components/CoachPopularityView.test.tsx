import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CoachPopularityView from "./CoachPopularityView";
import type { CoachPopularitySummary } from "../coachPopularitySummary";
import type { CoachPopularityLeaderboard, CoachPopularityRow } from "../../types";

vi.mock("@repo/ui", () => ({
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
    formatCurrency: (v: number) => `£${Number(v).toFixed(2)}`,
    Pagination: () => <nav aria-label="pagination" />,
    SelectInput: ({
        value,
        options,
        onValueChange,
        "aria-label": ariaLabel,
    }: {
        value: string;
        options: { value: string; label: string }[];
        onValueChange: (v: string) => void;
        "aria-label"?: string;
    }) => (
        <select
            aria-label={ariaLabel}
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
        >
            {options.map((o) => (
                <option key={o.value} value={o.value}>
                    {o.label}
                </option>
            ))}
        </select>
    ),
}));

function row(overrides: Partial<CoachPopularityRow> = {}): CoachPopularityRow {
    return {
        staff_profile_id: "sp-1",
        user_id: "u-1",
        coach_name: "Jane Coach",
        is_active: true,
        sessions: 12,
        first_session_at: "2026-01-01",
        last_session_at: "2026-06-01",
        sessions_last_30d: 3,
        sessions_last_90d: 7,
        distinct_players: 9,
        repeat_players: 5,
        return_rate: 0.55,
        total_attendances: 40,
        lesson_revenue: 320,
        currency: "GBP",
        ...overrides,
    };
}

function board(rows: CoachPopularityRow[]): CoachPopularityLeaderboard {
    return {
        club_id: "club-1",
        sort: "sessions",
        limit: 10,
        offset: 0,
        total_records: rows.length,
        rows,
    };
}

const filledSummary: CoachPopularitySummary = {
    coachCount: 1,
    totalSessions: 12,
    totalDistinctPlayers: 9,
    totalLessonRevenue: 320,
    avgReturnRatePct: 55.6,
    isEmpty: false,
};

const emptySummary: CoachPopularitySummary = {
    coachCount: 0,
    totalSessions: 0,
    totalDistinctPlayers: 0,
    totalLessonRevenue: 0,
    avgReturnRatePct: 0,
    isEmpty: true,
};

function renderView(overrides: Partial<Parameters<typeof CoachPopularityView>[0]> = {}) {
    const props = {
        summary: filledSummary,
        value: board([row()]),
        topSessions: board([row()]),
        topReturnRate: board([row()]),
        topRecentlyActive: board([row()]),
        sort: "sessions" as const,
        page: 0,
        totalPages: 1,
        totalItems: 1,
        isLoading: false,
        error: null,
        onSortChange: vi.fn(),
        onPageChange: vi.fn(),
        onRefresh: vi.fn(),
        ...overrides,
    };
    render(<CoachPopularityView {...props} />);
    return props;
}

describe("CoachPopularityView", () => {
    it("renders the title", () => {
        renderView();
        expect(screen.getByText("Coach Popularity")).toBeInTheDocument();
    });

    it("renders the error branch", () => {
        renderView({ error: new Error("boom") });
        expect(screen.getByText(/Failed to load coach analytics/)).toBeInTheDocument();
        expect(screen.getByText(/boom/)).toBeInTheDocument();
    });

    it("renders the loading branch", () => {
        renderView({ isLoading: true });
        expect(screen.getByText("Loading coach analytics…")).toBeInTheDocument();
    });

    it("renders the empty branch", () => {
        renderView({ summary: emptySummary, value: board([]) });
        expect(screen.getByText("No coach data yet")).toBeInTheDocument();
    });

    it("renders the KPI cards and the active sort heading in the dashboard branch", () => {
        renderView();
        expect(screen.getByText("Total Sessions")).toBeInTheDocument();
        expect(screen.getByText("Top by Sessions")).toBeInTheDocument();
        // The active coach name renders in both the table and the leaderboard panels.
        expect(screen.getAllByText("Jane Coach").length).toBeGreaterThan(0);
    });

    it("calls onRefresh when Refresh is clicked", () => {
        const props = renderView();
        fireEvent.click(screen.getByLabelText("Refresh analytics"));
        expect(props.onRefresh).toHaveBeenCalledTimes(1);
    });

    it("calls onSortChange from the sort dropdown", () => {
        const props = renderView();
        fireEvent.change(screen.getByLabelText("Coach leaderboard sort"), {
            target: { value: "return_rate" },
        });
        expect(props.onSortChange).toHaveBeenCalledWith("return_rate");
    });

    it("calls onSortChange from a leaderboard panel View all button", () => {
        const props = renderView();
        // Non-active panels render a "View all" button; clicking it changes the sort.
        const [viewAll] = screen.getAllByText("View all");
        fireEvent.click(viewAll as HTMLElement);
        expect(props.onSortChange).toHaveBeenCalled();
    });
});
