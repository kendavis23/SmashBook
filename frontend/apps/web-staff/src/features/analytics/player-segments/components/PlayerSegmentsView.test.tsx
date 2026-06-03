import { render, screen, fireEvent } from "@testing-library/react";
import type { InputHTMLAttributes } from "react";
import { describe, expect, it, vi } from "vitest";
import PlayerSegmentsView from "./PlayerSegmentsView";
import type { SegmentSummary } from "../playerSegmentsSummary";

vi.mock("@repo/ui", () => ({
    formatCurrency: (n: number | string | null | undefined) => (n == null ? "—" : `₹${n}`),
    NumberInput: (props: InputHTMLAttributes<HTMLInputElement>) => (
        <input type="number" {...props} />
    ),
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

vi.mock("../../club-utilisation/components/GroupedBarChart", () => ({
    GroupedBarChart: ({ groups }: { groups: string[] }) => (
        <div data-testid="bar-chart">{groups.join(",")}</div>
    ),
}));

const baseSummary: SegmentSummary = {
    rows: [
        {
            groupKey: "premium-plus",
            groupLabel: "Premium Plus",
            players: 94,
            paidMembers: 94,
            paidMemberPct: 100,
            totalLifetimeSpend: 271560,
            avgLifetimeSpend: 2889,
            totalLifetimeRefunds: 9450,
            totalBookingsPlayed: 512,
            playerSharePct: 38.2,
        },
        {
            groupKey: "free",
            groupLabel: "Free",
            players: 10,
            paidMembers: 0,
            paidMemberPct: 0,
            totalLifetimeSpend: 13470,
            avgLifetimeSpend: 1347,
            totalLifetimeRefunds: 440,
            totalBookingsPlayed: 48,
            playerSharePct: 4.1,
        },
    ],
    totalPlayers: 104,
    totalPaidMembers: 94,
    paidMemberPct: 90.38,
    totalLifetimeSpend: 285030,
    avgLifetimeSpendPerPlayer: 2740,
    totalLifetimeRefunds: 9890,
    totalBookingsPlayed: 560,
    currency: "INR",
    isEmpty: false,
};

const emptySummary: SegmentSummary = {
    rows: [],
    totalPlayers: 0,
    totalPaidMembers: 0,
    paidMemberPct: 0,
    totalLifetimeSpend: 0,
    avgLifetimeSpendPerPlayer: 0,
    totalLifetimeRefunds: 0,
    totalBookingsPlayed: 0,
    currency: null,
    isEmpty: true,
};

function renderView(overrides: Partial<Parameters<typeof PlayerSegmentsView>[0]> = {}) {
    const props = {
        summary: baseSummary,
        dimension: "membership_tier" as const,
        inactiveDays: 30,
        isLoading: false,
        error: null,
        onDimensionChange: vi.fn(),
        onInactiveDaysChange: vi.fn(),
        onRefresh: vi.fn(),
        ...overrides,
    };
    render(<PlayerSegmentsView {...props} />);
    return props;
}

describe("PlayerSegmentsView — state branches", () => {
    it("renders the loading state", () => {
        renderView({ isLoading: true });
        expect(screen.getByText("Loading player segments…")).toBeInTheDocument();
    });

    it("renders the error state with the message", () => {
        renderView({ error: new Error("boom") });
        expect(screen.getByText(/Failed to load player segments/)).toBeInTheDocument();
        expect(screen.getByText(/boom/)).toBeInTheDocument();
    });

    it("renders the empty state", () => {
        renderView({ summary: emptySummary });
        expect(screen.getByText("No segment data yet")).toBeInTheDocument();
    });
});

describe("PlayerSegmentsView — dashboard", () => {
    it("renders the title and the chart sections", () => {
        renderView();
        expect(screen.getByText("Player Segments")).toBeInTheDocument();
        expect(screen.getByText("Players by Membership Tier")).toBeInTheDocument();
        expect(screen.getByText("Total Lifetime Spend by Membership Tier")).toBeInTheDocument();
        expect(screen.getByText("Performance by Membership Tier")).toBeInTheDocument();
    });

    it("renders KPI cards and the table rows", () => {
        renderView();
        // "Net of refunds" / "Per player" are unique KPI captions (the labels
        // themselves collide with the table headers).
        expect(screen.getByText("Net of refunds")).toBeInTheDocument();
        expect(screen.getByText("Per player")).toBeInTheDocument();
        expect(screen.getAllByText("Premium Plus").length).toBeGreaterThan(0);
        expect(screen.getByTestId("bar-chart")).toHaveTextContent("Premium Plus,Free");
    });
});

describe("PlayerSegmentsView — controls", () => {
    it("hides the inactivity threshold unless dimension is activity_status", () => {
        renderView();
        expect(screen.queryByLabelText("Inactivity threshold")).not.toBeInTheDocument();
    });

    it("shows the inactivity threshold number input for activity_status", () => {
        renderView({ dimension: "activity_status" });
        const input = screen.getByLabelText("Inactivity threshold");
        expect(input).toBeInTheDocument();
        expect(input).toHaveAttribute("min", "1");
        expect(input).toHaveAttribute("max", "365");
    });

    it("fires onDimensionChange when the dimension changes", () => {
        const props = renderView();
        fireEvent.change(screen.getByLabelText("Group players by"), {
            target: { value: "member_status" },
        });
        expect(props.onDimensionChange).toHaveBeenCalledWith("member_status");
    });

    it("fires onInactiveDaysChange when the threshold changes", () => {
        const props = renderView({ dimension: "activity_status" });
        fireEvent.change(screen.getByLabelText("Inactivity threshold"), {
            target: { value: "60" },
        });
        expect(props.onInactiveDaysChange).toHaveBeenCalledWith(60);
    });

    it("fires onRefresh when Refresh is clicked", () => {
        const props = renderView();
        fireEvent.click(screen.getByLabelText("Refresh analytics"));
        expect(props.onRefresh).toHaveBeenCalled();
    });
});
