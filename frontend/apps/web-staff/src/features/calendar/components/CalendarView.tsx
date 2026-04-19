import type { JSX } from "react";
import { Breadcrumb, SelectInput } from "@repo/ui";
import { ChevronLeft, ChevronRight, CalendarDays, RefreshCw } from "lucide-react";
import type { CalendarView as CalendarViewData, CalendarViewMode } from "../types";
import { CALENDAR_VIEW_MODES, formatShortDate } from "../types";
import WeekTimelineBoard from "./WeekTimelineBoard";
import DayTimelineBoard from "./DayTimelineBoard";

type Props = {
    calendarData: CalendarViewData | null;
    isLoading: boolean;
    error: Error | null;
    viewMode: CalendarViewMode;
    anchorDate: string;
    dateFrom: string;
    dateTo: string;
    courts: { id: string; name: string }[];
    selectedCourtId: string;
    onPrev: () => void;
    onNext: () => void;
    onToday: () => void;
    onViewModeChange: (mode: CalendarViewMode) => void;
    onRefresh: () => void;
    onCourtChange: (courtId: string) => void;
    onManageClick: (bookingId: string) => void;
    onManageReservationClick: (reservationId: string) => void;
};

export default function CalendarView({
    calendarData,
    isLoading,
    error,
    viewMode,
    anchorDate,
    dateFrom,
    dateTo,
    courts,
    selectedCourtId,
    onPrev,
    onNext,
    onToday,
    onViewModeChange,
    onRefresh,
    onCourtChange,
    onManageClick,
    onManageReservationClick,
}: Props): JSX.Element {
    const rangeLabel =
        viewMode === "day"
            ? formatShortDate(anchorDate)
            : `${formatShortDate(dateFrom)} – ${formatShortDate(dateTo)}`;

    return (
        <div className="flex h-[calc(100vh-var(--nav-height)-var(--page-padding)-var(--page-padding))] flex-col gap-5">
            <Breadcrumb items={[{ label: "Calendar" }]} />

            <section className="card-surface flex min-h-0 flex-1 flex-col overflow-hidden">
                {/* Header */}
                <header className="flex flex-col gap-3 border-b border-border bg-muted/10 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 shrink-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground shadow-xs">
                                <CalendarDays size={16} />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-lg font-semibold tracking-tight text-foreground">
                                    Calendar
                                </h1>
                                <p className="mt-0.5 text-sm text-muted-foreground">{rangeLabel}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Court picker — week view only */}
                        {viewMode === "week" && courts.length > 0 ? (
                            <>
                                <SelectInput
                                    value={selectedCourtId}
                                    onValueChange={(v) => onCourtChange(v)}
                                    options={courts.map((c) => ({ value: c.id, label: c.name }))}
                                    aria-label="Select court"
                                    className="w-[300px]"
                                />
                                <span className="h-5 w-px bg-border" />
                            </>
                        ) : null}

                        {/* View mode toggle */}
                        <div className="flex rounded-lg border border-border bg-muted/30 p-0.5">
                            {CALENDAR_VIEW_MODES.map((mode) => (
                                <button
                                    key={mode.id}
                                    onClick={() => onViewModeChange(mode.id)}
                                    className={`rounded-md px-3 py-2 text-xs font-medium transition ${
                                        viewMode === mode.id
                                            ? "bg-card text-foreground shadow-sm"
                                            : "text-muted-foreground hover:text-foreground"
                                    }`}
                                    aria-pressed={viewMode === mode.id}
                                >
                                    {mode.label}
                                </button>
                            ))}
                        </div>

                        {/* Navigation + Refresh */}
                        <div className="flex items-center">
                            <button
                                onClick={onPrev}
                                aria-label="Previous"
                                className="flex h-9 w-9 items-center justify-center rounded-l-lg border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            <button
                                onClick={onToday}
                                className="-mx-px h-9 border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted"
                            >
                                Today
                            </button>
                            <button
                                onClick={onNext}
                                aria-label="Next"
                                className="flex h-9 w-9 items-center justify-center border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground"
                            >
                                <ChevronRight size={14} />
                            </button>
                            <span className="-mx-px h-9 w-px bg-border" />
                            <button
                                onClick={onRefresh}
                                aria-label="Refresh calendar"
                                className="flex h-9 w-9 items-center justify-center rounded-r-lg border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground"
                            >
                                <RefreshCw size={14} />
                            </button>
                        </div>
                    </div>
                </header>

                {/* Content */}
                <div className="flex min-h-0 flex-1 flex-col">
                    {isLoading ? (
                        <div className="flex items-center justify-center gap-3 py-24">
                            <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-cta" />
                            <span className="text-sm text-muted-foreground">Loading calendar…</span>
                        </div>
                    ) : error ? (
                        <div className="m-5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                            {error.message}
                        </div>
                    ) : !calendarData || calendarData.days.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-center">
                            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                                <CalendarDays size={24} className="text-muted-foreground/40" />
                            </div>
                            <h3 className="text-sm font-semibold text-foreground">No bookings</h3>
                            <p className="mt-1.5 max-w-xs text-xs text-muted-foreground">
                                No bookings found for this period.
                            </p>
                        </div>
                    ) : viewMode === "week" ? (
                        <WeekTimelineBoard
                            days={calendarData.days}
                            selectedCourtId={selectedCourtId}
                            onManageClick={onManageClick}
                            onManageReservationClick={onManageReservationClick}
                        />
                    ) : (
                        <div className="flex min-h-0 flex-1 flex-col">
                            {calendarData.days.map((day) => (
                                <DayTimelineBoard
                                    key={day.date}
                                    day={day}
                                    onManageClick={onManageClick}
                                    onManageReservationClick={onManageReservationClick}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
