import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import ClubsRevenueContainer from "./ClubsRevenueContainer";

const mockRefetch = vi.fn();

vi.mock("../../hooks", () => ({
    useTenantRevenueComparison: vi.fn(() => ({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
    })),
}));

// Lightweight ClubsRevenueView stub — captures props without rendering SVGs
vi.mock("./ClubsRevenueView", () => ({
    default: (props: Record<string, unknown>) => (
        <div>
            <span data-testid="from">{String((props.range as { from: string }).from)}</span>
            <span data-testid="to">{String((props.range as { to: string }).to)}</span>
            <span data-testid="basis">{String(props.basis)}</span>
            <button onClick={props.onRefresh as () => void}>Refresh</button>
            <button onClick={() => (props.onBasisChange as (b: string) => void)("cash")}>
                ToCash
            </button>
        </div>
    ),
}));

const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

describe("ClubsRevenueContainer", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("default range: 'to' is yesterday, 'from' is 29 days before to (last 30 days)", () => {
        render(<ClubsRevenueContainer />);
        const to = new Date();
        to.setDate(to.getDate() - 1);
        const from = new Date(to);
        from.setDate(to.getDate() - 29);
        expect(screen.getByTestId("from").textContent).toBe(fmt(from));
        expect(screen.getByTestId("to").textContent).toBe(fmt(to));
    });

    it("calls the tenant hook with basis + date params (no clubId)", async () => {
        const { useTenantRevenueComparison } = await import("../../hooks");
        render(<ClubsRevenueContainer />);
        expect(useTenantRevenueComparison).toHaveBeenCalledWith(
            expect.objectContaining({ basis: "service" })
        );
        const arg = vi.mocked(useTenantRevenueComparison).mock.calls[0]![0];
        expect(arg).toHaveProperty("dateFrom");
        expect(arg).toHaveProperty("dateTo");
    });

    it("calls refetch when Refresh is clicked", () => {
        render(<ClubsRevenueContainer />);
        fireEvent.click(screen.getByText("Refresh"));
        expect(mockRefetch).toHaveBeenCalledOnce();
    });

    it("updates basis state when onBasisChange fires", () => {
        render(<ClubsRevenueContainer />);
        expect(screen.getByTestId("basis").textContent).toBe("service");
        fireEvent.click(screen.getByText("ToCash"));
        expect(screen.getByTestId("basis").textContent).toBe("cash");
    });
});
