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
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex shrink-0 flex-col items-start">
                <span className="text-xs font-medium text-muted-foreground">Booked Slots</span>
                <span className="text-2xl font-semibold tracking-tight text-success">
                    {bookedSlots.toLocaleString()}
                </span>
            </div>

            <div className="min-w-0 flex-1">
                <p className="mb-2 text-center text-sm font-semibold text-success">
                    {hasSlots ? `${Math.round(fillPct)}% Utilised` : "No slots available"}
                </p>
                <div
                    className="relative h-3.5 w-full overflow-hidden rounded-full bg-muted"
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
                <p className="mt-2 text-center text-xs text-muted-foreground">
                    Total Slots: {totalSlots.toLocaleString()}
                </p>
            </div>

            <div className="flex shrink-0 flex-col items-end">
                <span className="text-xs font-medium text-muted-foreground">Available Slots</span>
                <span className="text-2xl font-semibold tracking-tight text-foreground">
                    {availableSlots.toLocaleString()}
                </span>
            </div>
        </div>
    );
}
