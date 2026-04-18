import type { JSX } from "react";
import type { CalendarBlockItem } from "../types";
import {
    BLOCK_VERTICAL_GAP,
    MIN_BLOCK_HEIGHT,
    clampNumber,
    formatTime,
    getMinutesFromIso,
} from "../types";

type Props = {
    block: CalendarBlockItem;
    boardHeight: number;
    startOfDayMinutes: number;
    endOfDayMinutes: number;
    onManageClick: (reservationId: string) => void;
};

export default function CalendarReservationBlock({
    block,
    boardHeight,
    startOfDayMinutes,
    endOfDayMinutes,
    onManageClick,
}: Props): JSX.Element | null {
    const totalMinutes = endOfDayMinutes - startOfDayMinutes;

    if (totalMinutes <= 0) {
        return null;
    }

    const clampedStart = clampNumber(
        getMinutesFromIso(block.start_datetime),
        startOfDayMinutes,
        endOfDayMinutes
    );
    const clampedEnd = clampNumber(
        getMinutesFromIso(block.end_datetime),
        startOfDayMinutes,
        endOfDayMinutes
    );

    if (clampedEnd <= clampedStart) {
        return null;
    }

    const rawTop = ((clampedStart - startOfDayMinutes) / totalMinutes) * boardHeight;
    const rawHeight = ((clampedEnd - clampedStart) / totalMinutes) * boardHeight;
    const top = Math.max(rawTop + BLOCK_VERTICAL_GAP / 2, 2);
    const availableHeight = Math.max(boardHeight - top - 2, MIN_BLOCK_HEIGHT);
    const height = Math.min(
        Math.max(rawHeight - BLOCK_VERTICAL_GAP, MIN_BLOCK_HEIGHT),
        availableHeight
    );

    const timeLabel = `${formatTime(block.start_datetime)} – ${formatTime(block.end_datetime)}`;
    const ariaLabel = `${block.title} • ${timeLabel} • Block`;

    return (
        <button
            type="button"
            aria-label={ariaLabel}
            title={ariaLabel}
            onClick={() => onManageClick(block.id)}
            className="absolute left-1 right-1 z-10 cursor-pointer overflow-hidden rounded-lg border border-border bg-card text-left shadow-sm transition-all duration-150 hover:z-20 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta focus-visible:ring-offset-1"
            style={{ top: `${top}px`, height: `${height}px` }}
        >
            <span className="pointer-events-none absolute inset-0 bg-muted" />
            <div className="relative px-3 py-2">
                <p className="truncate text-[12px] font-semibold leading-tight text-foreground/75">
                    {block.title}
                </p>
                <p className="truncate text-[11px] leading-tight text-muted-foreground">
                    {timeLabel}
                </p>
            </div>
        </button>
    );
}
