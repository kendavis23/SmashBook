import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import PlayerValueContainer from "./PlayerValueContainer";

const refetchValue = vi.fn();

vi.mock("../../hooks", () => ({
    usePlayerValueLeaderboard: vi.fn(() => ({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: refetchValue,
    })),
}));

vi.mock("../../store", () => ({
    useClubAccess: vi.fn(() => ({ clubId: "club-1", role: "owner" })),
}));

vi.mock("./PlayerValueView", () => ({
    default: (props: Record<string, unknown>) => (
        <div>
            <span data-testid="tab">{String(props.tab)}</span>
            <span data-testid="loading">{String(props.isLoading)}</span>
            <span data-testid="page">{String(props.page)}</span>
            <button onClick={props.onRefresh as () => void}>Refresh</button>
            <button
                onClick={() => (props.onSortChange as (value: string) => void)("bookings_played")}
            >
                Sort
            </button>
            <button onClick={() => (props.onMembersOnlyChange as (value: boolean) => void)(true)}>
                Members
            </button>
        </div>
    ),
}));

describe("PlayerValueContainer", () => {
    beforeEach(() => vi.clearAllMocks());

    it("calls the value hook with the club id and report params", async () => {
        const { usePlayerValueLeaderboard } = await import("../../hooks");
        render(<PlayerValueContainer />);
        expect(usePlayerValueLeaderboard).toHaveBeenCalledWith(
            "club-1",
            expect.objectContaining({
                members_only: false,
                sort: "lifetime_spend",
                limit: 10,
                offset: 0,
            })
        );
        expect(usePlayerValueLeaderboard).toHaveBeenCalledWith(
            "club-1",
            expect.objectContaining({ sort: "lifetime_spend", limit: 5, offset: 0 })
        );
        expect(usePlayerValueLeaderboard).toHaveBeenCalledWith(
            "club-1",
            expect.objectContaining({ sort: "bookings_played", limit: 5, offset: 0 })
        );
        expect(usePlayerValueLeaderboard).toHaveBeenCalledWith(
            "club-1",
            expect.objectContaining({ sort: "last_played_at", limit: 5, offset: 0 })
        );
    });

    it("defaults to the value tab", () => {
        render(<PlayerValueContainer />);
        expect(screen.getByTestId("tab").textContent).toBe("value");
    });

    it("refetches the value report on Refresh", () => {
        render(<PlayerValueContainer />);
        fireEvent.click(screen.getByText("Refresh"));
        expect(refetchValue).toHaveBeenCalledTimes(4);
    });

    it("passes updated filter params to the value hook", async () => {
        const { usePlayerValueLeaderboard } = await import("../../hooks");
        render(<PlayerValueContainer />);
        fireEvent.click(screen.getByText("Sort"));
        expect(usePlayerValueLeaderboard).toHaveBeenCalledWith(
            "club-1",
            expect.objectContaining({ sort: "bookings_played", limit: 10, offset: 0 })
        );
        fireEvent.click(screen.getByText("Members"));
        expect(usePlayerValueLeaderboard).toHaveBeenCalledWith(
            "club-1",
            expect.objectContaining({ members_only: true, sort: "bookings_played", offset: 0 })
        );
    });

    it("passes an empty club id through when none is set", async () => {
        const { useClubAccess } = await import("../../store");
        vi.mocked(useClubAccess).mockReturnValueOnce({ clubId: null, role: "owner" } as never);
        const { usePlayerValueLeaderboard } = await import("../../hooks");
        render(<PlayerValueContainer />);
        expect(usePlayerValueLeaderboard).toHaveBeenCalledWith("", expect.anything());
    });
});
