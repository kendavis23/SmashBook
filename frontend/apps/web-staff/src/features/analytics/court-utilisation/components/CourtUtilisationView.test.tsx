import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CourtUtilisationSummary } from "@repo/staff-domain/models";
import CourtUtilisationView from "./CourtUtilisationView";
import { computeCourtComparison, type CourtSortKey } from "../courtComparison";
import type { DateRange } from "../../types";

vi.mock("@repo/ui", () => ({
    formatCurrency: (n: number | null | undefined) => (n == null ? "—" : `£${n}`),
}));

// Stub the reused date-range control so the SVG/date-picker tree stays out of the way.
vi.mock("../../club-utilisation/components/DateRangeControl", () => ({
    DateRangeControl: ({ onChange }: { onChange: (r: DateRange) => void }) => (
        <button onClick={() => onChange({ from: "2026-04-01", to: "2026-04-05" })}>
            change-range
        </button>
    ),
}));

const range: DateRange = { from: "2026-05-25", to: "2026-05-31" };

function court(over: Partial<CourtUtilisationSummary>): CourtUtilisationSummary {
    return {
        court_id: "c1",
        court_name: "Court 1",
        total_slots: 100,
        booked_slots: 50,
        utilisation_pct: 50,
        revenue_actual: 500,
        revenue_potential: 1000,
        ...over,
    };
}

function courts(): CourtUtilisationSummary[] {
    return [
        court({ court_id: "a", court_name: "Court A", total_slots: 100, booked_slots: 90 }),
        court({ court_id: "b", court_name: "Court B", total_slots: 100, booked_slots: 30 }),
    ];
}

function renderView(overrides: Partial<Parameters<typeof CourtUtilisationView>[0]> = {}) {
    const data = overrides.summary ? [] : courts();
    const sortKey: CourtSortKey = overrides.sortKey ?? "utilisation";
    const props = {
        range,
        rangeLabel: "25 May – 31 May",
        summary: overrides.summary ?? computeCourtComparison(data, sortKey),
        sortKey,
        courtCount: data.length,
        isLoading: false,
        error: null,
        onRangeChange: vi.fn(),
        onSortChange: vi.fn(),
        onCurrentMonth: vi.fn(),
        onRefresh: vi.fn(),
        ...overrides,
    };
    render(<CourtUtilisationView {...props} />);
    return props;
}

describe("CourtUtilisationView", () => {
    it("renders the title, both charts, and the comparison table", () => {
        renderView();
        expect(screen.getByText("Court Utilisation")).toBeInTheDocument();
        expect(screen.getByText("Utilisation by Court")).toBeInTheDocument();
        expect(screen.getByText("Revenue: Actual vs Potential")).toBeInTheDocument();
        expect(screen.getByText(/Court Comparison/)).toBeInTheDocument();
    });

    it("renders the error branch", () => {
        renderView({ error: new Error("boom"), courtCount: 0 });
        expect(screen.getByText(/Failed to load court utilisation data/)).toBeInTheDocument();
    });

    it("renders the loading branch", () => {
        renderView({ isLoading: true, courtCount: 0 });
        expect(screen.getByText("Loading analytics…")).toBeInTheDocument();
    });

    it("renders the empty branch when there are no courts", () => {
        renderView({ summary: computeCourtComparison([]), courtCount: 0 });
        expect(screen.getByText("No data for this period")).toBeInTheDocument();
    });

    it("shows the top-performer and needs-attention callouts", () => {
        renderView();
        expect(screen.getByText("Top performer")).toBeInTheDocument();
        expect(screen.getByText("Needs attention")).toBeInTheDocument();
    });

    it("shows the zero-slots banner and hides callouts when no slots exist", () => {
        const zero = [
            court({ court_id: "a", court_name: "Court A", total_slots: 0, booked_slots: 0 }),
            court({ court_id: "b", court_name: "Court B", total_slots: 0, booked_slots: 0 }),
        ];
        renderView({ summary: computeCourtComparison(zero), courtCount: 2 });
        expect(screen.getByText(/utilisation percentages can/)).toBeInTheDocument();
        expect(screen.queryByText("Top performer")).not.toBeInTheDocument();
    });

    it("renders the revenue-opportunity callout when potential exceeds actual", () => {
        renderView();
        // "Revenue Opportunity" appears as both a KPI label and the chart callout;
        // assert on the callout's unique copy instead.
        expect(screen.getByText(/recoverable across all courts/)).toBeInTheDocument();
    });

    it("fires onRefresh and onRangeChange", () => {
        const props = renderView();
        fireEvent.click(screen.getByLabelText("Refresh analytics"));
        expect(props.onRefresh).toHaveBeenCalled();
        fireEvent.click(screen.getByText("change-range"));
        expect(props.onRangeChange).toHaveBeenCalledWith({ from: "2026-04-01", to: "2026-04-05" });
    });

    it("fires onSortChange when a sortable header is clicked", () => {
        const props = renderView();
        fireEvent.click(screen.getByLabelText("Sort by Revenue"));
        expect(props.onSortChange).toHaveBeenCalledWith("revenue");
    });
});
