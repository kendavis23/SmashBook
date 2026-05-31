import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import ClubUtilisationContainer from "./ClubUtilisationContainer";

const useClubDailyUtilisation = vi.fn();
const useClubAccess = vi.fn();
const refetch = vi.fn();

vi.mock("../../hooks", () => ({
    useClubDailyUtilisation: (clubId: string, range: unknown) =>
        useClubDailyUtilisation(clubId, range),
}));

vi.mock("../../store", () => ({
    useClubAccess: () => useClubAccess(),
}));

// Capture props handed to the View instead of rendering the full chart tree.
const viewProps = vi.fn();
vi.mock("./ClubUtilisationView", () => ({
    default: (props: Record<string, unknown>) => {
        viewProps(props);
        return (
            <div>
                <span>range:{String((props.range as { from: string }).from)}</span>
                <span>label:{String(props.rangeLabel)}</span>
                <span>days:{(props.points as unknown[]).length}</span>
                <button onClick={props.onRefresh as () => void}>refresh</button>
                <button
                    onClick={() =>
                        (props.onRangeChange as (r: { from: string; to: string }) => void)({
                            from: "2026-04-01",
                            to: "2026-04-05",
                        })
                    }
                >
                    change-range
                </button>
                <button
                    onClick={() =>
                        (props.onRangeChange as (r: { from: string; to: string }) => void)({
                            from: "9999-01-01",
                            to: "9999-01-02",
                        })
                    }
                >
                    change-future-range
                </button>
            </div>
        );
    },
}));

beforeEach(() => {
    vi.clearAllMocks();
    useClubAccess.mockReturnValue({ clubId: "club-1", role: "owner" });
    useClubDailyUtilisation.mockReturnValue({
        data: { points: [{ snapshot_date: "2026-05-31", total_slots: 50, booked_slots: 25 }] },
        isLoading: false,
        error: null,
        refetch,
    });
});

describe("ClubUtilisationContainer", () => {
    it("defaults the date range to the last seven completed calendar days", () => {
        const now = new Date();
        const yesterdayDate = new Date(now);
        yesterdayDate.setDate(now.getDate() - 1);
        const yesterday = `${yesterdayDate.getFullYear()}-${String(
            yesterdayDate.getMonth() + 1
        ).padStart(2, "0")}-${String(yesterdayDate.getDate()).padStart(2, "0")}`;
        const fromDate = new Date(yesterdayDate);
        fromDate.setDate(yesterdayDate.getDate() - 6);
        const sevenCompletedDaysAgo = `${fromDate.getFullYear()}-${String(
            fromDate.getMonth() + 1
        ).padStart(2, "0")}-${String(fromDate.getDate()).padStart(2, "0")}`;
        render(<ClubUtilisationContainer />);
        const props = viewProps.mock.calls[0]?.[0] as { range: { from: string; to: string } };
        expect(props.range.from).toBe(sevenCompletedDaysAgo);
        expect(props.range.to).toBe(yesterday);
    });

    it("passes the club id and date range to the hook", () => {
        render(<ClubUtilisationContainer />);
        expect(useClubDailyUtilisation).toHaveBeenCalledWith(
            "club-1",
            expect.objectContaining({ dateFrom: expect.any(String), dateTo: expect.any(String) })
        );
    });

    it("forwards points from the hook to the view", () => {
        render(<ClubUtilisationContainer />);
        expect(screen.getByText("days:1")).toBeInTheDocument();
    });

    it("refetches when refresh is triggered", () => {
        render(<ClubUtilisationContainer />);
        fireEvent.click(screen.getByText("refresh"));
        expect(refetch).toHaveBeenCalled();
    });

    it("updates the range label when the range changes", () => {
        render(<ClubUtilisationContainer />);
        fireEvent.click(screen.getByText("change-range"));
        expect(screen.getByText("range:2026-04-01")).toBeInTheDocument();
        expect(screen.getByText("label:1 Apr – 5 Apr")).toBeInTheDocument();
    });

    it("clamps incoming current or future ranges to yesterday", () => {
        const now = new Date();
        const yesterdayDate = new Date(now);
        yesterdayDate.setDate(now.getDate() - 1);
        const yesterday = `${yesterdayDate.getFullYear()}-${String(
            yesterdayDate.getMonth() + 1
        ).padStart(2, "0")}-${String(yesterdayDate.getDate()).padStart(2, "0")}`;

        render(<ClubUtilisationContainer />);
        fireEvent.click(screen.getByText("change-future-range"));

        const props = viewProps.mock.calls.at(-1)?.[0] as { range: { from: string; to: string } };
        expect(props.range).toEqual({ from: yesterday, to: yesterday });
    });

    it("handles a missing club id by passing an empty string", () => {
        useClubAccess.mockReturnValue({ clubId: null, role: "owner" });
        render(<ClubUtilisationContainer />);
        expect(useClubDailyUtilisation).toHaveBeenCalledWith("", expect.anything());
    });
});
