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
    SelectInput: ({
        value,
        onValueChange,
        options,
        placeholder,
        "aria-label": ariaLabel,
    }: {
        value: string;
        onValueChange: (v: string) => void;
        options: { value: string; label: string }[];
        placeholder?: string;
        "aria-label"?: string;
    }) => (
        <select
            value={value ?? ""}
            onChange={(e) => onValueChange(e.target.value)}
            aria-label={ariaLabel ?? placeholder ?? "select"}
        >
            {(options ?? []).map((o) => (
                <option key={o.value} value={o.value}>
                    {o.label}
                </option>
            ))}
        </select>
    ),
}));

vi.mock("./WeekTimelineBoard", () => ({
    default: ({ days }: { days: { date: string }[] }) => (
        <div data-testid="week-board">{days.map((d) => d.date).join(",")}</div>
    ),
}));

vi.mock("./DayTimelineBoard", () => ({
    default: ({ day }: { day: { date: string } }) => <div data-testid="day-board">{day.date}</div>,
}));

const baseProps = {
    calendarData: null,
    isLoading: false,
    error: null,
    viewMode: "week" as const,
    anchorDate: "2026-04-06",
    dateFrom: "2026-04-06",
    dateTo: "2026-04-12",
    courts: [],
    selectedCourtId: "",
    onPrev: vi.fn(),
    onNext: vi.fn(),
    onToday: vi.fn(),
    onViewModeChange: vi.fn(),
    onRefresh: vi.fn(),
    onCourtChange: vi.fn(),
    onManageClick: vi.fn(),
    onManageReservationClick: vi.fn(),
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

describe("CalendarView — week mode", () => {
    it("renders WeekTimelineBoard when viewMode is week", () => {
        render(<CalendarView {...baseProps} calendarData={mockCalendarData} />);
        expect(screen.getByTestId("week-board")).toBeInTheDocument();
    });

    it("does not render DayTimelineBoard in week mode", () => {
        render(<CalendarView {...baseProps} calendarData={mockCalendarData} />);
        expect(screen.queryByTestId("day-board")).not.toBeInTheDocument();
    });

    it("shows court picker when courts are available in week mode", () => {
        render(
            <CalendarView
                {...baseProps}
                calendarData={mockCalendarData}
                courts={[{ id: "c1", name: "Court 1" }]}
            />
        );
        expect(screen.getByLabelText("Select court")).toBeInTheDocument();
    });

    it("calls onCourtChange when court picker changes", () => {
        const onCourtChange = vi.fn();
        render(
            <CalendarView
                {...baseProps}
                calendarData={mockCalendarData}
                courts={[{ id: "c1", name: "Court 1" }]}
                onCourtChange={onCourtChange}
            />
        );
        fireEvent.change(screen.getByLabelText("Select court"), { target: { value: "c1" } });
        expect(onCourtChange).toHaveBeenCalledWith("c1");
    });
});

describe("CalendarView — day mode", () => {
    it("renders DayTimelineBoard for each day in day mode", () => {
        render(<CalendarView {...baseProps} viewMode="day" calendarData={mockCalendarData} />);
        const boards = screen.getAllByTestId("day-board");
        expect(boards).toHaveLength(2);
    });

    it("does not render WeekTimelineBoard in day mode", () => {
        render(<CalendarView {...baseProps} viewMode="day" calendarData={mockCalendarData} />);
        expect(screen.queryByTestId("week-board")).not.toBeInTheDocument();
    });

    it("does not show court picker in day mode", () => {
        render(
            <CalendarView
                {...baseProps}
                viewMode="day"
                calendarData={mockCalendarData}
                courts={[{ id: "c1", name: "Court 1" }]}
            />
        );
        expect(screen.queryByLabelText("Select court")).not.toBeInTheDocument();
    });
});

describe("CalendarView — breadcrumb", () => {
    it("renders breadcrumb with correct labels", () => {
        render(<CalendarView {...baseProps} calendarData={mockCalendarData} />);
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
