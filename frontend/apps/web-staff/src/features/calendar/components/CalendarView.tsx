import type { JSX } from "react";
import { Breadcrumb } from "@repo/ui";
import { ChevronLeft, ChevronRight, CalendarDays, RefreshCw } from "lucide-react";
import type { CalendarView as CalendarViewData, CalendarViewMode } from "../types";
import { CALENDAR_VIEW_MODES, formatShortDate } from "../types";
import CalendarDayColumn from "./CalendarDayColumn";

type Props = {
    calendarData: CalendarViewData | null;
    isLoading: boolean;
    error: Error | null;
    viewMode: CalendarViewMode;
    anchorDate: string;
    dateFrom: string;
    dateTo: string;
    onPrev: () => void;
    onNext: () => void;
    onToday: () => void;
    onViewModeChange: (mode: CalendarViewMode) => void;
    onRefresh: () => void;
};

export default function CalendarView({
    calendarData,
    isLoading,
    error,
    viewMode,
    anchorDate,
    dateFrom,
    dateTo,
    onPrev,
    onNext,
    onToday,
    onViewModeChange,
    onRefresh,
}: Props): JSX.Element {
    const rangeLabel =
        viewMode === "day"
            ? formatShortDate(anchorDate)
            : `${formatShortDate(dateFrom)} – ${formatShortDate(dateTo)}`;

    const dayCount = calendarData?.days.length ?? 7;

    return (
        <div className="w-full space-y-5">
            <Breadcrumb items={[{ label: "Operations" }, { label: "Calendar" }]} />

            <section className="w-full rounded-xl border border-border bg-card shadow-sm">
                {/* Header */}
                <header className="flex flex-col gap-4 border-b border-border px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                        <h1 className="text-xl font-semibold tracking-tight text-foreground">
                            Calendar
                        </h1>
                        <p className="mt-0.5 text-sm text-muted-foreground">{rangeLabel}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* View mode toggle */}
                        <div className="flex rounded-lg border border-border bg-muted/30 p-0.5">
                            {CALENDAR_VIEW_MODES.map((mode) => (
                                <button
                                    key={mode.id}
                                    onClick={() => onViewModeChange(mode.id)}
                                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
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

                        {/* Navigation */}
                        <div className="flex items-center gap-1">
                            <button
                                onClick={onPrev}
                                aria-label="Previous"
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            <button
                                onClick={onToday}
                                className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
                            >
                                Today
                            </button>
                            <button
                                onClick={onNext}
                                aria-label="Next"
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>

                        <button
                            onClick={onRefresh}
                            aria-label="Refresh calendar"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        >
                            <RefreshCw size={14} />
                        </button>
                    </div>
                </header>

                {/* Content */}
                <div className="p-4 sm:p-5">
                    {isLoading ? (
                        <div className="flex items-center justify-center gap-3 py-24">
                            <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-cta" />
                            <span className="text-sm text-muted-foreground">Loading calendar…</span>
                        </div>
                    ) : error ? (
                        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
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
                    ) : (
                        /* Responsive grid — no horizontal scroll for ≤7 days */
                        <div
                            className="grid gap-3"
                            style={{
                                gridTemplateColumns: `repeat(${dayCount}, minmax(0, 1fr))`,
                            }}
                        >
                            {calendarData.days.map((day) => (
                                <CalendarDayColumn key={day.date} day={day} />
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
