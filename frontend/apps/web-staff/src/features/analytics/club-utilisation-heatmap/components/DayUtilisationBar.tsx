import type { JSX } from "react";
import type { PeakDay } from "../heatmapUtils";
import { DAY_LABELS, heatTone } from "../heatmapUtils";

type Props = {
    days: PeakDay[];
};

/** Horizontal bar chart — one bar per day of week, ordered Mon→Sun. */
export function DayUtilisationBar({ days }: Props): JSX.Element {
    const ordered = DAY_LABELS.map((label, dayOfWeek) => {
        const found = days.find((d) => d.dayOfWeek === dayOfWeek);
        return { label, dayOfWeek, avgPct: found?.avgPct ?? 0 };
    });
    const maxPct = Math.max(...ordered.map((d) => d.avgPct), 1);

    return (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold tracking-tight text-foreground">
                Utilisation by Day of Week
            </h2>
            <div className="space-y-2.5">
                {ordered.map(({ label, dayOfWeek, avgPct }) => {
                    const barPct = maxPct > 0 ? (avgPct / maxPct) * 100 : 0;
                    return (
                        <div key={dayOfWeek} className="flex items-center gap-3">
                            <span className="w-7 flex-shrink-0 text-xs font-medium text-muted-foreground">
                                {label}
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="h-4 overflow-hidden rounded-md bg-muted/40">
                                    <div
                                        className="h-full rounded-md transition-all"
                                        style={{
                                            width: `${barPct}%`,
                                            background: heatTone(avgPct),
                                        }}
                                    />
                                </div>
                            </div>
                            <span className="w-10 flex-shrink-0 text-right text-xs font-semibold text-foreground">
                                {avgPct > 0 ? `${avgPct.toFixed(1)}%` : "—"}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
