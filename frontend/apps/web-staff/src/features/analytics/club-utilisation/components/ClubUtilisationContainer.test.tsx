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
    it("defaults the date range to today for both from and to", () => {
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
            now.getDate()
        ).padStart(2, "0")}`;
        render(<ClubUtilisationContainer />);
        const props = viewProps.mock.calls[0]?.[0] as { range: { from: string; to: string } };
        expect(props.range.from).toBe(today);
        expect(props.range.to).toBe(today);
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

    it("handles a missing club id by passing an empty string", () => {
        useClubAccess.mockReturnValue({ clubId: null, role: "owner" });
        render(<ClubUtilisationContainer />);
        expect(useClubDailyUtilisation).toHaveBeenCalledWith("", expect.anything());
    });
});
