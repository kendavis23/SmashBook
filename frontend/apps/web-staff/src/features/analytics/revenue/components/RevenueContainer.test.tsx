import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import RevenueContainer from "./RevenueContainer";

const mockRefetchSummary = vi.fn();
const mockRefetchTimeseries = vi.fn();
const mockRefetchByType = vi.fn();

vi.mock("../../hooks", () => ({
    useClubRevenueSummary: vi.fn(() => ({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: mockRefetchSummary,
    })),
    useClubRevenueTimeseries: vi.fn(() => ({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: mockRefetchTimeseries,
    })),
    useClubRevenueByType: vi.fn(() => ({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: mockRefetchByType,
    })),
}));

vi.mock("../../store", () => ({
    useClubAccess: vi.fn(() => ({ clubId: "club-123" })),
}));

// Lightweight RevenueView stub — captures props without rendering SVGs
vi.mock("./RevenueView", () => ({
    default: (props: Record<string, unknown>) => (
        <div>
            <span data-testid="from">{String((props.range as { from: string }).from)}</span>
            <span data-testid="to">{String((props.range as { to: string }).to)}</span>
            <button onClick={props.onRefresh as () => void}>Refresh</button>
        </div>
    ),
}));

describe("RevenueContainer", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("default range: 'to' is yesterday, 'from' starts the 30-day completed range", () => {
        render(<RevenueContainer />);
        const to = new Date();
        to.setDate(to.getDate() - 1);
        const from = new Date(to);
        from.setDate(to.getDate() - 29);
        const fmt = (d: Date) =>
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        expect(screen.getByTestId("from").textContent).toBe(fmt(from));
        expect(screen.getByTestId("to").textContent).toBe(fmt(to));
    });

    it("calls all hooks with clubId and params", async () => {
        const { useClubRevenueSummary, useClubRevenueTimeseries, useClubRevenueByType } =
            await import("../../hooks");
        render(<RevenueContainer />);
        expect(useClubRevenueSummary).toHaveBeenCalledWith(
            "club-123",
            expect.objectContaining({ basis: "service" })
        );
        expect(useClubRevenueTimeseries).toHaveBeenCalledWith(
            "club-123",
            expect.objectContaining({ granularity: "day" })
        );
        expect(useClubRevenueByType).toHaveBeenCalledWith(
            "club-123",
            expect.objectContaining({ basis: "service" })
        );
    });

    it("passes empty string as clubId when clubId is null", async () => {
        const { useClubAccess } = await import("../../store");
        vi.mocked(useClubAccess).mockReturnValue({ clubId: null, role: null, isOwner: false });
        const { useClubRevenueSummary } = await import("../../hooks");
        render(<RevenueContainer />);
        expect(useClubRevenueSummary).toHaveBeenCalledWith("", expect.anything());
    });

    it("calls all refetch functions when Refresh is clicked", () => {
        render(<RevenueContainer />);
        fireEvent.click(screen.getByText("Refresh"));
        expect(mockRefetchSummary).toHaveBeenCalledOnce();
        expect(mockRefetchTimeseries).toHaveBeenCalledOnce();
        expect(mockRefetchByType).toHaveBeenCalledOnce();
    });
});
