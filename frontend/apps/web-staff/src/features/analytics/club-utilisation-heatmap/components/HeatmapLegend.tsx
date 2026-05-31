import type { JSX } from "react";
import { heatTone } from "../heatmapUtils";

const STEPS = [0, 20, 40, 60, 80, 100] as const;

/** Colour legend strip: 0% → 100% with fill samples. */
export function HeatmapLegend(): JSX.Element {
    return (
        <div className="flex items-center gap-2 whitespace-nowrap text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Avg utilisation</span>
            <span className="text-[11px]">Quiet</span>
            <div className="flex overflow-hidden rounded-md border border-border/70">
                {STEPS.map((pct) => (
                    <div
                        key={pct}
                        className="h-4 w-6 border-r border-background last:border-r-0"
                        style={{ background: heatTone(pct) }}
                        title={`${pct}%`}
                    />
                ))}
            </div>
            <span className="text-[11px]">Busy</span>
        </div>
    );
}
