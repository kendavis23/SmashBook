import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import PlayerActivityContainer from "./PlayerActivityContainer";

const refetchKpi = vi.fn();
const refetchActive = vi.fn();
const refetchSignups = vi.fn();

vi.mock("../../hooks", () => ({
    useActivePlayersKpi: vi.fn(() => ({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: refetchKpi,
    })),
    useActivePlayersTimeseries: vi.fn(() => ({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: refetchActive,
    })),
    useSignupsTimeseries: vi.fn(() => ({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: refetchSignups,
    })),
}));

const useClubAccessMock = vi.fn(() => ({ clubId: "club-1", role: "owner" }));
vi.mock("../../store", () => ({
    useClubAccess: () => useClubAccessMock(),
}));

vi.mock("./PlayerActivityView", () => ({
    default: (props: Record<string, unknown>) => {
        const range = props.range as { from: string; to: string };
        return (
            <div>
                <span data-testid="from">{range.from}</span>
                <span data-testid="to">{range.to}</span>
                <span data-testid="granularity">{String(props.granularity)}</span>
                <span data-testid="loading">{String(props.isLoading)}</span>
                <button onClick={props.onRefresh as () => void}>Refresh</button>
                <button onClick={() => (props.onGranularityChange as (g: string) => void)("week")}>
                    ToWeek
                </button>
                <button
                    onClick={() =>
                        (props.onRangeChange as (r: { from: string; to: string }) => void)({
                            from: "2026-01-01",
                            to: "2026-01-31",
                        })
                    }
                >
                    ChangeRange
                </button>
            </div>
        );
    },
}));

/** Difference in inclusive days between two YYYY-MM-DD strings. */
function inclusiveDays(from: string, to: string): number {
    const [fy = 0, fm = 1, fd = 1] = from.split("-").map(Number);
    const [ty = 0, tm = 1, td = 1] = to.split("-").map(Number);
    const ms = Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd);
    return Math.round(ms / 86_400_000) + 1;
}

describe("PlayerActivityContainer", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useClubAccessMock.mockReturnValue({ clubId: "club-1", role: "owner" });
    });

    it("defaults the range to the last 30 calendar days ending yesterday", () => {
        render(<PlayerActivityContainer />);
        const from = screen.getByTestId("from").textContent ?? "";
        const to = screen.getByTestId("to").textContent ?? "";
        expect(inclusiveDays(from, to)).toBe(30);

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const expectedTo = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(
            2,
            "0"
        )}-${String(yesterday.getDate()).padStart(2, "0")}`;
        expect(to).toBe(expectedTo);
    });

    it("defaults the granularity to day", () => {
        render(<PlayerActivityContainer />);
        expect(screen.getByTestId("granularity").textContent).toBe("day");
    });

    it("calls the timeseries hooks with clubId, granularity and the date range", async () => {
        const { useActivePlayersTimeseries, useSignupsTimeseries } = await import("../../hooks");
        render(<PlayerActivityContainer />);
        expect(useActivePlayersTimeseries).toHaveBeenCalledWith(
            "club-1",
            expect.objectContaining({ granularity: "day" })
        );
        expect(useSignupsTimeseries).toHaveBeenCalledWith(
            "club-1",
            expect.objectContaining({ granularity: "day" })
        );
    });

    it("refetches all three queries on refresh", () => {
        render(<PlayerActivityContainer />);
        fireEvent.click(screen.getByText("Refresh"));
        expect(refetchKpi).toHaveBeenCalledTimes(1);
        expect(refetchActive).toHaveBeenCalledTimes(1);
        expect(refetchSignups).toHaveBeenCalledTimes(1);
    });

    it("re-requests the timeseries with the new granularity when it changes", async () => {
        const { useActivePlayersTimeseries } = await import("../../hooks");
        render(<PlayerActivityContainer />);
        fireEvent.click(screen.getByText("ToWeek"));
        expect(useActivePlayersTimeseries).toHaveBeenLastCalledWith(
            "club-1",
            expect.objectContaining({ granularity: "week" })
        );
    });

    it("updates the date range when it changes", () => {
        render(<PlayerActivityContainer />);
        fireEvent.click(screen.getByText("ChangeRange"));
        expect(screen.getByTestId("from").textContent).toBe("2026-01-01");
        expect(screen.getByTestId("to").textContent).toBe("2026-01-31");
    });

    it("passes an empty club id through when none is available", async () => {
        useClubAccessMock.mockReturnValue({
            clubId: "",
            role: "owner",
        } as ReturnType<typeof useClubAccessMock>);
        const { useActivePlayersKpi } = await import("../../hooks");
        render(<PlayerActivityContainer />);
        expect(useActivePlayersKpi).toHaveBeenCalledWith(
            "",
            expect.objectContaining({ window_days: 30 })
        );
    });
});
