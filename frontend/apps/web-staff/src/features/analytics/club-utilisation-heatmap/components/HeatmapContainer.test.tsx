import { render, screen, fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HeatmapContainer from "./HeatmapContainer";

const useClubUtilisationHeatmap = vi.fn();
const useClubAccess = vi.fn();
const refetch = vi.fn();

vi.mock("../../hooks", () => ({
    useClubUtilisationHeatmap: (clubId: string, range: unknown) =>
        useClubUtilisationHeatmap(clubId, range),
}));

vi.mock("../../store", () => ({
    useClubAccess: () => useClubAccess(),
}));

const viewProps = vi.fn();
vi.mock("./HeatmapView", () => ({
    default: (props: Record<string, unknown>) => {
        viewProps(props);
        return (
            <div>
                <span>range:{String((props.range as { from: string }).from)}</span>
                <button onClick={props.onCurrentMonth as () => void}>current-month</button>
                <button onClick={props.onRefresh as () => void}>refresh</button>
            </div>
        );
    },
}));

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 15, 12));
    vi.clearAllMocks();
    useClubAccess.mockReturnValue({ clubId: "club-1", role: "owner" });
    useClubUtilisationHeatmap.mockReturnValue({
        data: {
            cells: [
                {
                    day_of_week: 4,
                    hour: 10,
                    avg_utilisation_pct: 50,
                    total_slots: 10,
                    booked_slots: 5,
                },
            ],
        },
        isLoading: false,
        error: null,
        refetch,
    });
});

afterEach(() => {
    vi.useRealTimers();
});

describe("HeatmapContainer", () => {
    it("defaults to yesterday and thirty days before yesterday", () => {
        render(<HeatmapContainer />);

        const props = viewProps.mock.calls[0]?.[0] as { range: { from: string; to: string } };
        expect(props.range).toEqual({ from: "2026-04-14", to: "2026-05-14" });
        expect(useClubUtilisationHeatmap).toHaveBeenCalledWith("club-1", {
            dateFrom: "2026-04-14",
            dateTo: "2026-05-14",
        });
    });

    it("sets the range to the current month through yesterday", () => {
        render(<HeatmapContainer />);

        fireEvent.click(screen.getByText("current-month"));

        const props = viewProps.mock.calls.at(-1)?.[0] as { range: { from: string; to: string } };
        expect(props.range).toEqual({ from: "2026-05-01", to: "2026-05-14" });
    });

    it("uses yesterday's month when today is the first day of a month", () => {
        vi.setSystemTime(new Date(2026, 5, 1, 12));
        render(<HeatmapContainer />);

        fireEvent.click(screen.getByText("current-month"));

        const props = viewProps.mock.calls.at(-1)?.[0] as { range: { from: string; to: string } };
        expect(props.range).toEqual({ from: "2026-05-01", to: "2026-05-31" });
    });

    it("refetches when refresh is triggered", () => {
        render(<HeatmapContainer />);

        fireEvent.click(screen.getByText("refresh"));

        expect(refetch).toHaveBeenCalled();
    });
});
