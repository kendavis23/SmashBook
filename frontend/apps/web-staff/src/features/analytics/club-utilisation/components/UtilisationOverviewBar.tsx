import type { JSX } from "react";
import type { UtilisationSummary } from "../../types";

type Props = {
    summary: UtilisationSummary;
};

/**
 * Horizontal "Utilisation Overview" bar: booked vs available slots shown as a
 * single filled progress track, with the utilised percentage centred above it.
 * The fill width is clamped to 0–100 and guarded against a zero-slot divisor.
 */
export function UtilisationOverviewBar({ summary }: Props): JSX.Element {
    const { totalSlots, bookedSlots, avgUtilisationPct } = summary;
    const availableSlots = Math.max(totalSlots - bookedSlots, 0);
    const hasSlots = totalSlots > 0;
    const fillPct = hasSlots ? Math.max(0, Math.min(100, avgUtilisationPct)) : 0;

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex shrink-0 flex-row items-baseline justify-between gap-3 sm:w-28 sm:flex-col sm:items-start sm:gap-0.5">
                <span className="text-[11px] font-semibold leading-4 text-muted-foreground">
                    Booked Slots
                </span>
                <span className="text-xl font-semibold leading-6 tracking-tight text-success">
                    {bookedSlots.toLocaleString()}
                </span>
            </div>

            <div className="min-w-0 flex-1">
                <p className="mb-1.5 text-center text-xs font-semibold text-success">
                    {hasSlots ? `${Math.round(fillPct)}% Utilised` : "No slots available"}
                </p>
                <div
                    className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-valuenow={Math.round(fillPct)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Slot utilisation"
                >
                    <div
                        className="h-full rounded-full bg-success transition-[width]"
                        style={{ width: `${fillPct}%` }}
                    />
                </div>
                <p className="mt-1.5 text-center text-[11px] font-medium text-muted-foreground">
                    Total Slots: {totalSlots.toLocaleString()}
                </p>
            </div>

            <div className="flex shrink-0 flex-row items-baseline justify-between gap-3 sm:w-32 sm:flex-col sm:items-end sm:gap-0.5">
                <span className="text-[11px] font-semibold leading-4 text-muted-foreground">
                    Available Slots
                </span>
                <span className="text-xl font-semibold leading-6 tracking-tight text-foreground">
                    {availableSlots.toLocaleString()}
                </span>
            </div>
        </div>
    );
}
