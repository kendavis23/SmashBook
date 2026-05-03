import { memo, useEffect, useRef, useState, type JSX } from "react";
import type {
    CalendarBlockItem,
    CalendarBookingItem,
    CalendarCourtColumn,
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

const MONTHS_SHORT = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
] as const;

const TIMELINE_SLOT_ROW_HEIGHT = 48;
const TIMELINE_TIME_RAIL_WIDTH = 80;
const TIMELINE_COURT_LANE_MIN_WIDTH = 168;
const CURRENT_TIME_SCROLL_OFFSET = 104;

function formatShortWeekday(dateStr: string): string {
    return formatShortDate(dateStr).split(",")[0] ?? "";
}
function parseDayNum(dateStr: string): number {
    return parseInt(dateStr.split("-")[2] ?? "0", 10);
}
function parseMonthShort(dateStr: string): string {
    const m = parseInt(dateStr.split("-")[1] ?? "1", 10);
    return MONTHS_SHORT[m - 1] ?? "";
}

type Props = {
    day: CalendarDay;
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

function DayTimelineBoard({
    day,
    onManageClick,
    onManageReservationClick,
    onNewSlotClick,
}: Props): JSX.Element {
    const isToday = day.date === todayIso();
    const currentTimeMinutes = useCurrentTimeMinutes();
    const scrollRef = useRef<HTMLDivElement>(null);

    const firstSlot = CALENDAR_TIME_SLOTS[0];
    const lastSlot = CALENDAR_TIME_SLOTS[CALENDAR_TIME_SLOTS.length - 1];

    const startOfDayMinutes = firstSlot ? getMinutesFromTime(firstSlot.start_time) : 0;
    const endOfDayMinutes = lastSlot ? getMinutesFromTime(lastSlot.end_time) : 0;
    const boardHeight = CALENDAR_TIME_SLOTS.length * TIMELINE_SLOT_ROW_HEIGHT;
    const gridTemplateColumns = `${TIMELINE_TIME_RAIL_WIDTH}px repeat(${Math.max(day.courts.length, 1)}, minmax(${TIMELINE_COURT_LANE_MIN_WIDTH}px, 1fr))`;

    const currentTimePct =
        firstSlot &&
        lastSlot &&
        currentTimeMinutes >= startOfDayMinutes &&
        currentTimeMinutes <= endOfDayMinutes
            ? ((currentTimeMinutes - startOfDayMinutes) / (endOfDayMinutes - startOfDayMinutes)) *
              100
            : null;

    useEffect(() => {
        if (isToday && currentTimePct !== null && scrollRef.current) {
            const targetPx = (currentTimePct / 100) * boardHeight;
            scrollRef.current.scrollTop = Math.max(0, targetPx - CURRENT_TIME_SCROLL_OFFSET);
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
        <section ref={scrollRef} className="isolate min-h-0 flex-1 overflow-auto bg-background">
            {day.courts.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                    No courts found for this day.
                </div>
            ) : (
                <div className="min-w-fit">
                    {/* Sticky header block — both rows together so sticky works reliably */}
                    <div
                        className="sticky top-0 z-50 grid border-b border-border bg-card"
                        style={{ gridTemplateColumns }}
                    >
                        {/* Time-rail header */}
                        <div className="sticky left-0 z-50 row-span-2 flex items-center border-r border-border bg-card px-3 py-2">
                            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Time
                            </span>
                        </div>

                        {/* Date headline row */}
                        <div
                            className={`border-b border-border px-4 py-1.5 text-center ${
                                isToday ? "bg-cta/5" : ""
                            }`}
                            style={{ gridColumn: `2 / span ${Math.max(day.courts.length, 1)}` }}
                        >
                            <div className="flex items-baseline justify-center gap-1">
                                <p
                                    className={`text-[11px] font-semibold uppercase tracking-wide ${
                                        isToday ? "text-cta" : "text-muted-foreground"
                                    }`}
                                >
                                    {formatShortWeekday(day.date)}
                                </p>
                                <p
                                    className={`text-base font-semibold leading-none ${
                                        isToday ? "text-cta" : "text-foreground"
                                    }`}
                                >
                                    {parseDayNum(day.date)}
                                </p>
                                <p
                                    className={`text-[11px] font-medium ${
                                        isToday ? "text-cta/70" : "text-muted-foreground"
                                    }`}
                                >
                                    {parseMonthShort(day.date)}
                                </p>
                            </div>
                        </div>

                        {/* Court name cells row */}
                        {day.courts.map((court: CalendarCourtColumn) => (
                            <div
                                key={court.court_id}
                                className="border-r border-border/70 bg-card px-3 py-2 text-center last:border-r-0"
                            >
                                <p className="truncate text-xs font-semibold text-foreground">
                                    {court.court_name}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                    {(() => {
                                        const n = court.slots.filter(
                                            (s) => s.kind === "booking"
                                        ).length;
                                        return n === 0
                                            ? "No bookings"
                                            : `${n} booking${n === 1 ? "" : "s"}`;
                                    })()}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* Time rail + court lanes */}
                    <div className="relative grid bg-background" style={{ gridTemplateColumns }}>
                        {/* Current time indicator */}
                        {isToday && currentTimePct !== null ? (
                            <div
                                className="pointer-events-none absolute left-0 right-0 z-20 flex items-center"
                                style={{ top: `${currentTimePct}%` }}
                            >
                                <div
                                    className="flex-shrink-0"
                                    style={{ width: `${TIMELINE_TIME_RAIL_WIDTH}px` }}
                                />
                                <div className="h-2 w-2 flex-shrink-0 rounded-full bg-destructive" />
                                <div className="h-px flex-1 bg-destructive/80" />
                            </div>
                        ) : null}

                        {/* Time rail */}
                        <div className="sticky left-0 z-40 overflow-hidden border-r border-border bg-card">
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

                        {/* Court columns */}
                        {day.courts.map((court: CalendarCourtColumn) => (
                            <div
                                key={court.court_id}
                                className="relative isolate border-r border-border/60 last:border-r-0"
                                style={{ height: `${boardHeight}px` }}
                            >
                                {CALENDAR_TIME_SLOTS.map((slot) => (
                                    <div
                                        key={`${court.court_id}-${slot.start_time}`}
                                        className="border-b border-border/35 bg-card/40 last:border-b-0"
                                        style={{ height: `${TIMELINE_SLOT_ROW_HEIGHT}px` }}
                                    />
                                ))}

                                {/* Available slot buttons from time_slots */}
                                {(court.time_slots ?? [])
                                    .filter((ts: CalendarTimeSlot) => ts.status === "available")
                                    .map((ts: CalendarTimeSlot) => {
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
                                                key={ts.start_datetime}
                                                type="button"
                                                aria-label={`New booking at ${startTime}`}
                                                className="absolute inset-x-1.5 z-10 cursor-pointer rounded-md border border-dashed border-border/60 bg-transparent opacity-0 transition-opacity hover:border-cta/45 hover:bg-cta/[0.04] hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta/70"
                                                style={{
                                                    top: `${topPct}%`,
                                                    height: `${heightPct}%`,
                                                }}
                                                onClick={() =>
                                                    onNewSlotClick(
                                                        court.court_id,
                                                        court.court_name,
                                                        day.date,
                                                        startTime,
                                                        endTime
                                                    )
                                                }
                                            />
                                        );
                                    })}

                                {court.slots
                                    .filter((s): s is CalendarBookingItem => s.kind === "booking")
                                    .map((booking) => (
                                        <CalendarBookingBlock
                                            key={booking.id}
                                            booking={booking}
                                            boardHeight={boardHeight}
                                            startOfDayMinutes={startOfDayMinutes}
                                            endOfDayMinutes={endOfDayMinutes}
                                            onManageClick={onManageClick}
                                        />
                                    ))}
                                {court.slots
                                    .filter((s): s is CalendarBlockItem => s.kind === "block")
                                    .map((block) => (
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
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}

export default memo(DayTimelineBoard);
