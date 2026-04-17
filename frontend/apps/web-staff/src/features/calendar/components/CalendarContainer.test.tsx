import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import CalendarContainer from "./CalendarContainer";
import type { CalendarView } from "../types";

const mockRefetch = vi.fn();
const mockUseGetCalendarView = vi.fn();
const mockNavigate = vi.fn();

vi.mock("../hooks", () => ({
    useGetCalendarView: (...args: unknown[]) => mockUseGetCalendarView(...args),
    useListCourts: () => ({ data: [] }),
}));

vi.mock("../store", () => ({
    useClubAccess: () => ({ clubId: "club-1", role: "admin" }),
}));

vi.mock("@tanstack/react-router", () => ({
    useNavigate: () => mockNavigate,
}));

vi.mock("./CalendarView", () => ({
    default: ({
        isLoading,
        error,
        calendarData,
        onPrev,
        onNext,
        onToday,
        onViewModeChange,
        onRefresh,
        onManageClick,
    }: {
        isLoading: boolean;
        error: Error | null;
        calendarData: CalendarView | null;
        onPrev: () => void;
        onNext: () => void;
        onToday: () => void;
        onViewModeChange: (mode: string) => void;
        onRefresh: () => void;
        onManageClick: (id: string) => void;
    }) => (
        <div>
            {isLoading && <span>loading</span>}
            {error && <span>error: {error.message}</span>}
            {calendarData ? <span>has-data</span> : null}
            <button onClick={onPrev}>prev</button>
            <button onClick={onNext}>next</button>
            <button onClick={onToday}>today</button>
            <button onClick={() => onViewModeChange("day")}>day-mode</button>
            <button onClick={() => onViewModeChange("week")}>week-mode</button>
            <button onClick={onRefresh}>refresh</button>
            <button onClick={() => onManageClick("booking-1")}>manage</button>
        </div>
    ),
}));

describe("CalendarContainer — loading state", () => {
    beforeEach(() => {
        mockUseGetCalendarView.mockReturnValue({
            data: undefined,
            isLoading: true,
            error: null,
            refetch: mockRefetch,
        });
    });

    it("passes isLoading=true to view", () => {
        render(<CalendarContainer />);
        expect(screen.getByText("loading")).toBeInTheDocument();
    });
});

describe("CalendarContainer — error state", () => {
    beforeEach(() => {
        mockUseGetCalendarView.mockReturnValue({
            data: undefined,
            isLoading: false,
            error: new Error("Network error"),
            refetch: mockRefetch,
        });
    });

    it("passes error to view", () => {
        render(<CalendarContainer />);
        expect(screen.getByText("error: Network error")).toBeInTheDocument();
    });
});

describe("CalendarContainer — success state", () => {
    const mockData = {
        view: "week",
        date_from: "2026-04-06",
        date_to: "2026-04-12",
        days: [{ date: "2026-04-06", courts: [] }],
    };

    beforeEach(() => {
        mockUseGetCalendarView.mockReturnValue({
            data: mockData,
            isLoading: false,
            error: null,
            refetch: mockRefetch,
        });
    });

    it("passes data to view", () => {
        render(<CalendarContainer />);
        expect(screen.getByText("has-data")).toBeInTheDocument();
    });

    it("calls refetch when refresh is clicked", () => {
        render(<CalendarContainer />);
        fireEvent.click(screen.getByText("refresh"));
        expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it("calls useGetCalendarView with clubId", () => {
        render(<CalendarContainer />);
        expect(mockUseGetCalendarView).toHaveBeenCalledWith(
            "club-1",
            expect.objectContaining({ view: "week" })
        );
    });

    it("switches to day mode when day-mode button is clicked", () => {
        render(<CalendarContainer />);
        fireEvent.click(screen.getByText("day-mode"));
        expect(mockUseGetCalendarView).toHaveBeenCalledWith(
            "club-1",
            expect.objectContaining({ view: "day" })
        );
    });

    it("navigates to today", () => {
        render(<CalendarContainer />);
        fireEvent.click(screen.getByText("today"));
        expect(mockUseGetCalendarView).toHaveBeenCalled();
    });

    it("navigates to manage booking when manage is clicked", () => {
        render(<CalendarContainer />);
        fireEvent.click(screen.getByText("manage"));
        expect(mockNavigate).toHaveBeenCalledWith({
            to: "/bookings/$bookingId",
            params: { bookingId: "booking-1" },
        });
    });
});
