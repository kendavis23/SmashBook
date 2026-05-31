import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ClubUtilisationView from "./ClubUtilisationView";
import { computeUtilisationSummary } from "../utilisationSummary";
import type { DailyUtilisationPoint, DateRange } from "../../types";

vi.mock("@repo/ui", () => ({
    formatCurrency: (n: number | null | undefined) => (n == null ? "—" : `£${n}`),
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
    WEEKDAYS_SHORT: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    DatePicker: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
        <input aria-label="date" value={value} onChange={(e) => onChange(e.target.value)} />
    ),
}));

const range: DateRange = { from: "2026-05-25", to: "2026-05-26" };

function points(): DailyUtilisationPoint[] {
    return [
        {
            snapshot_date: "2026-05-25",
            total_slots: 50,
            booked_slots: 22,
            utilisation_pct: 44,
            revenue_actual: 260,
            revenue_potential: 400,
        },
        {
            snapshot_date: "2026-05-26",
            total_slots: 50,
            booked_slots: 30,
            utilisation_pct: 60,
            revenue_actual: 380,
            revenue_potential: 500,
        },
    ];
}

function renderView(overrides: Partial<Parameters<typeof ClubUtilisationView>[0]> = {}) {
    const pts = overrides.points ?? points();
    const props = {
        range,
        rangeLabel: "25 May – 26 May",
        points: pts,
        summary: computeUtilisationSummary(pts),
        isLoading: false,
        error: null,
        onRangeChange: vi.fn(),
        onRefresh: vi.fn(),
        ...overrides,
    };
    render(<ClubUtilisationView {...props} />);
    return props;
}

describe("ClubUtilisationView", () => {
    it("renders the title and the three chart sections", () => {
        renderView();
        expect(screen.getByText("Club Utilisation Analytics")).toBeInTheDocument();
        expect(screen.getByText("Daily Utilisation (%)")).toBeInTheDocument();
        expect(screen.getByText("Actual vs Potential Revenue")).toBeInTheDocument();
        expect(screen.getByText("Utilisation Overview")).toBeInTheDocument();
    });

    it("shows the loading state", () => {
        renderView({ isLoading: true });
        expect(screen.getByText("Loading analytics…")).toBeInTheDocument();
    });

    it("shows the error state", () => {
        renderView({ error: new Error("boom") });
        expect(screen.getByText(/Failed to load utilisation data/)).toBeInTheDocument();
        expect(screen.getByText(/boom/)).toBeInTheDocument();
    });

    it("shows the empty state when there are no points", () => {
        renderView({ points: [] });
        expect(screen.getByText("No data for this period")).toBeInTheDocument();
    });

    it("warns when total slots is zero but data exists", () => {
        const zero: DailyUtilisationPoint[] = [
            {
                snapshot_date: "2026-05-25",
                total_slots: 0,
                booked_slots: 0,
                utilisation_pct: 0,
                revenue_actual: 0,
                revenue_potential: 0,
            },
        ];
        renderView({ points: zero, summary: computeUtilisationSummary(zero) });
        expect(screen.getByText(/No bookable slots were available/)).toBeInTheDocument();
    });

    it("shows average utilisation label for multi-day ranges", () => {
        renderView();
        expect(screen.getByText("Average Utilisation")).toBeInTheDocument();
        expect(screen.getByText("Daily Summary")).toBeInTheDocument();
    });

    it("shows single-day labels for a one-day range", () => {
        const single = [points()[0] as DailyUtilisationPoint];
        renderView({ points: single, summary: computeUtilisationSummary(single) });
        expect(screen.getByText("Day Summary")).toBeInTheDocument();
        expect(screen.queryByText("Average Utilisation")).not.toBeInTheDocument();
    });

    it("renders the revenue opportunity callout when potential exceeds actual", () => {
        renderView();
        expect(screen.getByText("Revenue Opportunity")).toBeInTheDocument();
    });

    it("calls onRefresh when Refresh is clicked", () => {
        const { onRefresh } = renderView();
        fireEvent.click(screen.getByRole("button", { name: "Refresh analytics" }));
        expect(onRefresh).toHaveBeenCalled();
    });

    it("calls onRangeChange when a date input changes", () => {
        const { onRangeChange } = renderView();
        const inputs = screen.getAllByLabelText("date");
        fireEvent.change(inputs[0] as HTMLElement, { target: { value: "2026-05-20" } });
        expect(onRangeChange).toHaveBeenCalled();
    });
});
