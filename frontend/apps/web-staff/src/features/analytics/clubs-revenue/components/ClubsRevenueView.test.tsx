import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ClubsRevenueView from "./ClubsRevenueView";
import type { TenantRevenueComparison } from "../../types";

vi.mock("@repo/ui", () => ({
    formatCurrency: (v: number | null | undefined) =>
        v == null ? "—" : `$${Number(v).toFixed(2)}`,
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
    DatePicker: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
        <input type="date" value={value} onChange={(e) => onChange(e.target.value)} />
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
}));

const baseRange = { from: "2026-06-01", to: "2026-06-30" };

const mockData: TenantRevenueComparison = {
    basis: "service",
    date_from: "2026-06-01",
    date_to: "2026-06-30",
    clubs: [
        {
            club_id: "a",
            club_name: "Downtown Sports Club",
            currency: "USD",
            gross_amount: 36250,
            refund_amount: 2000,
            net_amount: 34250,
            transaction_count: 1845,
        },
        {
            club_id: "b",
            club_name: "Lakeside Club",
            currency: "USD",
            gross_amount: 30500,
            refund_amount: 1740,
            net_amount: 28760,
            transaction_count: 1520,
        },
    ],
};

const baseProps = {
    range: baseRange,
    data: mockData,
    basis: "service" as const,
    isLoading: false,
    error: null,
    onRangeChange: vi.fn(),
    onBasisChange: vi.fn(),
    onRefresh: vi.fn(),
};

describe("ClubsRevenueView", () => {
    it("renders the title and dashboard sections when data is present", () => {
        render(<ClubsRevenueView {...baseProps} />);
        expect(screen.getByText("Clubs Revenue Overview")).toBeInTheDocument();
        expect(screen.getByText("Net Revenue by Club")).toBeInTheDocument();
        expect(screen.getByText("Net Revenue Share by Club")).toBeInTheDocument();
        // KPI label (unique to the cards) and a club name in the table
        expect(screen.getByText("Total Gross Revenue")).toBeInTheDocument();
        expect(screen.getAllByText("Downtown Sports Club").length).toBeGreaterThan(0);
    });

    it("shows the across-N-clubs caption on KPI cards", () => {
        render(<ClubsRevenueView {...baseProps} />);
        expect(screen.getAllByText("Across 2 Clubs").length).toBeGreaterThan(0);
    });

    it("renders the loading branch", () => {
        render(<ClubsRevenueView {...baseProps} isLoading data={undefined} />);
        expect(screen.getByText("Loading clubs revenue…")).toBeInTheDocument();
    });

    it("renders the error branch", () => {
        render(<ClubsRevenueView {...baseProps} error={new Error("boom")} data={undefined} />);
        expect(screen.getByText(/Failed to load clubs revenue/)).toBeInTheDocument();
    });

    it("renders the empty branch when there are no clubs", () => {
        render(<ClubsRevenueView {...baseProps} data={{ ...mockData, clubs: [] }} />);
        expect(screen.getByText("No data for this period")).toBeInTheDocument();
    });

    it("shows the zero-revenue banner when clubs exist but net is 0", () => {
        render(
            <ClubsRevenueView
                {...baseProps}
                data={{
                    ...mockData,
                    clubs: mockData.clubs.map((c) => ({
                        ...c,
                        gross_amount: 0,
                        refund_amount: 0,
                        net_amount: 0,
                        transaction_count: 0,
                    })),
                }}
            />
        );
        expect(screen.getByText(/share percentages are not meaningful/)).toBeInTheDocument();
    });

    it("fires onRefresh when the refresh button is clicked", () => {
        const onRefresh = vi.fn();
        render(<ClubsRevenueView {...baseProps} onRefresh={onRefresh} />);
        fireEvent.click(screen.getByLabelText("Refresh analytics"));
        expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    it("fires onBasisChange when the basis select changes", () => {
        const onBasisChange = vi.fn();
        render(<ClubsRevenueView {...baseProps} onBasisChange={onBasisChange} />);
        fireEvent.change(screen.getByLabelText("Revenue basis"), { target: { value: "cash" } });
        expect(onBasisChange).toHaveBeenCalledWith("cash");
    });
});
