import { useEffect, useRef, useState, type JSX } from "react";
import type { CalendarBlockItem, CalendarBookingItem, CalendarDay } from "../types";
import {
    CALENDAR_SLOT_ROW_HEIGHT,
    CALENDAR_TIME_RAIL_WIDTH,
    CALENDAR_TIME_SLOTS,
    formatShortDate,
    formatSlotTime,
    getMinutesFromTime,
    todayIso,
} from "../types";
import CalendarBookingBlock from "./CalendarBookingBlock";
import CalendarReservationBlock from "./CalendarReservationBlock";

type Props = {
    days: CalendarDay[];
    selectedCourtId: string;
    onManageClick: (bookingId: string) => void;
    onManageReservationClick: (reservationId: string) => void;
};

const DAY_COLUMN_MIN_WIDTH = 140;

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

export default function WeekTimelineBoard({
    days,
    selectedCourtId,
    onManageClick,
    onManageReservationClick,
}: Props): JSX.Element {
    const scrollRef = useRef<HTMLDivElement>(null);
    const currentTimeMinutes = useCurrentTimeMinutes();

    const firstSlot = CALENDAR_TIME_SLOTS[0];
    const lastSlot = CALENDAR_TIME_SLOTS[CALENDAR_TIME_SLOTS.length - 1];

    const startOfDayMinutes = firstSlot ? getMinutesFromTime(firstSlot.start_time) : 0;
    const endOfDayMinutes = lastSlot ? getMinutesFromTime(lastSlot.end_time) : 0;
    const boardHeight = CALENDAR_TIME_SLOTS.length * CALENDAR_SLOT_ROW_HEIGHT;

    const gridTemplateColumns = `${CALENDAR_TIME_RAIL_WIDTH}px repeat(${Math.max(days.length, 1)}, minmax(${DAY_COLUMN_MIN_WIDTH}px, 1fr))`;

    const currentTimePct =
        firstSlot &&
        lastSlot &&
        currentTimeMinutes >= startOfDayMinutes &&
        currentTimeMinutes <= endOfDayMinutes
            ? ((currentTimeMinutes - startOfDayMinutes) / (endOfDayMinutes - startOfDayMinutes)) *
              100
            : null;

    const hasToday = days.some((d) => d.date === todayIso());

    // Scroll to current time on mount
    useEffect(() => {
        if (hasToday && currentTimePct !== null && scrollRef.current) {
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

    function getBookingsForDay(day: CalendarDay): CalendarBookingItem[] {
        const slots = selectedCourtId
            ? (day.courts.find((c) => c.court_id === selectedCourtId)?.slots ?? [])
            : day.courts.flatMap((c) => c.slots);
        return slots.filter((s): s is CalendarBookingItem => s.kind === "booking");
    }

    function getBlocksForDay(day: CalendarDay): CalendarBlockItem[] {
        const slots = selectedCourtId
            ? (day.courts.find((c) => c.court_id === selectedCourtId)?.slots ?? [])
            : day.courts.flatMap((c) => c.slots);
        return slots.filter((s): s is CalendarBlockItem => s.kind === "block");
    }

    return (
        <section className="isolate flex min-h-0 flex-1 flex-col overflow-hidden">
            {/* Single scroll container — header and body share horizontal scroll so borders align */}
            <div ref={scrollRef} className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
                <div className="min-w-fit">
                    {/* Sticky day-column header row */}
                    <div
                        className="sticky top-0 z-30 grid border-b border-border bg-card"
                        style={{ gridTemplateColumns }}
                    >
                        <div className="sticky left-0 z-40 flex items-center border-r border-border bg-card px-4 py-3">
                            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Time
                            </span>
                        </div>

                        {days.map((day) => {
                            const isToday = day.date === todayIso();
                            const bookings = getBookingsForDay(day);
                            const [, , dayNum] = day.date.split("-");
                            const weekday = formatShortDate(day.date).split(",")[0] ?? "";
                            const dateNum = parseInt(dayNum ?? "0", 10);
                            const monthLabel = formatShortDate(day.date).split(" ")[1] ?? "";

                            return (
                                <div
                                    key={day.date}
                                    className={`border-r border-border/70 px-3 py-3 text-center last:border-r-0 ${
                                        isToday ? "bg-cta/5" : "bg-card"
                                    }`}
                                >
                                    <p
                                        className={`text-[11px] font-semibold uppercase tracking-widest ${
                                            isToday ? "text-cta" : "text-muted-foreground"
                                        }`}
                                    >
                                        {weekday}
                                    </p>
                                    <div className="flex items-baseline justify-center gap-1">
                                        <p
                                            className={`text-base font-semibold leading-none ${
                                                isToday ? "text-cta" : "text-foreground"
                                            }`}
                                        >
                                            {dateNum}
                                        </p>
                                        <p
                                            className={`text-xs font-medium ${
                                                isToday ? "text-cta/70" : "text-muted-foreground"
                                            }`}
                                        >
                                            {monthLabel}
                                        </p>
                                    </div>
                                    <p
                                        className={`mt-0.5 text-[10px] ${isToday ? "text-cta/70" : "text-muted-foreground"}`}
                                    >
                                        {bookings.length === 0
                                            ? "No bookings"
                                            : `${bookings.length} booking${bookings.length === 1 ? "" : "s"}`}
                                    </p>
                                </div>
                            );
                        })}
                    </div>

                    {/* Time rail + day columns */}
                    <div className="relative grid" style={{ gridTemplateColumns }}>
                        {/* Current time indicator */}
                        {hasToday && currentTimePct !== null ? (
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
                        <div className="sticky left-0 z-10 overflow-hidden border-r border-border bg-card">
                            {CALENDAR_TIME_SLOTS.map((slot) => (
                                <div
                                    key={`${slot.start_time}-${slot.end_time}`}
                                    className="flex items-start border-b border-border/50 px-3 pt-1.5 last:border-b-0"
                                    style={{ height: `${CALENDAR_SLOT_ROW_HEIGHT}px` }}
                                >
                                    <p className="w-full whitespace-nowrap text-right text-xs font-medium text-muted-foreground">
                                        {formatSlotTime(slot.start_time)}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Day columns */}
                        {days.map((day) => {
                            const bookings = getBookingsForDay(day);
                            const blocks = getBlocksForDay(day);

                            return (
                                <div
                                    key={day.date}
                                    className="relative border-r border-border/70 last:border-r-0"
                                    style={{ height: `${boardHeight}px` }}
                                >
                                    {CALENDAR_TIME_SLOTS.map((slot) => (
                                        <div
                                            key={`${day.date}-${slot.start_time}`}
                                            className="border-b border-border/40 bg-background/60 last:border-b-0"
                                            style={{ height: `${CALENDAR_SLOT_ROW_HEIGHT}px` }}
                                        />
                                    ))}

                                    {bookings.map((booking) => (
                                        <CalendarBookingBlock
                                            key={booking.id}
                                            booking={booking}
                                            boardHeight={boardHeight}
                                            startOfDayMinutes={startOfDayMinutes}
                                            endOfDayMinutes={endOfDayMinutes}
                                            onManageClick={onManageClick}
                                        />
                                    ))}

                                    {blocks.map((block) => (
                                        <CalendarReservationBlock
                                            key={block.id}
                                            block={block}
                                            boardHeight={boardHeight}
                                            startOfDayMinutes={startOfDayMinutes}
                                            endOfDayMinutes={endOfDayMinutes}
                                            onManageClick={onManageReservationClick}
                                        />
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}
