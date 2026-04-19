import type { JSX } from "react";
import type { CalendarBlockItem } from "../types";
import {
    BLOCK_VERTICAL_GAP,
    MIN_BLOCK_HEIGHT,
    RESERVATION_TYPE_STYLE,
    RESERVATION_TYPE_STYLE_FALLBACK,
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

    if (totalMinutes <= 0) return null;

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

    if (clampedEnd <= clampedStart) return null;

    const rawTop = ((clampedStart - startOfDayMinutes) / totalMinutes) * boardHeight;
    const rawHeight = ((clampedEnd - clampedStart) / totalMinutes) * boardHeight;
    const top = Math.max(rawTop + BLOCK_VERTICAL_GAP / 2, 2);
    const availableHeight = Math.max(boardHeight - top - 2, MIN_BLOCK_HEIGHT);
    const height = Math.min(
        Math.max(rawHeight - BLOCK_VERTICAL_GAP, MIN_BLOCK_HEIGHT),
        availableHeight
    );

    const timeLabel = `${formatTime(block.start_datetime)} – ${formatTime(block.end_datetime)}`;
    const ariaLabel = `${block.title} • ${timeLabel} • ${block.reservation_type}`;

    const style = RESERVATION_TYPE_STYLE[block.reservation_type] ?? RESERVATION_TYPE_STYLE_FALLBACK;

    const isMaintenance = block.reservation_type === "maintenance";

    return (
        <button
            type="button"
            aria-label={ariaLabel}
            title={ariaLabel}
            onClick={() => onManageClick(block.id)}
            className={`absolute left-1 right-1 z-10 cursor-pointer overflow-hidden rounded-md border text-left transition-all duration-150 hover:z-20 hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta focus-visible:ring-offset-1 ${style.bg} ${style.border}`}
            style={{ top: `${top}px`, height: `${height}px` }}
        >
            {/* Diagonal stripe for maintenance — signals "unavailable" */}
            {isMaintenance ? (
                <span
                    className="pointer-events-none absolute inset-0 opacity-[0.07]"
                    style={{
                        backgroundImage:
                            "repeating-linear-gradient(-45deg, currentColor 0, currentColor 1.5px, transparent 0, transparent 50%)",
                        backgroundSize: "8px 8px",
                    }}
                />
            ) : null}

            <div className="relative flex h-full flex-col items-start justify-center gap-px pl-2 pr-1 py-1">
                <p
                    className={`shrink-0 text-[10px] font-bold uppercase tracking-widest leading-none ${style.time}`}
                >
                    {style.label}
                </p>
                <p className={`truncate text-[9px] font-semibold leading-tight ${style.text}`}>
                    {block.title}
                </p>
                <p className={`shrink-0 text-[10px] font-medium leading-none ${style.time}`}>
                    {timeLabel}
                </p>
            </div>
        </button>
    );
}
