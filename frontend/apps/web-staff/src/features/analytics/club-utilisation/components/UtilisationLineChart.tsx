import type { JSX } from "react";
import type { DailyUtilisationPoint } from "../../types";
import { formatShortDate } from "../utilisationConstants";

type Props = {
    points: DailyUtilisationPoint[];
};

const W = 680;
const H = 220;
const PAD = { top: 18, right: 20, bottom: 34, left: 40 };
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
            <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                No utilisation data for this period.
            </div>
        );
    }

    const maxPct = Math.max(...points.map((p) => Number(p.utilisation_pct) || 0), 0);
    const axisMax = getAxisMax(maxPct);
    const ySteps = getYSteps(axisMax);
    const isDense = points.length > 12;

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
            className="h-[220px] w-full"
            style={{ overflow: "visible" }}
            role="img"
            aria-label="Daily utilisation percentage chart"
        >
            <defs>
                <linearGradient id="utilisation-area" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--cta))" stopOpacity="0.16" />
                    <stop offset="100%" stopColor="hsl(var(--cta))" stopOpacity="0.02" />
                </linearGradient>
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
                            strokeWidth={0.5}
                            strokeDasharray="3 3"
                            className="text-border"
                        />
                        <text
                            x={PAD.left - 8}
                            y={gy + 3.5}
                            textAnchor="end"
                            fontSize={11}
                            fontWeight={600}
                            className="fill-muted-foreground"
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
                    stroke="hsl(var(--cta))"
                    strokeWidth={3}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                />
            ) : null}

            {coords.map((c, i) => {
                const shouldLabelValue = !isDense || c.pct > 0;
                return (
                    <g key={i}>
                        <title>{`${c.label}: ${c.pct}%`}</title>
                        <circle
                            cx={c.x}
                            cy={c.y}
                            r={c.pct > 0 ? 4.5 : 3.5}
                            fill="white"
                            stroke="hsl(var(--cta))"
                            strokeWidth={c.pct > 0 ? 2.5 : 2}
                            opacity={c.pct > 0 ? 1 : 0.72}
                        />
                        {shouldLabelValue ? (
                            <text
                                x={c.x}
                                y={c.y - 10}
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
