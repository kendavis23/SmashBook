import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import CourtUtilisationContainer from "./CourtUtilisationContainer";

const useClubCourtsUtilisation = vi.fn();
const useClubAccess = vi.fn();
const refetch = vi.fn();

vi.mock("../../hooks", () => ({
    useClubCourtsUtilisation: (clubId: string, range: unknown) =>
        useClubCourtsUtilisation(clubId, range),
}));

vi.mock("../../store", () => ({
    useClubAccess: () => useClubAccess(),
}));

// Capture props handed to the View instead of rendering the full chart tree.
const viewProps = vi.fn();
vi.mock("./CourtUtilisationView", () => ({
    default: (props: Record<string, unknown>) => {
        viewProps(props);
        return (
            <div>
                <span>range:{String((props.range as { from: string }).from)}</span>
                <span>label:{String(props.rangeLabel)}</span>
                <span>courts:{String(props.courtCount)}</span>
                <span>sort:{String(props.sortKey)}</span>
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
                <button onClick={() => (props.onSortChange as (k: string) => void)("revenue")}>
                    sort-revenue
                </button>
            </div>
        );
    },
}));

beforeEach(() => {
    vi.clearAllMocks();
    useClubAccess.mockReturnValue({ clubId: "club-1", role: "owner" });
    useClubCourtsUtilisation.mockReturnValue({
        data: {
            courts: [
                {
                    court_id: "a",
                    court_name: "Court A",
                    total_slots: 100,
                    booked_slots: 60,
                    utilisation_pct: 60,
                    revenue_actual: 600,
                    revenue_potential: 1000,
                },
            ],
        },
        isLoading: false,
        error: null,
        refetch,
    });
});

describe("CourtUtilisationContainer", () => {
    it("defaults the date range to the last 30 completed calendar days", () => {
        const now = new Date();
        const yesterdayDate = new Date(now);
        yesterdayDate.setDate(now.getDate() - 1);
        const yesterday = `${yesterdayDate.getFullYear()}-${String(
            yesterdayDate.getMonth() + 1
        ).padStart(2, "0")}-${String(yesterdayDate.getDate()).padStart(2, "0")}`;
        const fromDate = new Date(yesterdayDate);
        fromDate.setDate(yesterdayDate.getDate() - 30);
        const thirtyDaysAgo = `${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(
            2,
            "0"
        )}-${String(fromDate.getDate()).padStart(2, "0")}`;

        render(<CourtUtilisationContainer />);
        const props = viewProps.mock.calls[0]?.[0] as { range: { from: string; to: string } };
        expect(props.range.from).toBe(thirtyDaysAgo);
        expect(props.range.to).toBe(yesterday);
    });

    it("passes the club id and date range to the hook", () => {
        render(<CourtUtilisationContainer />);
        expect(useClubCourtsUtilisation).toHaveBeenCalledWith(
            "club-1",
            expect.objectContaining({ dateFrom: expect.any(String), dateTo: expect.any(String) })
        );
    });

    it("forwards the court count from the hook to the view", () => {
        render(<CourtUtilisationContainer />);
        expect(screen.getByText("courts:1")).toBeInTheDocument();
    });

    it("refetches when refresh is triggered", () => {
        render(<CourtUtilisationContainer />);
        fireEvent.click(screen.getByText("refresh"));
        expect(refetch).toHaveBeenCalled();
    });

    it("updates the range label when the range changes", () => {
        render(<CourtUtilisationContainer />);
        fireEvent.click(screen.getByText("change-range"));
        expect(screen.getByText("range:2026-04-01")).toBeInTheDocument();
        expect(screen.getByText("label:1 Apr – 5 Apr")).toBeInTheDocument();
    });

    it("updates the sort key when sort changes", () => {
        render(<CourtUtilisationContainer />);
        fireEvent.click(screen.getByText("sort-revenue"));
        expect(screen.getByText("sort:revenue")).toBeInTheDocument();
    });

    it("handles a missing club id by passing an empty string", () => {
        useClubAccess.mockReturnValue({ clubId: null, role: "owner" });
        render(<CourtUtilisationContainer />);
        expect(useClubCourtsUtilisation).toHaveBeenCalledWith("", expect.anything());
    });
});
