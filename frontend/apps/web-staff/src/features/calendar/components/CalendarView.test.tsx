import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CalendarView from "./CalendarView";
import type { CalendarView as CalendarViewData } from "../types";

vi.mock("@repo/ui", () => ({
    Breadcrumb: ({ items }: { items: { label: string }[] }) => (
        <nav>
            {items.map((i) => (
                <span key={i.label}>{i.label}</span>
            ))}
        </nav>
    ),
}));

vi.mock("./CalendarDayColumn", () => ({
    default: ({ day }: { day: { date: string } }) => <div data-testid="day-col">{day.date}</div>,
}));

const baseProps = {
    calendarData: null,
    isLoading: false,
    error: null,
    viewMode: "week" as const,
    anchorDate: "2026-04-06",
    dateFrom: "2026-04-06",
    dateTo: "2026-04-12",
    onPrev: vi.fn(),
    onNext: vi.fn(),
    onToday: vi.fn(),
    onViewModeChange: vi.fn(),
    onRefresh: vi.fn(),
};

const mockCalendarData: CalendarViewData = {
    view: "week",
    date_from: "2026-04-06",
    date_to: "2026-04-12",
    days: [
        { date: "2026-04-06", courts: [] },
        { date: "2026-04-07", courts: [] },
    ],
};

describe("CalendarView — loading state", () => {
    it("shows loading spinner", () => {
        render(<CalendarView {...baseProps} isLoading={true} />);
        expect(screen.getByText("Loading calendar…")).toBeInTheDocument();
    });
});

describe("CalendarView — error state", () => {
    it("shows error message", () => {
        render(<CalendarView {...baseProps} error={new Error("Failed to load")} />);
        expect(screen.getByText("Failed to load")).toBeInTheDocument();
    });
});

describe("CalendarView — empty state", () => {
    it("shows no bookings message when data has no days", () => {
        const emptyData: CalendarViewData = {
            view: "week",
            date_from: "2026-04-06",
            date_to: "2026-04-12",
            days: [],
        };
        render(<CalendarView {...baseProps} calendarData={emptyData} />);
        expect(screen.getByText("No bookings")).toBeInTheDocument();
    });

    it("shows no bookings message when calendarData is null", () => {
        render(<CalendarView {...baseProps} calendarData={null} />);
        expect(screen.getByText("No bookings")).toBeInTheDocument();
    });
});

describe("CalendarView — data state", () => {
    it("renders a day column for each day", () => {
        render(<CalendarView {...baseProps} calendarData={mockCalendarData} />);
        const cols = screen.getAllByTestId("day-col");
        expect(cols).toHaveLength(2);
    });

    it("renders breadcrumb with correct labels", () => {
        render(<CalendarView {...baseProps} calendarData={mockCalendarData} />);
        expect(screen.getByText("Operations")).toBeInTheDocument();
        expect(screen.getAllByText("Calendar").length).toBeGreaterThanOrEqual(1);
    });
});

describe("CalendarView — user events", () => {
    it("calls onPrev when Previous button clicked", () => {
        const onPrev = vi.fn();
        render(<CalendarView {...baseProps} onPrev={onPrev} />);
        fireEvent.click(screen.getByLabelText("Previous"));
        expect(onPrev).toHaveBeenCalledTimes(1);
    });

    it("calls onNext when Next button clicked", () => {
        const onNext = vi.fn();
        render(<CalendarView {...baseProps} onNext={onNext} />);
        fireEvent.click(screen.getByLabelText("Next"));
        expect(onNext).toHaveBeenCalledTimes(1);
    });

    it("calls onToday when Today button clicked", () => {
        const onToday = vi.fn();
        render(<CalendarView {...baseProps} onToday={onToday} />);
        fireEvent.click(screen.getByText("Today"));
        expect(onToday).toHaveBeenCalledTimes(1);
    });

    it("calls onRefresh when Refresh button clicked", () => {
        const onRefresh = vi.fn();
        render(<CalendarView {...baseProps} onRefresh={onRefresh} />);
        fireEvent.click(screen.getByLabelText("Refresh calendar"));
        expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    it("calls onViewModeChange with 'day' when Day button clicked", () => {
        const onViewModeChange = vi.fn();
        render(<CalendarView {...baseProps} onViewModeChange={onViewModeChange} />);
        fireEvent.click(screen.getByText("Day"));
        expect(onViewModeChange).toHaveBeenCalledWith("day");
    });

    it("calls onViewModeChange with 'week' when Week button clicked", () => {
        const onViewModeChange = vi.fn();
        render(<CalendarView {...baseProps} onViewModeChange={onViewModeChange} />);
        fireEvent.click(screen.getByText("Week"));
        expect(onViewModeChange).toHaveBeenCalledWith("week");
    });
});
