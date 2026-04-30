import { memo, useEffect, useMemo, useRef, useState, type JSX } from "react";
import type {
    CalendarBlockItem,
    CalendarBookingItem,
    CalendarDay,
    CalendarTimeSlot,
} from "../types";
import {
    CALENDAR_TIME_SLOTS,
    formatShortDate,
    formatSlotTime,
    getMinutesFromIso,
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
    onNewSlotClick: (
        courtId: string,
        courtName: string,
        date: string,
        startTime: string,
        endTime: string
    ) => void;
};

const TIMELINE_SLOT_ROW_HEIGHT = 48;
const TIMELINE_TIME_RAIL_WIDTH = 80;
const DAY_COLUMN_MIN_WIDTH = 132;
const CURRENT_TIME_SCROLL_OFFSET = 104;

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

function WeekTimelineBoard({
    days,
    selectedCourtId,
    onManageClick,
    onManageReservationClick,
    onNewSlotClick,
}: Props): JSX.Element {
    const scrollRef = useRef<HTMLDivElement>(null);
    const currentTimeMinutes = useCurrentTimeMinutes();

    const firstSlot = CALENDAR_TIME_SLOTS[0];
    const lastSlot = CALENDAR_TIME_SLOTS[CALENDAR_TIME_SLOTS.length - 1];

    const startOfDayMinutes = firstSlot ? getMinutesFromTime(firstSlot.start_time) : 0;
    const endOfDayMinutes = lastSlot ? getMinutesFromTime(lastSlot.end_time) : 0;
    const boardHeight = CALENDAR_TIME_SLOTS.length * TIMELINE_SLOT_ROW_HEIGHT;

    const gridTemplateColumns = `${TIMELINE_TIME_RAIL_WIDTH}px repeat(${Math.max(days.length, 1)}, minmax(${DAY_COLUMN_MIN_WIDTH}px, 1fr))`;

    const currentTimePct =
        firstSlot &&
        lastSlot &&
        currentTimeMinutes >= startOfDayMinutes &&
        currentTimeMinutes <= endOfDayMinutes
            ? ((currentTimeMinutes - startOfDayMinutes) / (endOfDayMinutes - startOfDayMinutes)) *
              100
            : null;

    const currentTimePx = currentTimePct !== null ? (currentTimePct / 100) * boardHeight : null;

    const hasToday = days.some((d) => d.date === todayIso());

    // Scroll to current time on mount
    useEffect(() => {
        if (hasToday && currentTimePct !== null && scrollRef.current) {
            const targetPx = (currentTimePct / 100) * boardHeight;
            const offset = Math.max(0, targetPx - CURRENT_TIME_SCROLL_OFFSET);
            scrollRef.current.scrollTop = offset;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const daySlots = useMemo(
        () =>
            days.map((day) => {
                const courts = selectedCourtId
                    ? day.courts.filter((c) => c.court_id === selectedCourtId)
                    : day.courts;
                const bookings = courts.flatMap((c) =>
                    c.slots
                        .filter((s): s is CalendarBookingItem => s.kind === "booking")
                        .map((s) => ({ ...s, _courtId: c.court_id }))
                );
                const blocks = courts.flatMap((c) =>
                    c.slots
                        .filter((s): s is CalendarBlockItem => s.kind === "block")
                        .map((s) => ({ ...s, _courtId: c.court_id }))
                );
                const availableSlots = courts.flatMap((c) =>
                    (c.time_slots ?? [])
                        .filter((ts: CalendarTimeSlot) => ts.status === "available")
                        .map((ts: CalendarTimeSlot) => ({
                            ...ts,
                            _courtId: c.court_id,
                            _courtName: c.court_name,
                        }))
                );
                return { date: day.date, bookings, blocks, availableSlots };
            }),
        [days, selectedCourtId]
    );

    if (!firstSlot || !lastSlot) {
        return (
            <div className="card-surface p-4 text-sm text-muted-foreground">
                No time slots configured.
            </div>
        );
    }

    return (
        <section className="isolate flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
            {/* Single scroll container — header and body share horizontal scroll so borders align */}
            <div ref={scrollRef} className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
                <div className="min-w-fit">
                    {/* Sticky day-column header row */}
                    <div
                        className="sticky top-0 z-30 grid border-b border-border bg-card"
                        style={{ gridTemplateColumns }}
                    >
                        <div className="sticky left-0 z-40 flex items-center border-r border-border bg-muted/10 px-3 py-2">
                            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Time
                            </span>
                        </div>

                        {daySlots.map(({ date, bookings }) => {
                            const isToday = date === todayIso();
                            const [, , dayNum] = date.split("-");
                            const weekday = formatShortDate(date).split(",")[0] ?? "";
                            const dateNum = parseInt(dayNum ?? "0", 10);
                            const monthLabel = formatShortDate(date).split(" ")[1] ?? "";

                            return (
                                <div
                                    key={date}
                                    className={`border-r border-border/70 px-3 py-2 text-center last:border-r-0 ${
                                        isToday ? "bg-cta/5" : "bg-card"
                                    }`}
                                >
                                    <p
                                        className={`text-[11px] font-semibold uppercase tracking-wide ${
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
                                        className={`mt-0.5 text-[11px] ${isToday ? "text-cta/70" : "text-muted-foreground"}`}
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
                    <div
                        className="relative grid bg-background"
                        style={{ gridTemplateColumns, height: `${boardHeight}px` }}
                    >
                        {/* Time rail */}
                        <div className="sticky left-0 z-20 overflow-hidden border-r border-border bg-card">
                            {CALENDAR_TIME_SLOTS.map((slot) => (
                                <div
                                    key={`${slot.start_time}-${slot.end_time}`}
                                    className="flex items-start border-b border-border/40 px-3 pt-2 last:border-b-0"
                                    style={{ height: `${TIMELINE_SLOT_ROW_HEIGHT}px` }}
                                >
                                    <p className="w-full whitespace-nowrap text-right text-xs font-medium tabular-nums text-muted-foreground">
                                        {formatSlotTime(slot.start_time)}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Day columns */}
                        {daySlots.map(({ date, bookings, blocks, availableSlots }) => {
                            const isToday = date === todayIso();
                            return (
                                <div
                                    key={date}
                                    className="relative border-r border-border/60 last:border-r-0"
                                    style={{ height: `${boardHeight}px` }}
                                >
                                    {/* Current time indicator — only inside today's column */}
                                    {isToday && currentTimePx !== null ? (
                                        <div
                                            className="pointer-events-none absolute left-0 right-0 z-20 flex items-center"
                                            style={{ top: `${currentTimePx}px` }}
                                        >
                                            <div className="h-2 w-2 flex-shrink-0 rounded-full bg-destructive" />
                                            <div className="h-px flex-1 bg-destructive/80" />
                                        </div>
                                    ) : null}
                                    {CALENDAR_TIME_SLOTS.map((slot) => (
                                        <div
                                            key={`${date}-${slot.start_time}`}
                                            className="border-b border-border/35 bg-card/40 last:border-b-0"
                                            style={{ height: `${TIMELINE_SLOT_ROW_HEIGHT}px` }}
                                        />
                                    ))}

                                    {/* Available slot buttons from time_slots */}
                                    {availableSlots.map((ts) => {
                                        const startMin = getMinutesFromIso(ts.start_datetime);
                                        const endMin = getMinutesFromIso(ts.end_datetime);
                                        const topPct =
                                            ((startMin - startOfDayMinutes) /
                                                (endOfDayMinutes - startOfDayMinutes)) *
                                            100;
                                        const heightPct =
                                            ((endMin - startMin) /
                                                (endOfDayMinutes - startOfDayMinutes)) *
                                            100;
                                        const startTime = ts.start_datetime.includes("T")
                                            ? (ts.start_datetime.split("T")[1] ?? "").slice(0, 5)
                                            : ts.start_datetime.slice(0, 5);
                                        const endTime = ts.end_datetime.includes("T")
                                            ? (ts.end_datetime.split("T")[1] ?? "").slice(0, 5)
                                            : ts.end_datetime.slice(0, 5);
                                        return (
                                            <button
                                                key={`${ts._courtId}-${ts.start_datetime}`}
                                                type="button"
                                                aria-label={`New booking at ${startTime}`}
                                                className="absolute inset-x-1.5 z-10 cursor-pointer rounded-md border border-dashed border-border/60 bg-transparent opacity-0 transition-opacity hover:border-cta/45 hover:bg-cta/[0.04] hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta/70"
                                                style={{
                                                    top: `${topPct}%`,
                                                    height: `${heightPct}%`,
                                                }}
                                                onClick={() =>
                                                    onNewSlotClick(
                                                        ts._courtId,
                                                        ts._courtName,
                                                        date,
                                                        startTime,
                                                        endTime
                                                    )
                                                }
                                            />
                                        );
                                    })}

                                    {bookings.map((booking) => (
                                        <CalendarBookingBlock
                                            key={`${booking._courtId}-${booking.id}`}
                                            booking={booking}
                                            boardHeight={boardHeight}
                                            startOfDayMinutes={startOfDayMinutes}
                                            endOfDayMinutes={endOfDayMinutes}
                                            onManageClick={onManageClick}
                                        />
                                    ))}

                                    {blocks.map((block) => (
                                        <CalendarReservationBlock
                                            key={`${block._courtId}-${block.id}`}
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

export default memo(WeekTimelineBoard);
