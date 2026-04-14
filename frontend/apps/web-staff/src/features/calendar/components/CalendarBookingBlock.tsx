import type { JSX } from "react";
import type { CalendarBooking } from "../types";
import {
    BOOKING_STATUS_COLORS,
    BOOKING_STATUS_LABELS,
    BOOKING_TYPE_COLORS,
    BOOKING_TYPE_LABELS,
    clampNumber,
    formatCurrency,
    formatTime,
    getMinutesFromIso,
} from "../types";

type Props = {
    booking: CalendarBooking;
    boardHeight: number;
    startOfDayMinutes: number;
    endOfDayMinutes: number;
};

const BLOCK_VERTICAL_GAP = 8;
const MIN_BLOCK_HEIGHT = 52;

export default function CalendarBookingBlock({
    booking,
    boardHeight,
    startOfDayMinutes,
    endOfDayMinutes,
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
    const top = Math.max(rawTop + BLOCK_VERTICAL_GAP / 2, 4);
    const availableHeight = Math.max(boardHeight - top - 4, MIN_BLOCK_HEIGHT);
    const height = Math.min(
        Math.max(rawHeight - BLOCK_VERTICAL_GAP, MIN_BLOCK_HEIGHT),
        availableHeight
    );
    const title = booking.event_name ?? BOOKING_TYPE_LABELS[booking.booking_type] ?? "Booking";
    const timeLabel = `${formatTime(booking.start_datetime)} – ${formatTime(booking.end_datetime)}`;
    const participantSummary = booking.players
        .slice(0, 2)
        .map((player) => player.full_name)
        .join(", ");
    const slotsLabel =
        booking.slots_available > 0
            ? `${booking.slots_available} slot${booking.slots_available === 1 ? "" : "s"} left`
            : "Full";
    const detailLabel = [
        title,
        timeLabel,
        BOOKING_STATUS_LABELS[booking.status] ?? booking.status,
        booking.court_name,
        participantSummary || "No players yet",
        slotsLabel,
    ].join(" • ");
    const showExpandedMeta = height >= 92;
    const showPlayers = height >= 74 && participantSummary.length > 0;

    return (
        <div
            aria-label={detailLabel}
            className={`absolute left-2 right-2 z-10 rounded-xl border px-2.5 py-2 shadow-sm transition-all duration-150 hover:z-20 hover:shadow-md focus-within:z-20 focus-within:shadow-md ${typeColors.bg} ${typeColors.border}`}
            style={{ top: `${top}px`, height: `${height}px` }}
            tabIndex={0}
            title={detailLabel}
        >
            <div className="flex h-full flex-col justify-between gap-2 overflow-hidden">
                <div className="min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <p className={`truncate text-xs font-semibold ${typeColors.text}`}>
                            {title}
                        </p>
                        {booking.is_open_game ? (
                            <span className="shrink-0 rounded-full bg-info/15 px-1.5 py-0.5 text-[10px] font-semibold text-info">
                                Open
                            </span>
                        ) : null}
                    </div>

                    <p className="mt-1 text-[11px] font-medium text-foreground">{timeLabel}</p>

                    {showPlayers ? (
                        <p className="mt-1 truncate text-[11px] text-muted-foreground">
                            {participantSummary}
                            {booking.players.length > 2 ? ` +${booking.players.length - 2}` : ""}
                        </p>
                    ) : null}
                </div>

                {showExpandedMeta ? (
                    <div className="flex items-end justify-between gap-2">
                        <span
                            className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${statusColors.bg} ${statusColors.text}`}
                        >
                            {BOOKING_STATUS_LABELS[booking.status] ?? booking.status}
                        </span>
                        <div className="text-right">
                            <p className="text-[10px] font-medium text-muted-foreground">
                                {formatCurrency(booking.total_price)}
                            </p>
                            <p className="text-[10px] text-muted-foreground">{slotsLabel}</p>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
