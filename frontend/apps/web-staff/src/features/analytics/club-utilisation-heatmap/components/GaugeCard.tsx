import type { JSX } from "react";
import { Grid3X3, Sun, Sunset, Moon, CloudMoon } from "lucide-react";
import { panelCls } from "../../club-utilisation/utilisationConstants";
import type { TimeBand } from "../heatmapUtils";

type Props = {
    avgPct: number;
    bookedSlots: number;
    totalSlots: number;
    timeBands: TimeBand[];
};

// Semicircle geometry
const R = 68;
const STROKE = 12;
const CX = 100;
const CY = 100;

const TRACK = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`;

function fillArcPath(pct: number): string {
    if (pct <= 0) return "";
    if (pct >= 100) return TRACK;
    const angleDeg = 180 - pct * 1.8;
    const rad = (angleDeg * Math.PI) / 180;
    const ex = CX + R * Math.cos(rad);
    const ey = CY - R * Math.sin(rad);
    const largeArc = pct > 50 ? 1 : 0;
    return `M ${CX - R} ${CY} A ${R} ${R} 0 ${largeArc} 1 ${ex} ${ey}`;
}

const BAND_META = [
    {
        icon: <Sun size={22} />,
        iconCls: "text-yellow-400",
        barCls: "bg-yellow-400",
    },
    {
        icon: <Sunset size={22} />,
        iconCls: "text-orange-400",
        barCls: "bg-orange-400",
    },
    {
        icon: <Moon size={22} />,
        iconCls: "text-cta",
        barCls: "bg-cta",
    },
    {
        icon: <CloudMoon size={22} />,
        iconCls: "text-indigo-500",
        barCls: "bg-indigo-500",
    },
] as const;

export function GaugeCard({ avgPct, bookedSlots, totalSlots, timeBands }: Props): JSX.Element {
    const clamped = Math.min(100, Math.max(0, avgPct));
    const fill = fillArcPath(clamped);

    // viewBox: top of arc (with stroke padding) down to just below CY
    const vbX = CX - R - STROKE;
    const vbY = CY - R - STROKE;
    const vbW = (R + STROKE) * 2;
    const vbH = R + STROKE + 4;

    return (
        <div className={`${panelCls} flex h-full flex-col gap-4 lg:max-xl:gap-3 lg:max-xl:p-4`}>
            {/* Title */}
            <div>
                <p className="text-base font-semibold tracking-tight text-foreground lg:max-xl:text-sm">
                    Utilisation by Time of Day
                </p>
                <p className="mt-1 text-sm font-medium text-muted-foreground lg:max-xl:text-xs">
                    (Average %)
                </p>
            </div>

            {/* Gauge + label stacked, label overlaps arc bottom */}
            <div className="flex flex-col items-center">
                <svg
                    viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
                    className="w-full max-w-[220px] lg:max-xl:max-w-[170px]"
                    aria-hidden="true"
                >
                    <path
                        d={TRACK}
                        fill="none"
                        stroke="hsl(var(--muted))"
                        strokeWidth={STROKE}
                        strokeLinecap="round"
                    />
                    {fill && (
                        <path
                            d={fill}
                            fill="none"
                            stroke="hsl(var(--cta))"
                            strokeWidth={STROKE}
                            strokeLinecap="round"
                        />
                    )}
                </svg>
                {/* Value label sits right below the arc ends, visually overlapping */}
                <div className="-mt-3 text-center">
                    <p className="text-3xl font-bold leading-none tracking-tight text-foreground lg:max-xl:text-2xl">
                        {clamped.toFixed(1)}
                        <span className="text-xl lg:max-xl:text-base">%</span>
                    </p>
                    <p className="mt-1 text-xs font-medium text-muted-foreground">
                        Average Utilisation
                    </p>
                </div>
            </div>

            {/* Time-of-day breakdown bars */}
            <div className="flex flex-col gap-5 lg:max-xl:gap-3">
                {timeBands.map((band, i) => {
                    const meta = BAND_META[i] ?? BAND_META[0];
                    return (
                        <div
                            key={band.label}
                            className="grid grid-cols-[1.75rem_1fr] gap-4 lg:max-xl:grid-cols-[1.25rem_1fr] lg:max-xl:gap-2.5"
                        >
                            <span className={`mt-1 flex shrink-0 justify-center ${meta.iconCls}`}>
                                {meta.icon}
                            </span>
                            <div className="min-w-0">
                                <div className="flex min-w-0 items-baseline justify-between gap-6 lg:max-xl:gap-3">
                                    <div className="flex min-w-0 items-baseline gap-1.5">
                                        <p className="truncate text-xs font-semibold leading-4 text-foreground">
                                            {band.label}
                                        </p>
                                        <p className="truncate text-xs leading-4 text-muted-foreground">
                                            {band.range}
                                        </p>
                                    </div>
                                    <span className="shrink-0 text-xs font-bold leading-4 text-foreground">
                                        {band.avgPct.toFixed(1)}%
                                    </span>
                                </div>
                                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                    <div
                                        className={`h-full rounded-full ${meta.barCls}`}
                                        style={{ width: `${band.avgPct}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Slots footer */}
            <div className="mt-1 rounded-xl bg-muted/40 px-4 py-3 text-center">
                <p className="flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-success/15 text-success">
                        <Grid3X3 size={14} />
                    </span>
                    Booked / Total Slots
                </p>
                <p className="mt-2 text-3xl font-bold leading-none tracking-tight text-foreground lg:max-xl:text-2xl">
                    {bookedSlots} / {totalSlots}
                </p>
            </div>
        </div>
    );
}
