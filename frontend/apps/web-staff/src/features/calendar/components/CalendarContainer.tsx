import { useState, useCallback } from "react";
import type { JSX } from "react";
import { useGetCalendarView } from "../hooks";
import { useClubAccess } from "../store";
import type { CalendarViewMode } from "../types";
import { todayIso, getWeekStart, getWeekEnd, addDays } from "../types";
import CalendarView from "./CalendarView";

export default function CalendarContainer(): JSX.Element {
    const { clubId } = useClubAccess();
    const [viewMode, setViewMode] = useState<CalendarViewMode>("week");
    const [anchorDate, setAnchorDate] = useState<string>(todayIso);

    const dateFrom = viewMode === "week" ? getWeekStart(anchorDate) : anchorDate;
    const dateTo = viewMode === "week" ? getWeekEnd(anchorDate) : anchorDate;

    const { data, isLoading, error, refetch } = useGetCalendarView(clubId ?? "", {
        view: viewMode,
        anchor_date: anchorDate,
    });

    const handlePrev = useCallback((): void => {
        setAnchorDate((prev) => addDays(prev, viewMode === "week" ? -7 : -1));
    }, [viewMode]);

    const handleNext = useCallback((): void => {
        setAnchorDate((prev) => addDays(prev, viewMode === "week" ? 7 : 1));
    }, [viewMode]);

    const handleToday = useCallback((): void => {
        setAnchorDate(todayIso());
    }, []);

    const handleViewModeChange = useCallback((mode: CalendarViewMode): void => {
        setViewMode(mode);
    }, []);

    const handleRefresh = useCallback((): void => {
        void refetch();
    }, [refetch]);

    return (
        <CalendarView
            calendarData={data ?? null}
            isLoading={isLoading}
            error={error as Error | null}
            viewMode={viewMode}
            anchorDate={anchorDate}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onPrev={handlePrev}
            onNext={handleNext}
            onToday={handleToday}
            onViewModeChange={handleViewModeChange}
            onRefresh={handleRefresh}
        />
    );
}
