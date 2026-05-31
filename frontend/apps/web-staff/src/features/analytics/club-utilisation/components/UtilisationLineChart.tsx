import type { JSX } from "react";
import type { DailyUtilisationPoint } from "../../types";
import { formatShortDate } from "../utilisationConstants";

type Props = {
    points: DailyUtilisationPoint[];
};

const W = 680;
const H = 280;
const PAD = { top: 24, right: 24, bottom: 44, left: 44 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;
const Y_STEPS = [0, 20, 40, 60, 80, 100];

function toX(i: number, total: number): number {
    if (total <= 1) return PAD.left + PLOT_W / 2;
    return PAD.left + (i / (total - 1)) * PLOT_W;
}

function toY(pct: number): number {
    const clamped = Math.max(0, Math.min(100, pct));
    return PAD.top + PLOT_H - (clamped / 100) * PLOT_H;
}

/** Line chart of daily utilisation percentage. Pure SVG — no external charting lib. */
export function UtilisationLineChart({ points }: Props): JSX.Element {
    if (points.length === 0) {
        return (
            <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                No utilisation data for this period.
            </div>
        );
    }

    const coords = points.map((p, i) => {
        const pctNum = Number(p.utilisation_pct);
        return {
            x: toX(i, points.length),
            y: toY(pctNum),
            pct: Math.round(pctNum),
            label: formatShortDate(p.snapshot_date),
        };
    });
    const polyline = coords.map((c) => `${c.x},${c.y}`).join(" ");
    const labelEvery = points.length > 8 ? Math.ceil(points.length / 6) : 1;

    return (
        <svg
            viewBox={`0 0 ${W} ${H}`}
            width="100%"
            height="100%"
            style={{ overflow: "visible" }}
            role="img"
            aria-label="Daily utilisation percentage chart"
        >
            {Y_STEPS.map((v) => {
                const gy = toY(v);
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

            {coords.map((c, i) => (
                <g key={i}>
                    <title>{`${c.label}: ${c.pct}%`}</title>
                    <circle
                        cx={c.x}
                        cy={c.y}
                        r={4.5}
                        fill="white"
                        stroke="hsl(var(--cta))"
                        strokeWidth={2.5}
                    />
                    <text
                        x={c.x}
                        y={c.y - 12}
                        textAnchor="middle"
                        fontSize={11}
                        fontWeight={700}
                        className="fill-foreground"
                    >
                        {c.pct}%
                    </text>
                    {i === 0 || i === coords.length - 1 || i % labelEvery === 0 ? (
                        <text
                            x={c.x}
                            y={PAD.top + PLOT_H + 22}
                            textAnchor="middle"
                            fontSize={11}
                            fontWeight={600}
                            className="fill-muted-foreground"
                        >
                            {c.label}
                        </text>
                    ) : null}
                </g>
            ))}
        </svg>
    );
}
