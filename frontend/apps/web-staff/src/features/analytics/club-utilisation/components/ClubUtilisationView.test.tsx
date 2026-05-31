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
    SelectInput: ({
        value,
        onValueChange,
        options,
        "aria-label": ariaLabel,
    }: {
        value: string;
        onValueChange: (v: string) => void;
        options: { value: string; label: string }[];
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
    DatePicker: ({
        value,
        onChange,
        maxDate,
    }: {
        value: string;
        onChange: (v: string) => void;
        maxDate?: string;
    }) => (
        <input
            aria-label="date"
            max={maxDate}
            value={value}
            onChange={(e) => onChange(e.target.value)}
        />
    ),
}));

const range: DateRange = { from: "2026-05-25", to: "2026-05-26" };

function yesterdayLocalDate(): string {
    const today = new Date();
    today.setDate(today.getDate() - 1);
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

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
        expect(screen.getByText("Booked vs Total Slots")).toBeInTheDocument();
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

    it("offers a granularity selector defaulting to weekly for a multi-week range", () => {
        const multi: DailyUtilisationPoint[] = Array.from({ length: 10 }, (_, i) => ({
            snapshot_date: `2026-04-${String(i + 1).padStart(2, "0")}`,
            total_slots: 10,
            booked_slots: 4,
            utilisation_pct: 40,
            revenue_actual: 100,
            revenue_potential: 250,
        }));
        renderView({ points: multi, summary: computeUtilisationSummary(multi) });
        const selects = screen.getAllByLabelText(/chart granularity/);
        expect(selects).toHaveLength(2); // revenue + slots
        expect((selects[0] as HTMLSelectElement).value).toBe("weekly");
    });

    it("defaults to daily and shows a granularity selector for a ≤7-day multi-day range", () => {
        renderView();
        const selects = screen.getAllByLabelText(/chart granularity/);
        expect(selects).toHaveLength(2);
        expect((selects[0] as HTMLSelectElement).value).toBe("daily");
    });

    it("hides the granularity selector for a single-day range", () => {
        const single = [points()[0] as DailyUtilisationPoint];
        renderView({ points: single, summary: computeUtilisationSummary(single) });
        // one snapshot day → only "daily" is meaningful, so no selector
        expect(screen.queryByLabelText(/chart granularity/)).not.toBeInTheDocument();
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

    it("prevents both date pickers from selecting current and future dates", () => {
        const { onRangeChange } = renderView();
        const maxSelectableDate = yesterdayLocalDate();
        const inputs = screen.getAllByLabelText("date");

        expect(inputs[0]).toHaveAttribute("max", maxSelectableDate);
        expect(inputs[1]).toHaveAttribute("max", maxSelectableDate);

        fireEvent.change(inputs[0] as HTMLElement, { target: { value: "9999-01-01" } });
        expect(onRangeChange).toHaveBeenLastCalledWith({
            from: maxSelectableDate,
            to: maxSelectableDate,
        });

        fireEvent.change(inputs[1] as HTMLElement, { target: { value: "9999-01-01" } });
        expect(onRangeChange).toHaveBeenLastCalledWith({ from: range.from, to: maxSelectableDate });
    });
});
