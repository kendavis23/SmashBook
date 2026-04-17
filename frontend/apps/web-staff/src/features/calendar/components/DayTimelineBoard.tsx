import { useEffect, useRef, useState, type JSX } from "react";
import type { CalendarCourtColumn, CalendarDay } from "../types";
import {
    CALENDAR_COURT_LANE_MIN_WIDTH,
    CALENDAR_SLOT_ROW_HEIGHT,
    CALENDAR_TIME_RAIL_WIDTH,
    CALENDAR_TIME_SLOTS,
    formatLongDate,
    formatSlotTime,
    formatWeekday,
    getMinutesFromTime,
    todayIso,
} from "../types";
import CalendarBookingBlock from "./CalendarBookingBlock";

type Props = {
    day: CalendarDay;
    onManageClick: (bookingId: string) => void;
};

function useCurrentTimeMinutes(): number {
    const [minutes, setMinutes] = useState(() => {
        const now = new Date();
        return now.getHours() * 60 + now.getMinutes();
    });
    useEffect(() => {
        const id = setInterval(() => {
            const now = new Date();
            setMinutes(now.getHours() * 60 + now.getMinutes());
        }, 60_000);
        return () => clearInterval(id);
    }, []);
    return minutes;
}

export default function DayTimelineBoard({ day, onManageClick }: Props): JSX.Element {
    const isToday = day.date === todayIso();
    const totalBookings = day.courts.reduce((sum, court) => sum + court.bookings.length, 0);
    const currentTimeMinutes = useCurrentTimeMinutes();
    const scrollRef = useRef<HTMLDivElement>(null);

    const firstSlot = CALENDAR_TIME_SLOTS[0];
    const lastSlot = CALENDAR_TIME_SLOTS[CALENDAR_TIME_SLOTS.length - 1];

    const startOfDayMinutes = firstSlot ? getMinutesFromTime(firstSlot.start_time) : 0;
    const endOfDayMinutes = lastSlot ? getMinutesFromTime(lastSlot.end_time) : 0;
    const boardHeight = CALENDAR_TIME_SLOTS.length * CALENDAR_SLOT_ROW_HEIGHT;
    const gridTemplateColumns = `${CALENDAR_TIME_RAIL_WIDTH}px repeat(${Math.max(day.courts.length, 1)}, minmax(${CALENDAR_COURT_LANE_MIN_WIDTH}px, 1fr))`;

    const currentTimePct =
        firstSlot &&
        lastSlot &&
        currentTimeMinutes >= startOfDayMinutes &&
        currentTimeMinutes <= endOfDayMinutes
            ? ((currentTimeMinutes - startOfDayMinutes) / (endOfDayMinutes - startOfDayMinutes)) *
              100
            : null;

    // Scroll to current time on mount
    useEffect(() => {
        if (isToday && currentTimePct !== null && scrollRef.current) {
            const targetPx = (currentTimePct / 100) * boardHeight;
            const offset = Math.max(0, targetPx - 120);
            scrollRef.current.scrollTop = offset;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (!firstSlot || !lastSlot) {
        return (
            <div className="card-surface p-4 text-sm text-muted-foreground">
                No time slots configured.
            </div>
        );
    }

    return (
        <section className="card-surface overflow-hidden">
            <header
                className={`flex flex-col gap-3 border-b border-border px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between ${
                    isToday ? "bg-cta/5" : "bg-card"
                }`}
            >
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {formatWeekday(day.date)}
                    </p>
                    <h2 className="mt-0.5 text-base font-semibold text-foreground">
                        {formatLongDate(day.date)}
                    </h2>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-md bg-secondary px-2.5 py-1 font-medium text-secondary-foreground">
                        {day.courts.length} court{day.courts.length === 1 ? "" : "s"}
                    </span>
                    <span className="rounded-md bg-cta/10 px-2.5 py-1 font-medium text-cta">
                        {totalBookings} booking{totalBookings === 1 ? "" : "s"}
                    </span>
                </div>
            </header>

            {day.courts.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                    No courts found for this day.
                </div>
            ) : (
                <div
                    ref={scrollRef}
                    className="max-h-[calc(100vh-260px)] overflow-y-auto overflow-x-auto"
                >
                    <div className="min-w-fit">
                        {/* Column headers */}
                        <div
                            className="sticky top-0 z-30 grid border-b border-border bg-muted/20"
                            style={{ gridTemplateColumns }}
                        >
                            <div className="sticky left-0 z-20 flex items-center border-r border-border bg-card px-4 py-3">
                                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Time
                                </span>
                            </div>

                            {day.courts.map((court: CalendarCourtColumn) => (
                                <div
                                    key={court.court_id}
                                    className="border-r border-border/70 bg-card px-4 py-3 last:border-r-0"
                                >
                                    <p className="truncate text-sm font-semibold text-foreground">
                                        {court.court_name}
                                    </p>
                                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                                        {court.bookings.length === 0
                                            ? "No bookings"
                                            : `${court.bookings.length} booking${court.bookings.length === 1 ? "" : "s"}`}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Time rail + court lanes */}
                        <div className="relative grid" style={{ gridTemplateColumns }}>
                            {/* Current time indicator (full width overlay) */}
                            {isToday && currentTimePct !== null ? (
                                <div
                                    className="pointer-events-none absolute left-0 right-0 z-20 flex items-center"
                                    style={{ top: `${currentTimePct}%` }}
                                >
                                    <div
                                        className="flex-shrink-0"
                                        style={{ width: `${CALENDAR_TIME_RAIL_WIDTH}px` }}
                                    />
                                    <div className="h-2 w-2 flex-shrink-0 rounded-full bg-destructive" />
                                    <div className="h-px flex-1 bg-destructive" />
                                </div>
                            ) : null}

                            {/* Time rail */}
                            <div className="sticky left-0 z-10 border-r border-border bg-card">
                                {CALENDAR_TIME_SLOTS.map((slot) => (
                                    <div
                                        key={`${slot.start_time}-${slot.end_time}`}
                                        className="flex items-start border-b border-border/50 px-3 py-2 last:border-b-0"
                                        style={{ height: `${CALENDAR_SLOT_ROW_HEIGHT}px` }}
                                    >
                                        <p className="text-xs font-medium text-muted-foreground">
                                            {formatSlotTime(slot.start_time)}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            {/* Court columns */}
                            {day.courts.map((court: CalendarCourtColumn) => (
                                <div
                                    key={court.court_id}
                                    className="relative border-r border-border/70 last:border-r-0"
                                    style={{ height: `${boardHeight}px` }}
                                >
                                    {CALENDAR_TIME_SLOTS.map((slot) => (
                                        <div
                                            key={`${court.court_id}-${slot.start_time}`}
                                            className="border-b border-border/40 bg-background/60 last:border-b-0"
                                            style={{ height: `${CALENDAR_SLOT_ROW_HEIGHT}px` }}
                                        />
                                    ))}

                                    {court.bookings.map((booking) => (
                                        <CalendarBookingBlock
                                            key={booking.id}
                                            booking={booking}
                                            boardHeight={boardHeight}
                                            startOfDayMinutes={startOfDayMinutes}
                                            endOfDayMinutes={endOfDayMinutes}
                                            onManageClick={onManageClick}
                                        />
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
