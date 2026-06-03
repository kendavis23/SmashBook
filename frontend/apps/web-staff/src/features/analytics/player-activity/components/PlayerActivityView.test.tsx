import type { ComponentProps } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PlayerActivityView from "./PlayerActivityView";
import type { PlayerActivitySummary } from "../playerActivitySummary";
import type { ActivePlayersTimeseries, SignupsTimeseries } from "../../types";

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

vi.mock("../../components/DateRangeControl", () => ({
    DateRangeControl: ({ onChange }: { onChange: (r: { from: string; to: string }) => void }) => (
        <button onClick={() => onChange({ from: "2026-05-01", to: "2026-05-31" })}>
            change-range
        </button>
    ),
}));

vi.mock("./ActivePlayersLineChart", () => ({
    ActivePlayersLineChart: ({ points }: { points: unknown[] }) => (
        <div data-testid="line-chart">{points.length} active points</div>
    ),
}));

vi.mock("../../club-utilisation/components/GroupedBarChart", () => ({
    GroupedBarChart: ({ groups }: { groups: string[] }) => (
        <div data-testid="bar-chart">{groups.join(",")}</div>
    ),
}));

const baseSummary: PlayerActivitySummary = {
    activePlayers: 120,
    windowDays: 30,
    totalSignups: 18,
    avgSignupsPerPeriod: 0.6,
    peakActivePlayers: 14,
    troughActivePlayers: 6,
    activeNetChange: 6,
    activeNetChangePct: 75,
    periodCount: 30,
    isEmpty: false,
};

const activeSeries: ActivePlayersTimeseries = {
    club_id: "c1",
    granularity: "day",
    date_from: "2026-05-04",
    date_to: "2026-06-02",
    points: [
        { period_start: "2026-05-04", active_players: 8 },
        { period_start: "2026-05-05", active_players: 14 },
    ],
};

const signupsSeries: SignupsTimeseries = {
    club_id: "c1",
    granularity: "day",
    date_from: "2026-05-04",
    date_to: "2026-06-02",
    total_signups: 5,
    points: [
        { period_start: "2026-05-04", signups: 2 },
        { period_start: "2026-05-05", signups: 3 },
    ],
};

function renderView(overrides: Partial<ComponentProps<typeof PlayerActivityView>> = {}) {
    const props: ComponentProps<typeof PlayerActivityView> = {
        range: { from: "2026-05-04", to: "2026-06-02" },
        granularity: "day",
        summary: baseSummary,
        activeSeries,
        signupsSeries,
        isLoading: false,
        error: null,
        onRangeChange: vi.fn(),
        onGranularityChange: vi.fn(),
        onRefresh: vi.fn(),
        ...overrides,
    };
    render(<PlayerActivityView {...props} />);
    return props;
}

describe("PlayerActivityView", () => {
    it("renders the title and both chart sections", () => {
        renderView();
        expect(screen.getByText("Player Activity & Growth")).toBeInTheDocument();
        expect(screen.getByText("Active Players Over Time")).toBeInTheDocument();
        expect(screen.getByText("New Signups Over Time")).toBeInTheDocument();
        expect(screen.getByTestId("line-chart")).toBeInTheDocument();
        expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
    });

    it("renders the error branch", () => {
        renderView({ error: new Error("boom") });
        expect(screen.getByText(/Failed to load player activity/)).toBeInTheDocument();
        expect(screen.queryByText("Active Players Over Time")).not.toBeInTheDocument();
    });

    it("renders the loading branch", () => {
        renderView({ isLoading: true });
        expect(screen.getByText("Loading player activity…")).toBeInTheDocument();
    });

    it("renders the empty branch", () => {
        renderView({ summary: { ...baseSummary, isEmpty: true } });
        expect(screen.getByText("No activity for this period")).toBeInTheDocument();
    });

    it("shows a no-signups note when the signups series is empty", () => {
        renderView({ signupsSeries: { ...signupsSeries, total_signups: 0, points: [] } });
        expect(screen.getByText("No signups in this period.")).toBeInTheDocument();
        expect(screen.queryByTestId("bar-chart")).not.toBeInTheDocument();
    });

    it("fires onRefresh when Refresh is clicked", () => {
        const props = renderView();
        fireEvent.click(screen.getByLabelText("Refresh analytics"));
        expect(props.onRefresh).toHaveBeenCalledTimes(1);
    });

    it("fires onGranularityChange when the granularity select changes", () => {
        const props = renderView();
        fireEvent.change(screen.getByLabelText("Timeseries granularity"), {
            target: { value: "month" },
        });
        expect(props.onGranularityChange).toHaveBeenCalledWith("month");
    });

    it("fires onRangeChange when the date range changes", () => {
        const props = renderView();
        fireEvent.click(screen.getByText("change-range"));
        expect(props.onRangeChange).toHaveBeenCalledWith({ from: "2026-05-01", to: "2026-05-31" });
    });
});
