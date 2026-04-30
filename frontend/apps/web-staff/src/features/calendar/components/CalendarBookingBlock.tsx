import { memo, type JSX } from "react";
import type { CalendarBookingItem } from "../types";
import {
    BLOCK_VERTICAL_GAP,
    BOOKING_STATUS_COLORS,
    BOOKING_STATUS_LABELS,
    BOOKING_TYPE_COLORS,
    BOOKING_TYPE_LABELS,
    MIN_BLOCK_HEIGHT,
    clampNumber,
    formatTime,
    getMinutesFromIso,
} from "../types";

type Props = {
    booking: CalendarBookingItem;
    boardHeight: number;
    startOfDayMinutes: number;
    endOfDayMinutes: number;
    onManageClick: (bookingId: string) => void;
};

function CalendarBookingBlock({
    booking,
    boardHeight,
    startOfDayMinutes,
    endOfDayMinutes,
    onManageClick,
}: Props): JSX.Element | null {
    const typeColors = BOOKING_TYPE_COLORS[booking.booking_type] ?? BOOKING_TYPE_COLORS.regular;
    const statusColors = BOOKING_STATUS_COLORS[booking.status] ?? BOOKING_STATUS_COLORS.pending;
    const totalMinutes = endOfDayMinutes - startOfDayMinutes;

    if (!typeColors || !statusColors || totalMinutes <= 0) {
        return null;
    }

    const clampedStart = clampNumber(
        getMinutesFromIso(booking.start_datetime),
        startOfDayMinutes,
        endOfDayMinutes
    );
    const clampedEnd = clampNumber(
        getMinutesFromIso(booking.end_datetime),
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

    const typeLabel = BOOKING_TYPE_LABELS[booking.booking_type] ?? "Booking";
    const timeLabel = `${formatTime(booking.start_datetime)} – ${formatTime(booking.end_datetime)}`;
    const statusLabel = BOOKING_STATUS_LABELS[booking.status] ?? booking.status;
    const ariaLabel = `${typeLabel}${booking.is_open_game ? " • Open Game" : ""} • ${timeLabel} • ${statusLabel}`;

    const showStatus = height >= 54;

    return (
        <button
            type="button"
            aria-label={ariaLabel}
            title={ariaLabel}
            onClick={() => onManageClick(booking.id)}
            className={`absolute left-1.5 right-1.5 z-10 cursor-pointer overflow-hidden rounded-md border px-2.5 py-1.5 text-left shadow-xs transition-colors duration-150 hover:z-20 hover:border-cta/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta/70 focus-visible:ring-offset-1 ${typeColors.border}`}
            style={{ top: `${top}px`, height: `${height}px` }}
        >
            {/* Opaque background — covers grid lines beneath the block */}
            <span className={`pointer-events-none absolute inset-0 bg-card`} />
            <span className={`pointer-events-none absolute inset-0 ${typeColors.bg}`} />
            <span className="relative flex h-full flex-col items-start justify-center gap-0.5">
                <span className="flex w-full items-center gap-1.5">
                    <p
                        className={`truncate text-xs font-medium leading-tight ${typeColors.text}`}
                    >
                        {typeLabel}
                    </p>
                    {booking.is_open_game ? (
                        <span className="shrink-0 rounded-full border border-cta/40 bg-cta/10 px-1.5 py-px text-[8px] font-semibold uppercase leading-tight tracking-wide text-cta">
                            Open
                        </span>
                    ) : null}
                </span>
                <p className="shrink-0 text-[11px] font-medium leading-none tabular-nums text-foreground/70">
                    {timeLabel}
                </p>
                {showStatus ? (
                    <span
                        className={`mt-1 inline-block shrink-0 rounded-full border border-current/10 px-1.5 py-px text-[9px] font-medium leading-tight ${statusColors.bg} ${statusColors.text}`}
                    >
                        {statusLabel}
                    </span>
                ) : null}
            </span>
        </button>
    );
}

export default memo(CalendarBookingBlock);
