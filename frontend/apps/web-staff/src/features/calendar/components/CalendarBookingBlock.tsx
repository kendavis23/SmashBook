import type { JSX } from "react";
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

export default function CalendarBookingBlock({
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

    const title = booking.event_name ?? BOOKING_TYPE_LABELS[booking.booking_type] ?? "Booking";
    const timeLabel = `${formatTime(booking.start_datetime)} – ${formatTime(booking.end_datetime)}`;
    const statusLabel = BOOKING_STATUS_LABELS[booking.status] ?? booking.status;
    const ariaLabel = `${title} • ${timeLabel} • ${statusLabel}`;

    const showStatus = height >= 56;

    return (
        <button
            type="button"
            aria-label={ariaLabel}
            title={ariaLabel}
            onClick={() => onManageClick(booking.id)}
            className={`absolute left-1.5 right-1.5 z-10 cursor-pointer overflow-hidden rounded-lg border px-2 py-1.5 shadow-sm transition-all duration-150 hover:z-20 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta focus-visible:ring-offset-1 ${typeColors.border} text-left`}
            style={{ top: `${top}px`, height: `${height}px` }}
        >
            {/* Opaque background — covers grid lines beneath the block */}
            <span className={`pointer-events-none absolute inset-0 bg-card`} />
            <span className={`pointer-events-none absolute inset-0 ${typeColors.bg}`} />
            <span className="relative flex h-full flex-col items-start justify-center gap-1">
                <p
                    className={`truncate text-[11px] font-semibold leading-tight ${typeColors.text}`}
                >
                    {title}
                </p>
                <p className="shrink-0 text-[10px] font-medium leading-none text-foreground/70">
                    {timeLabel}
                </p>
                {showStatus ? (
                    <span
                        className={`mt-1.5 inline-block shrink-0 rounded-full py-px text-[9px] font-medium leading-tight ${statusColors.bg} ${statusColors.text}`}
                    >
                        {statusLabel}
                    </span>
                ) : null}
            </span>
        </button>
    );
}
