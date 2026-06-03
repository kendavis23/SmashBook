import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import PlayerSegmentsContainer from "./PlayerSegmentsContainer";

const refetch = vi.fn();

vi.mock("../../hooks", () => ({
    usePlayerValueByGroup: vi.fn(() => ({
        data: undefined,
        isLoading: false,
        error: null,
        refetch,
    })),
}));

vi.mock("../../store", () => ({
    useClubAccess: vi.fn(() => ({ clubId: "club-1", role: "owner" })),
}));

vi.mock("./PlayerSegmentsView", () => ({
    default: (props: Record<string, unknown>) => (
        <div>
            <span data-testid="dimension">{String(props.dimension)}</span>
            <span data-testid="inactive">{String(props.inactiveDays)}</span>
            <span data-testid="loading">{String(props.isLoading)}</span>
            <button onClick={props.onRefresh as () => void}>Refresh</button>
            <button
                onClick={() => (props.onDimensionChange as (d: string) => void)("activity_status")}
            >
                ToActivity
            </button>
            <button onClick={() => (props.onInactiveDaysChange as (n: number) => void)(90)}>
                Set90
            </button>
        </div>
    ),
}));

describe("PlayerSegmentsContainer", () => {
    beforeEach(() => vi.clearAllMocks());

    it("defaults to membership_tier and inactiveDays 30", async () => {
        const { usePlayerValueByGroup } = await import("../../hooks");
        render(<PlayerSegmentsContainer />);
        expect(usePlayerValueByGroup).toHaveBeenCalledWith("club-1", {
            dimension: "membership_tier",
        });
        expect(screen.getByTestId("dimension")).toHaveTextContent("membership_tier");
        expect(screen.getByTestId("inactive")).toHaveTextContent("30");
    });

    it("passes an empty string when no club id is present", async () => {
        const { useClubAccess } = await import("../../store");
        (useClubAccess as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
            clubId: null,
            role: "owner",
        });
        const { usePlayerValueByGroup } = await import("../../hooks");
        render(<PlayerSegmentsContainer />);
        expect(usePlayerValueByGroup).toHaveBeenCalledWith("", expect.anything());
    });

    it("calls refetch when Refresh fires", () => {
        render(<PlayerSegmentsContainer />);
        fireEvent.click(screen.getByText("Refresh"));
        expect(refetch).toHaveBeenCalled();
    });

    it("refetches with the new dimension when it changes", async () => {
        const { usePlayerValueByGroup } = await import("../../hooks");
        render(<PlayerSegmentsContainer />);
        fireEvent.click(screen.getByText("ToActivity"));
        expect(usePlayerValueByGroup).toHaveBeenLastCalledWith("club-1", {
            dimension: "activity_status",
            inactive_days: 30,
        });
        expect(screen.getByTestId("dimension")).toHaveTextContent("activity_status");
    });

    it("refetches with the new inactivity threshold when it changes", async () => {
        const { usePlayerValueByGroup } = await import("../../hooks");
        render(<PlayerSegmentsContainer />);
        fireEvent.click(screen.getByText("ToActivity"));
        fireEvent.click(screen.getByText("Set90"));
        expect(usePlayerValueByGroup).toHaveBeenLastCalledWith("club-1", {
            dimension: "activity_status",
            inactive_days: 90,
        });
        expect(screen.getByTestId("inactive")).toHaveTextContent("90");
    });
});
