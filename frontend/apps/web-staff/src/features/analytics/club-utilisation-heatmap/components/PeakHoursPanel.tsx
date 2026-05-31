import type { JSX } from "react";
import { Flame } from "lucide-react";
import type { PeakHour } from "../heatmapUtils";
import { heatTone } from "../heatmapUtils";

type Props = {
    peakHours: PeakHour[];
};

/** Shows the top 3 peak hours with a mini bar and stats. */
export function PeakHoursPanel({ peakHours }: Props): JSX.Element {
    const maxPct = Math.max(...peakHours.map((h) => h.avgPct), 1);

    return (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cta/10 text-cta">
                    <Flame size={14} />
                </span>
                <h2 className="text-base font-semibold tracking-tight text-foreground">
                    Peak Hours
                </h2>
            </div>

            {peakHours.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data available.</p>
            ) : (
                <div className="space-y-3">
                    {peakHours.map((ph, i) => {
                        const barPct = maxPct > 0 ? (ph.avgPct / maxPct) * 100 : 0;
                        return (
                            <div key={ph.hour} className="flex items-center gap-3">
                                <span className="w-5 text-center text-xs font-bold text-muted-foreground">
                                    #{i + 1}
                                </span>
                                <span className="w-9 flex-shrink-0 text-xs font-semibold text-foreground">
                                    {ph.label}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="h-2 overflow-hidden rounded-full bg-cta/10">
                                        <div
                                            className="h-full rounded-full transition-all"
                                            style={{
                                                width: `${barPct}%`,
                                                background: heatTone(ph.avgPct),
                                            }}
                                        />
                                    </div>
                                </div>
                                <span className="w-10 text-right text-xs font-semibold text-cta">
                                    {ph.avgPct.toFixed(1)}%
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                    {ph.bookedSlots}/{ph.totalSlots} slots
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
