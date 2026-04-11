import type { Court, CourtAvailability, TimeSlot } from "../../types";
import { X, Clock, CalendarDays } from "lucide-react";
import type { JSX } from "react";

type Props = {
    court: Court;
    date: string;
    availability: CourtAvailability | undefined;
    isLoading: boolean;
    error: Error | null;
    onDateChange: (date: string) => void;
    onClose: () => void;
    onBookSlot: (slot: TimeSlot) => void;
    selectedSlot: TimeSlot | null;
    onSelectSlot: (slot: TimeSlot | null) => void;
};

function formatTime(hhmm: string): string {
    const [hStr, mStr] = hhmm.split(":");
    const h = Number(hStr);
    const m = Number(mStr ?? 0);
    const period = h >= 12 ? "PM" : "AM";
    const displayH = h % 12 === 0 ? 12 : h % 12;
    const displayM = m === 0 ? "00" : String(m).padStart(2, "0");
    return `${displayH}:${displayM} ${period}`;
}

function formatPrice(price: number | null): string | null {
    if (price === null) return null;
    const num = typeof price === "string" ? parseFloat(price) : price;
    if (isNaN(num) || num === 0) return null;
    return `$${num.toFixed(2)}`;
}

export default function AvailabilityPanel({
    court,
    date,
    availability,
    isLoading,
    error,
    onDateChange,
    onClose,
}: Props): JSX.Element {
    const slots = availability?.slots ?? [];
    const availableCount = slots.filter((s) => s.is_available).length;
    const bookedCount = slots.length - availableCount;
    const surfaceLabel = court.surface_type.replace(/_/g, " ");

    return (
        <div className="flex h-full flex-col">
            <div className="border-b border-border px-4 py-4 sm:px-5">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Schedule
                        </p>
                        <h2 className="mt-0.5 text-base font-semibold text-foreground">
                            {court.name}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        aria-label="Close availability panel"
                    >
                        <X size={14} />
                    </button>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-foreground">
                        {surfaceLabel.replace(
                            /(^|\s)([a-z])/g,
                            (_match, prefix, char) => `${prefix}${String(char).toUpperCase()}`
                        )}
                    </span>
                    <span
                        className={`rounded-md px-2 py-1 text-xs font-medium ${
                            court.has_lighting
                                ? "bg-warning/15 text-warning"
                                : "bg-muted text-muted-foreground"
                        }`}
                    >
                        {court.has_lighting ? "Lighting ready" : "No lighting"}
                    </span>
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/20 px-4 py-3 sm:px-5">
                <div>
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarDays size={12} className="flex-shrink-0" />
                        <span className="font-semibold uppercase tracking-wide">Date</span>
                    </label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => onDateChange(e.target.value)}
                        className="mt-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta-ring/30"
                        aria-label="Select date"
                    />
                </div>

                {!isLoading && !error && slots.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="flex items-center gap-1 rounded-md bg-success/15 px-2 py-1 font-medium text-success">
                            <span className="h-1.5 w-1.5 rounded-full bg-success" />
                            {availableCount} free
                        </span>
                        <span className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 font-medium text-muted-foreground">
                            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                            {bookedCount} booked
                        </span>
                    </div>
                )}
            </div>

            <div className="max-h-[42rem] flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center gap-2.5 py-10">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-cta" />
                        <span className="text-xs text-muted-foreground">Loading…</span>
                    </div>
                ) : error ? (
                    <div className="m-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive sm:m-5">
                        {error.message}
                    </div>
                ) : slots.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-10">
                        <Clock size={20} className="text-muted-foreground/30" />
                        <p className="text-xs text-muted-foreground">No slots for this date</p>
                    </div>
                ) : (
                    <div className="overflow-hidden border-t border-border">
                        <table className="w-full">
                            <thead className="sticky top-0 z-10 bg-card">
                                <tr className="border-b border-border">
                                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:px-5">
                                        Time
                                    </th>
                                    <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                        Label
                                    </th>
                                    <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                        Price
                                    </th>
                                    <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:px-5">
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {slots.map((slot) => {
                                    const priceAmount = formatPrice(slot.price);

                                    return (
                                        <tr
                                            key={slot.start_time}
                                            className={`transition-colors ${slot.is_available ? "hover:bg-success/5" : "opacity-80"}`}
                                        >
                                            <td className="px-4 py-3 sm:px-5">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className={`h-4 w-0.5 rounded-full ${slot.is_available ? "bg-success" : "bg-muted-foreground/25"}`}
                                                    />
                                                    <span className="text-xs font-semibold text-foreground sm:text-sm">
                                                        {formatTime(slot.start_time)}
                                                        <span className="mx-1 text-muted-foreground">
                                                            –
                                                        </span>
                                                        {formatTime(slot.end_time)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 text-xs text-muted-foreground sm:text-sm">
                                                {slot.price_label ?? "—"}
                                            </td>
                                            <td className="px-3 py-3 text-xs font-medium text-foreground sm:text-sm">
                                                {priceAmount ?? "—"}
                                            </td>
                                            <td className="px-4 py-3 text-right sm:px-5">
                                                <span
                                                    className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                                        slot.is_available
                                                            ? "bg-success/15 text-success"
                                                            : "bg-muted text-muted-foreground"
                                                    }`}
                                                >
                                                    {slot.is_available ? "Available" : "Booked"}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
