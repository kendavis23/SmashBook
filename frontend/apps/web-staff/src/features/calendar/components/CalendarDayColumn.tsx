import type { JSX } from "react";
import type { CalendarDay, CalendarCourtColumn } from "../types";
import { formatShortDate, todayIso } from "../types";
import CalendarCourtCard from "./CalendarCourtCard";

type Props = {
    day: CalendarDay;
};

export function CalendarDayColumn({ day }: Props): JSX.Element {
    const isToday = day.date === todayIso();

    return (
        <div className="min-w-0 flex flex-col">
            {/* Day header */}
            <div
                className={`mb-2 rounded-lg px-2 py-2 text-center ${
                    isToday ? "bg-cta text-white" : "bg-muted/40 border border-border"
                }`}
            >
                <p
                    className={`text-[11px] font-semibold uppercase tracking-wide ${
                        isToday ? "text-white" : "text-muted-foreground"
                    }`}
                >
                    {formatShortDate(day.date).split(",")[0]}
                </p>
                <p
                    className={`text-sm font-bold leading-none mt-0.5 ${
                        isToday ? "text-white" : "text-foreground"
                    }`}
                >
                    {new Date(day.date + "T00:00:00").getDate()}
                </p>
                <p
                    className={`text-[10px] mt-0.5 ${
                        isToday ? "text-white/80" : "text-muted-foreground"
                    }`}
                >
                    {formatShortDate(day.date).replace(/^\w+,\s*/, "")}
                </p>
            </div>

            {day.courts.length === 0 ? (
                <p className="px-1 text-[11px] text-muted-foreground text-center py-4">No courts</p>
            ) : (
                <div className="flex flex-col gap-2">
                    {day.courts.map((court: CalendarCourtColumn) => (
                        <CalendarCourtCard key={court.court_id} court={court} />
                    ))}
                </div>
            )}
        </div>
    );
}

export default CalendarDayColumn;
