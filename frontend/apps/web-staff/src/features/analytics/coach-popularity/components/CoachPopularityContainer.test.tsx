import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { TABLE_PAGE_SIZE } from "../coachPopularityConstants";
import CoachPopularityContainer from "./CoachPopularityContainer";

const refetch = vi.fn();

vi.mock("../../hooks", () => ({
    useCoachPopularityLeaderboard: vi.fn(() => ({
        data: undefined,
        isLoading: false,
        error: null,
        refetch,
    })),
}));

vi.mock("../../store", () => ({
    useClubAccess: vi.fn(() => ({ clubId: "club-1", role: "owner" })),
}));

vi.mock("./CoachPopularityView", () => ({
    default: (props: Record<string, unknown>) => (
        <div>
            <span data-testid="sort">{String(props.sort)}</span>
            <span data-testid="loading">{String(props.isLoading)}</span>
            <span data-testid="page">{String(props.page)}</span>
            <button onClick={props.onRefresh as () => void}>Refresh</button>
            <button onClick={() => (props.onSortChange as (v: string) => void)("return_rate")}>
                Sort
            </button>
        </div>
    ),
}));

describe("CoachPopularityContainer", () => {
    beforeEach(() => vi.clearAllMocks());

    it("calls the leaderboard hook with the club id and the paged + chart params", async () => {
        const { useCoachPopularityLeaderboard } = await import("../../hooks");
        render(<CoachPopularityContainer />);
        expect(useCoachPopularityLeaderboard).toHaveBeenCalledWith(
            "club-1",
            expect.objectContaining({ sort: "sessions", limit: 5, offset: 0 })
        );
        expect(useCoachPopularityLeaderboard).toHaveBeenCalledWith(
            "club-1",
            expect.objectContaining({ sort: "return_rate", limit: 5, offset: 0 })
        );
    });

    it("defaults to the sessions sort", () => {
        render(<CoachPopularityContainer />);
        expect(screen.getByTestId("sort").textContent).toBe("sessions");
    });

    it("refetches all three queries on Refresh", () => {
        render(<CoachPopularityContainer />);
        fireEvent.click(screen.getByText("Refresh"));
        expect(refetch).toHaveBeenCalledTimes(3);
    });

    it("passes the updated sort to the paged query and resets the page", async () => {
        const { useCoachPopularityLeaderboard } = await import("../../hooks");
        render(<CoachPopularityContainer />);
        fireEvent.click(screen.getByText("Sort"));
        expect(useCoachPopularityLeaderboard).toHaveBeenCalledWith(
            "club-1",
            expect.objectContaining({ sort: "return_rate", limit: TABLE_PAGE_SIZE, offset: 0 })
        );
        expect(screen.getByTestId("page").textContent).toBe("0");
    });

    it("passes an empty club id through when none is set", async () => {
        const { useClubAccess } = await import("../../store");
        vi.mocked(useClubAccess).mockReturnValueOnce({ clubId: null, role: "owner" } as never);
        const { useCoachPopularityLeaderboard } = await import("../../hooks");
        render(<CoachPopularityContainer />);
        expect(useCoachPopularityLeaderboard).toHaveBeenCalledWith("", expect.anything());
    });
});
