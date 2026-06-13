import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import PayoutsContainer from "./PayoutsContainer";

const useListPayouts = vi.fn();
const refetch = vi.fn();

vi.mock("../../hooks", () => ({
    useListPayouts: (clubId: string, params: unknown) => useListPayouts(clubId, params),
}));

vi.mock("../../store", () => ({
    useClubAccess: () => ({ clubId: "club-1", role: "owner" }),
}));

vi.mock("./PayoutsView", () => ({
    default: ({
        isLoading,
        onRefresh,
        onReconFilterChange,
    }: {
        isLoading: boolean;
        onRefresh: () => void;
        onReconFilterChange: (v: string) => void;
    }) => (
        <div>
            <span>{isLoading ? "loading" : "loaded"}</span>
            <button onClick={onRefresh}>refresh</button>
            <button onClick={() => onReconFilterChange("matched")}>filter</button>
        </div>
    ),
}));

beforeEach(() => {
    useListPayouts.mockReset();
    refetch.mockReset();
    useListPayouts.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch,
    });
});

describe("PayoutsContainer", () => {
    it("passes the active club id and no filter on first render", () => {
        render(<PayoutsContainer />);
        expect(useListPayouts).toHaveBeenCalledWith("club-1", {
            reconciliationStatus: undefined,
        });
        expect(screen.getByText("loaded")).toBeInTheDocument();
    });

    it("calls refetch when Refresh is triggered", () => {
        render(<PayoutsContainer />);
        fireEvent.click(screen.getByText("refresh"));
        expect(refetch).toHaveBeenCalledTimes(1);
    });

    it("requeries with the selected reconciliation status", () => {
        render(<PayoutsContainer />);
        fireEvent.click(screen.getByText("filter"));
        expect(useListPayouts).toHaveBeenLastCalledWith("club-1", {
            reconciliationStatus: "matched",
        });
    });
});
