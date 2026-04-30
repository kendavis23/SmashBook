import { memo, type JSX } from "react";
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

function CalendarReservationBlock({
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
            className={`absolute left-1.5 right-1.5 z-10 cursor-pointer overflow-hidden rounded-md border text-left shadow-xs transition-colors duration-150 hover:z-20 hover:border-cta/40 hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta/70 focus-visible:ring-offset-1 ${style.bg} ${style.border}`}
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

            <div className="relative flex h-full flex-col items-start justify-center gap-0.5 px-2.5 py-1">
                <p className={`text-xs font-semibold leading-none ${style.time}`}>{style.label}</p>
                <p
                    className={`shrink-0 text-[11px] font-medium leading-none tabular-nums ${style.time}`}
                >
                    {timeLabel}
                </p>
            </div>
        </button>
    );
}

export default memo(CalendarReservationBlock);
