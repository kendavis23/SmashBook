import type { JSX } from "react";
import { Users } from "lucide-react";
import type { CalendarCourtColumn, CalendarBooking } from "../types";
import {
    BOOKING_TYPE_COLORS,
    BOOKING_TYPE_LABELS,
    BOOKING_STATUS_COLORS,
    BOOKING_STATUS_LABELS,
    formatTime,
    formatCurrency,
} from "../types";

type Props = {
    court: CalendarCourtColumn;
};

export function CalendarCourtCard({ court }: Props): JSX.Element {
    const bookingCount = court.bookings.length;

    return (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
            {/* Court name row */}
            <div className="flex items-center justify-between border-b border-border bg-muted/30 px-2.5 py-1.5">
                <span className="text-[11px] font-semibold text-foreground truncate">
                    {court.court_name}
                </span>
                {bookingCount > 0 && (
                    <span className="ml-1.5 shrink-0 rounded-full bg-cta/15 px-1.5 py-0.5 text-[9px] font-semibold text-cta">
                        {bookingCount}
                    </span>
                )}
            </div>

            {bookingCount === 0 ? (
                <div className="px-2.5 py-3 text-center">
                    <p className="text-[10px] text-muted-foreground/60">Free</p>
                </div>
            ) : (
                <div className="divide-y divide-border/60">
                    {court.bookings.map((booking: CalendarBooking) => (
                        <CalendarBookingSlot key={booking.id} booking={booking} />
                    ))}
                </div>
            )}
        </div>
    );
}

type SlotProps = {
    booking: CalendarBooking;
};

function CalendarBookingSlot({ booking }: SlotProps): JSX.Element {
    const typeColors = BOOKING_TYPE_COLORS[booking.booking_type] ?? BOOKING_TYPE_COLORS["regular"]!;
    const statusColors = BOOKING_STATUS_COLORS[booking.status] ?? BOOKING_STATUS_COLORS["pending"]!;

    const playerNames = booking.players
        .slice(0, 2)
        .map((p) => p.full_name)
        .join(", ");
    const extraPlayers = booking.players.length > 2 ? ` +${booking.players.length - 2}` : "";

    return (
        <div
            className={`relative px-2.5 py-2 ${typeColors.bg} border-l-[3px] ${typeColors.border}`}
        >
            {/* Time */}
            <p className="text-[11px] font-bold text-foreground leading-tight">
                {formatTime(booking.start_datetime)}
                <span className="font-normal text-muted-foreground">
                    {" "}
                    – {formatTime(booking.end_datetime)}
                </span>
            </p>

            {/* Type label + open badge */}
            <div className="mt-1 flex flex-wrap items-center gap-1">
                <span className={`text-[10px] font-semibold ${typeColors.text}`}>
                    {BOOKING_TYPE_LABELS[booking.booking_type] ?? booking.booking_type}
                </span>
                {booking.is_open_game && (
                    <span className="rounded-full bg-info/20 px-1.5 py-0.5 text-[9px] font-semibold text-info">
                        Open
                    </span>
                )}
            </div>

            {/* Event name */}
            {booking.event_name ? (
                <p className="mt-0.5 truncate text-[10px] italic text-muted-foreground">
                    {booking.event_name}
                </p>
            ) : null}

            {/* Players row */}
            {booking.players.length > 0 && (
                <div className="mt-1 flex items-center gap-1">
                    <Users size={9} className="shrink-0 text-muted-foreground/60" />
                    <p className="truncate text-[10px] text-muted-foreground leading-tight">
                        {playerNames}
                        {extraPlayers}
                    </p>
                </div>
            )}

            {/* Bottom row: status + price */}
            <div className="mt-1.5 flex items-center justify-between gap-1">
                <span
                    className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${statusColors.bg} ${statusColors.text}`}
                >
                    {BOOKING_STATUS_LABELS[booking.status] ?? booking.status}
                </span>
                <span className="text-[10px] font-medium text-muted-foreground">
                    {formatCurrency(booking.total_price)}
                </span>
            </div>

            {/* Slots */}
            {booking.slots_available === 0 ? (
                <p className="mt-0.5 text-[9px] font-semibold text-destructive">Full</p>
            ) : booking.is_open_game ? (
                <p className="mt-0.5 text-[9px] text-muted-foreground">
                    {booking.slots_available} slot{booking.slots_available !== 1 ? "s" : ""} left
                </p>
            ) : null}
        </div>
    );
}

export default CalendarCourtCard;
