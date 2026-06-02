import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RevenueView from "./RevenueView";
import type {
    ClubRevenueByType,
    ClubRevenueSummary,
    ClubRevenueTimeseries,
} from "@repo/staff-domain/models";

vi.mock("@repo/ui", () => ({
    formatCurrency: (v: number | null | undefined) => {
        if (v == null) return "—";
        return `£${Number(v).toFixed(2)}`;
    },
    DatePicker: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
        <input type="date" value={value} onChange={(e) => onChange(e.target.value)} />
    ),
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
            {options.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
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
    WEEKDAYS_SHORT: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
}));

const baseRange = { from: "2026-05-01", to: "2026-05-31" };

const mockSummary: ClubRevenueSummary = {
    club_id: "club-1",
    basis: "service",
    date_from: "2026-05-01",
    date_to: "2026-05-31",
    currency: "GBP",
    gross_amount: 24560,
    refund_amount: 2340,
    net_amount: 22220,
    transaction_count: 1248,
    avg_transaction_value: 17.82,
    by_type: [
        {
            revenue_type: "court_booking",
            gross_amount: 8730,
            refund_amount: 870,
            net_amount: 7860,
            transaction_count: 420,
        },
        {
            revenue_type: "coaching",
            gross_amount: 5450,
            refund_amount: 550,
            net_amount: 4900,
            transaction_count: 310,
        },
    ],
};

const mockByType: ClubRevenueByType = {
    club_id: "club-1",
    basis: "service",
    date_from: "2026-05-01",
    date_to: "2026-05-31",
    currency: "GBP",
    rows: [
        {
            revenue_type: "court_booking",
            gross_amount: 8730,
            refund_amount: 870,
            net_amount: 7860,
            transaction_count: 420,
        },
        {
            revenue_type: "coaching",
            gross_amount: 5450,
            refund_amount: 550,
            net_amount: 4900,
            transaction_count: 310,
        },
    ],
};

const mockTimeseries: ClubRevenueTimeseries = {
    club_id: "club-1",
    basis: "service",
    granularity: "day",
    date_from: "2026-05-01",
    date_to: "2026-05-31",
    currency: "GBP",
    points: [
        {
            period_start: "2026-05-01",
            gross_amount: 800,
            refund_amount: 80,
            net_amount: 720,
            transaction_count: 40,
        },
        {
            period_start: "2026-05-02",
            gross_amount: 900,
            refund_amount: 90,
            net_amount: 810,
            transaction_count: 45,
        },
    ],
};

const baseProps = {
    range: baseRange,
    summaryData: mockSummary,
    timeseriesData: mockTimeseries,
    byTypeData: mockByType,
    granularity: "day" as const,
    disabledGranularities: [],
    basis: "service" as const,
    isSummaryLoading: false,
    isTimeseriesLoading: false,
    isByTypeLoading: false,
    summaryError: null,
    timeseriesError: null,
    byTypeError: null,
    onRangeChange: vi.fn(),
    onGranularityChange: vi.fn(),
    onBasisChange: vi.fn(),
    onRefresh: vi.fn(),
};

describe("RevenueView — loading state", () => {
    it("shows loading spinner when loading", () => {
        render(
            <RevenueView
                {...baseProps}
                isSummaryLoading={true}
                summaryData={undefined}
                timeseriesData={undefined}
            />
        );
        expect(screen.getByText("Loading revenue data…")).toBeInTheDocument();
    });
});

describe("RevenueView — error state", () => {
    it("shows error message when summaryError is set", () => {
        render(<RevenueView {...baseProps} summaryError={new Error("Network error")} />);
        expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });
});

describe("RevenueView — empty state", () => {
    it("shows empty state when no data", () => {
        render(
            <RevenueView
                {...baseProps}
                summaryData={undefined}
                timeseriesData={undefined}
                byTypeData={undefined}
            />
        );
        expect(screen.getByText("No data for this period")).toBeInTheDocument();
    });
});

describe("RevenueView — dashboard", () => {
    it("renders section headings", () => {
        render(<RevenueView {...baseProps} />);
        expect(screen.getByText("Revenue Over Time")).toBeInTheDocument();
        expect(screen.getByText("Net Revenue by Type (Share)")).toBeInTheDocument();
        expect(screen.queryByText("Net Revenue by Type (Bar)")).not.toBeInTheDocument();
    });

    it("renders the granularity toggle and fires onGranularityChange", () => {
        const onGranularityChange = vi.fn();
        render(<RevenueView {...baseProps} onGranularityChange={onGranularityChange} />);
        const group = screen.getByRole("radiogroup", { name: /chart granularity/i });
        expect(group).toBeInTheDocument();
        fireEvent.click(screen.getByRole("radio", { name: "Week" }));
        expect(onGranularityChange).toHaveBeenCalledWith("week");
    });

    it("renders the basis dropdown and fires onBasisChange", () => {
        const onBasisChange = vi.fn();
        render(<RevenueView {...baseProps} onBasisChange={onBasisChange} />);
        const select = screen.getByRole("combobox", { name: /revenue basis/i });
        expect(select).toHaveValue("service");
        fireEvent.change(select, { target: { value: "cash" } });
        expect(onBasisChange).toHaveBeenCalledWith("cash");
    });

    it("renders KPI labels", () => {
        render(<RevenueView {...baseProps} />);
        expect(screen.getByText("Gross Revenue")).toBeInTheDocument();
        expect(screen.getByText("Net Revenue")).toBeInTheDocument();
        expect(screen.getByText("Refunds")).toBeInTheDocument();
        // "Transactions" appears in KPI card and in table header — both are valid
        expect(screen.getAllByText("Transactions").length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText("Avg. Per Transaction")).toBeInTheDocument();
    });

    it("renders revenue type table rows", () => {
        render(<RevenueView {...baseProps} />);
        // Revenue type names appear in both donut legend and table — assert multiple occurrences
        expect(screen.getAllByText("Court Booking").length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText("Coaching").length).toBeGreaterThanOrEqual(1);
    });

    it("calls onRefresh when Refresh is clicked", () => {
        const onRefresh = vi.fn();
        render(<RevenueView {...baseProps} onRefresh={onRefresh} />);
        fireEvent.click(screen.getByRole("button", { name: /refresh analytics/i }));
        expect(onRefresh).toHaveBeenCalledOnce();
    });

    it("does not show by-type section when by-type rows are empty", () => {
        const noTypeByType = { ...mockByType, rows: [] };
        render(<RevenueView {...baseProps} byTypeData={noTypeByType} />);
        expect(screen.queryByText("Net Revenue by Type (Share)")).not.toBeInTheDocument();
        expect(screen.queryByText("Net Revenue by Type (Bar)")).not.toBeInTheDocument();
    });
});
