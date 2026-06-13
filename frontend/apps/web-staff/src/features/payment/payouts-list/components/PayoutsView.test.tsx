import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PayoutsView from "./PayoutsView";
import type { Payout } from "../../types";

vi.mock("@repo/ui", () => ({
    Breadcrumb: ({ items }: { items: { label: string }[] }) => (
        <nav>
            {items.map((i) => (
                <span key={i.label}>{i.label}</span>
            ))}
        </nav>
    ),
    Pagination: ({ totalItems }: { totalItems: number }) => <div>pagination-{totalItems}</div>,
    SelectInput: ({
        value,
        onValueChange,
    }: {
        value: string;
        onValueChange: (v: string) => void;
    }) => (
        <select
            aria-label="recon_status"
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
        >
            <option value="">All statuses</option>
            <option value="matched">Matched</option>
        </select>
    ),
    formatCurrency: (n: number | null) => (n == null ? "—" : `£${Number(n).toFixed(2)}`),
    formatUTCDate: (iso: string) => `date:${iso}`,
}));

const mockPayout: Payout = {
    id: "po-1",
    stripe_payout_id: "po_stripe_1",
    status: "paid",
    reconciliation_status: "matched",
    gross_amount: 12000,
    fee_amount: 200,
    amount: 11800,
    matched_amount: 11800,
    discrepancy_amount: 0,
    currency: "gbp",
    arrival_date: "2026-06-10",
    statement_descriptor: "SMASHBOOK",
    failure_code: null,
    paid_at: "2026-06-10T00:00:00",
};

const baseProps = {
    payouts: [mockPayout],
    isLoading: false,
    error: null,
    reconFilter: "",
    onReconFilterChange: vi.fn(),
    onRefresh: vi.fn(),
};

describe("PayoutsView", () => {
    it("renders the loading state", () => {
        render(<PayoutsView {...baseProps} payouts={[]} isLoading={true} />);
        expect(screen.getByText("Loading payouts…")).toBeInTheDocument();
    });

    it("renders the error state", () => {
        render(<PayoutsView {...baseProps} payouts={[]} error={new Error("boom")} />);
        expect(screen.getByText("boom")).toBeInTheDocument();
    });

    it("renders the empty state", () => {
        render(<PayoutsView {...baseProps} payouts={[]} />);
        expect(screen.getByText("No payouts yet")).toBeInTheDocument();
    });

    it("renders a payout row with formatted amount, date and statuses", () => {
        render(<PayoutsView {...baseProps} />);
        expect(screen.getByText("£11800.00")).toBeInTheDocument();
        expect(screen.getByText("date:2026-06-10")).toBeInTheDocument();
        expect(screen.getByText("Paid")).toBeInTheDocument();
        // "Matched" also appears as a filter option, so scope to the badge in the row.
        expect(screen.getAllByText("Matched").length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText("SMASHBOOK")).toBeInTheDocument();
    });

    it("calls onRefresh when Refresh is clicked", () => {
        const onRefresh = vi.fn();
        render(<PayoutsView {...baseProps} onRefresh={onRefresh} />);
        fireEvent.click(screen.getByRole("button", { name: "Refresh payouts" }));
        expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    it("calls onReconFilterChange when the filter changes", () => {
        const onReconFilterChange = vi.fn();
        render(<PayoutsView {...baseProps} onReconFilterChange={onReconFilterChange} />);
        fireEvent.change(screen.getByLabelText("recon_status"), {
            target: { value: "matched" },
        });
        expect(onReconFilterChange).toHaveBeenCalledWith("matched");
    });
});
