import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import CalendarContainer from "./CalendarContainer";
import type { CalendarView } from "../types";

const mockRefetch = vi.fn();
const mockUseGetCalendarView = vi.fn();

vi.mock("../hooks", () => ({
    useGetCalendarView: (...args: unknown[]) => mockUseGetCalendarView(...args),
    useListCourts: () => ({ data: [] }),
}));

vi.mock("../store", () => ({
    useClubAccess: () => ({ clubId: "club-1", role: "admin" }),
}));

vi.mock("@repo/ui", () => ({
    AlertToast: ({ title }: { title: string }) => <div role="alert">{title}</div>,
}));

vi.mock("../../booking/manage-booking/components/ManageBookingModal", () => ({
    ManageBookingModal: ({ bookingId }: { bookingId: string }) => (
        <div data-testid="manage-booking-modal">{bookingId}</div>
    ),
}));

vi.mock("../../reservation/manage-reservation/components/ManageReservationModal", () => ({
    ManageReservationModal: ({ reservationId }: { reservationId: string }) => (
        <div data-testid="manage-reservation-modal">{reservationId}</div>
    ),
}));

vi.mock("./NewCalendarSlotModal", () => ({
    NewCalendarSlotModal: ({
        context,
    }: {
        context: { courtId: string; date: string; startTime: string };
    }) => (
        <div data-testid="new-calendar-slot-modal">{`${context.courtId}|${context.date}|${context.startTime}`}</div>
    ),
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
        onManageReservationClick,
        onNewSlotClick,
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
        onManageReservationClick: (id: string) => void;
        onNewSlotClick: (
            courtId: string,
            courtName: string,
            date: string,
            startTime: string
        ) => void;
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
            <button onClick={() => onManageReservationClick("reservation-1")}>
                manage-reservation
            </button>
            <button onClick={() => onNewSlotClick("court-1", "Court 1", "2026-04-20", "10:00")}>
                new-slot
            </button>
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

    it("opens ManageBookingModal when manage is clicked", () => {
        render(<CalendarContainer />);
        fireEvent.click(screen.getByText("manage"));
        expect(screen.getByTestId("manage-booking-modal")).toHaveTextContent("booking-1");
    });

    it("opens ManageReservationModal when manage-reservation is clicked", () => {
        render(<CalendarContainer />);
        fireEvent.click(screen.getByText("manage-reservation"));
        expect(screen.getByTestId("manage-reservation-modal")).toHaveTextContent("reservation-1");
    });

    it("opens NewCalendarSlotModal when new-slot is clicked", () => {
        render(<CalendarContainer />);
        fireEvent.click(screen.getByText("new-slot"));
        expect(screen.getByTestId("new-calendar-slot-modal")).toHaveTextContent(
            "court-1|2026-04-20|10:00"
        );
    });
});
