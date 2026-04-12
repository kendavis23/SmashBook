import type { JSX } from "react";
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
};

export default function CalendarTimelineBoard({ day }: Props): JSX.Element {
    const isToday = day.date === todayIso();
    const totalBookings = day.courts.reduce((sum, court) => sum + court.bookings.length, 0);
    const bookedCourtCount = day.courts.filter((court) => court.bookings.length > 0).length;
    const firstSlot = CALENDAR_TIME_SLOTS[0];
    const lastSlot = CALENDAR_TIME_SLOTS[CALENDAR_TIME_SLOTS.length - 1];

    if (!firstSlot || !lastSlot) {
        return (
            <div className="card-surface p-4 text-sm text-muted-foreground">
                No time slots configured.
            </div>
        );
    }

    const startOfDayMinutes = getMinutesFromTime(firstSlot.start_time);
    const endOfDayMinutes = getMinutesFromTime(lastSlot.end_time);
    const boardHeight = CALENDAR_TIME_SLOTS.length * CALENDAR_SLOT_ROW_HEIGHT;
    const gridTemplateColumns = `${CALENDAR_TIME_RAIL_WIDTH}px repeat(${Math.max(day.courts.length, 1)}, minmax(${CALENDAR_COURT_LANE_MIN_WIDTH}px, 1fr))`;

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
                    <span className="rounded-md bg-muted px-2.5 py-1 font-medium text-muted-foreground">
                        {bookedCourtCount} active lane{bookedCourtCount === 1 ? "" : "s"}
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
                <div className="overflow-x-auto">
                    <div className="min-w-fit">
                        <div
                            className="grid border-b border-border bg-muted/20"
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
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-foreground">
                                                {court.court_name}
                                            </p>
                                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                                                {court.bookings.length === 0
                                                    ? "No bookings"
                                                    : `${court.bookings.length} booked slot${court.bookings.length === 1 ? "" : "s"}`}
                                            </p>
                                        </div>
                                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                            {court.bookings.length}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="grid" style={{ gridTemplateColumns }}>
                            <div className="sticky left-0 z-10 border-r border-border bg-card">
                                {CALENDAR_TIME_SLOTS.map((slot) => (
                                    <div
                                        key={`${slot.start_time}-${slot.end_time}`}
                                        className="flex h-[84px] flex-col justify-between border-b border-border/70 px-4 py-2 last:border-b-0"
                                    >
                                        <p className="text-xs font-semibold text-foreground">
                                            {formatSlotTime(slot.start_time)}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground">
                                            {formatSlotTime(slot.end_time)}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            {day.courts.map((court: CalendarCourtColumn) => (
                                <div
                                    key={court.court_id}
                                    className="relative border-r border-border/70 bg-card/30 last:border-r-0"
                                    style={{ height: `${boardHeight}px` }}
                                >
                                    {CALENDAR_TIME_SLOTS.map((slot, index) => (
                                        <div
                                            key={`${court.court_id}-${slot.start_time}-${slot.end_time}`}
                                            className={`h-[84px] border-b border-border/70 last:border-b-0 ${
                                                index % 2 === 0 ? "bg-background/70" : "bg-muted/10"
                                            }`}
                                        />
                                    ))}

                                    {court.bookings.map((booking) => (
                                        <CalendarBookingBlock
                                            key={booking.id}
                                            boardHeight={boardHeight}
                                            booking={booking}
                                            endOfDayMinutes={endOfDayMinutes}
                                            startOfDayMinutes={startOfDayMinutes}
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
