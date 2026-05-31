import type { JSX } from "react";
import type { DailyUtilisationPoint } from "../../types";
import { formatShortDate } from "../utilisationConstants";

type Props = {
    points: DailyUtilisationPoint[];
};

const W = 1200;
const H = 220;
const PAD = { top: 18, right: 24, bottom: 34, left: 44 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

function toX(i: number, total: number): number {
    if (total <= 1) return PAD.left + PLOT_W / 2;
    return PAD.left + (i / (total - 1)) * PLOT_W;
}

function getAxisMax(maxPct: number): number {
    if (maxPct <= 10) return 10;
    if (maxPct <= 20) return 20;
    if (maxPct <= 50) return 50;
    return 100;
}

function getYSteps(axisMax: number): number[] {
    if (axisMax === 10) return [0, 2, 4, 6, 8, 10];
    if (axisMax === 20) return [0, 5, 10, 15, 20];
    if (axisMax === 50) return [0, 10, 20, 30, 40, 50];
    return [0, 20, 40, 60, 80, 100];
}

function toY(pct: number, axisMax: number): number {
    const clamped = Math.max(0, Math.min(axisMax, pct));
    return PAD.top + PLOT_H - (clamped / axisMax) * PLOT_H;
}

/** Line chart of daily utilisation percentage. Pure SVG — no external charting lib. */
export function UtilisationLineChart({ points }: Props): JSX.Element {
    if (points.length === 0) {
        return (
            <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
                No utilisation data for this period.
            </div>
        );
    }

    const maxPct = Math.max(...points.map((p) => Number(p.utilisation_pct) || 0), 0);
    const axisMax = getAxisMax(maxPct);
    const ySteps = getYSteps(axisMax);
    const isDense = points.length > 12;
    const valueLabelEvery = points.length > 30 ? 5 : 1;

    const coords = points.map((p, i) => {
        const pctNum = Number(p.utilisation_pct) || 0;
        return {
            x: toX(i, points.length),
            y: toY(pctNum, axisMax),
            pct: Math.round(pctNum),
            label: formatShortDate(p.snapshot_date),
        };
    });
    const polyline = coords.map((c) => `${c.x},${c.y}`).join(" ");
    const areaPath =
        coords.length > 1
            ? `M ${coords[0]?.x ?? PAD.left} ${PAD.top + PLOT_H} L ${coords
                  .map((c) => `${c.x} ${c.y}`)
                  .join(" L ")} L ${coords[coords.length - 1]?.x ?? PAD.left} ${PAD.top + PLOT_H} Z`
            : "";
    const labelEvery = points.length > 8 ? Math.ceil(points.length / 6) : 1;

    return (
        <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="xMidYMid meet"
            className="block w-full"
            style={{ overflow: "visible" }}
            role="img"
            aria-label="Daily utilisation percentage chart"
        >
            <defs>
                <linearGradient id="utilisation-area" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--cta))" stopOpacity="0.22" />
                    <stop offset="55%" stopColor="hsl(var(--cta))" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="hsl(var(--cta))" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="utilisation-stroke" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="hsl(var(--cta))" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="hsl(var(--cta))" stopOpacity="1" />
                </linearGradient>
                <filter id="utilisation-glow" x="-20%" y="-40%" width="140%" height="180%">
                    <feDropShadow
                        dx="0"
                        dy="2"
                        stdDeviation="3"
                        floodColor="hsl(var(--cta))"
                        floodOpacity="0.25"
                    />
                </filter>
            </defs>

            {ySteps.map((v) => {
                const gy = toY(v, axisMax);
                return (
                    <g key={v}>
                        <line
                            x1={PAD.left}
                            y1={gy}
                            x2={PAD.left + PLOT_W}
                            y2={gy}
                            stroke="currentColor"
                            strokeWidth={0.75}
                            strokeDasharray="2 5"
                            strokeLinecap="round"
                            className="text-border/70"
                        />
                        <text
                            x={PAD.left - 10}
                            y={gy + 3.5}
                            textAnchor="end"
                            fontSize={11}
                            fontWeight={600}
                            className="fill-muted-foreground/80"
                        >
                            {v}%
                        </text>
                    </g>
                );
            })}

            {areaPath ? <path d={areaPath} fill="url(#utilisation-area)" /> : null}

            {coords.length > 1 ? (
                <polyline
                    points={polyline}
                    fill="none"
                    stroke="url(#utilisation-stroke)"
                    strokeWidth={2.75}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    filter="url(#utilisation-glow)"
                />
            ) : null}

            {coords.map((c, i) => {
                const shouldLabelValue =
                    (!isDense || c.pct > 0) &&
                    (i === 0 || i === coords.length - 1 || i % valueLabelEvery === 0);
                return (
                    <g key={i}>
                        <title>{`${c.label}: ${c.pct}%`}</title>
                        {c.pct > 0 ? (
                            <circle cx={c.x} cy={c.y} r={7} fill="hsl(var(--cta))" opacity={0.12} />
                        ) : null}
                        <circle
                            cx={c.x}
                            cy={c.y}
                            r={c.pct > 0 ? 4 : 3.25}
                            fill="white"
                            stroke="hsl(var(--cta))"
                            strokeWidth={c.pct > 0 ? 2.5 : 2}
                            opacity={c.pct > 0 ? 1 : 0.7}
                        />
                        {shouldLabelValue ? (
                            <text
                                x={c.x}
                                y={c.y - 11}
                                textAnchor="middle"
                                fontSize={11}
                                fontWeight={700}
                                className="fill-foreground"
                            >
                                {c.pct}%
                            </text>
                        ) : null}
                        {i === 0 || i === coords.length - 1 || i % labelEvery === 0 ? (
                            <text
                                x={c.x}
                                y={PAD.top + PLOT_H + 20}
                                textAnchor="middle"
                                fontSize={11}
                                fontWeight={600}
                                className="fill-muted-foreground"
                            >
                                {c.label}
                            </text>
                        ) : null}
                    </g>
                );
            })}
        </svg>
    );
}
