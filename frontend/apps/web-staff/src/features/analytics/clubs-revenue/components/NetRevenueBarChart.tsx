import type { JSX } from "react";
import { formatCurrency } from "@repo/ui";
import type { ClubRevenueStats } from "../clubsRevenueSummary";
import { clubColor } from "../clubsRevenueConstants";

type Props = {
    rows: ClubRevenueStats[];
};

const VIEW_W = 720;
const VIEW_H = 320;
const PAD_LEFT = 56;
const PAD_RIGHT = 12;
const PAD_TOP = 28;
const PAD_BOTTOM = 56;
const TICK_COUNT = 4;

/** Rounds a value up to a tidy axis ceiling (1/2/2.5/5 × 10ⁿ). */
function niceCeil(value: number): number {
    if (value <= 0) return 1;
    const exp = Math.floor(Math.log10(value));
    const base = Math.pow(10, exp);
    const frac = value / base;
    const niceFrac = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 2.5 ? 2.5 : frac <= 5 ? 5 : 10;
    return niceFrac * base;
}

/** Short money axis label: 40000 → "40K", 1500 → "1.5K", 0 → "0". */
function formatAxisTick(value: number): string {
    if (value === 0) return "0";
    if (value >= 1000) {
        const k = value / 1000;
        return `${Number.isInteger(k) ? k : k.toFixed(1)}K`;
    }
    return String(value);
}

export function NetRevenueBarChart({ rows }: Props): JSX.Element {
    const maxNet = rows.reduce((max, r) => Math.max(max, r.netAmount), 0);

    if (rows.length === 0 || maxNet <= 0) {
        return (
            <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                No revenue to display for this period.
            </div>
        );
    }

    const ceil = niceCeil(maxNet);
    const plotW = VIEW_W - PAD_LEFT - PAD_RIGHT;
    const plotH = VIEW_H - PAD_TOP - PAD_BOTTOM;
    const baseY = PAD_TOP + plotH;

    const slot = plotW / rows.length;
    const barW = Math.min(slot * 0.5, 52);

    const ticks = Array.from({ length: TICK_COUNT + 1 }, (_, i) => (ceil / TICK_COUNT) * i);

    return (
        <svg
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            width="100%"
            height="100%"
            className="h-[300px] w-full"
            role="img"
            aria-label="Net revenue by club bar chart"
        >
            {/* Gridlines + y-axis ticks */}
            {ticks.map((t) => {
                const y = baseY - (t / ceil) * plotH;
                return (
                    <g key={t}>
                        <line
                            x1={PAD_LEFT}
                            y1={y}
                            x2={VIEW_W - PAD_RIGHT}
                            y2={y}
                            className="stroke-border/60"
                            strokeWidth={1}
                            strokeDasharray="3 3"
                        />
                        <text
                            x={PAD_LEFT - 8}
                            y={y + 3}
                            textAnchor="end"
                            fontSize={10}
                            className="fill-muted-foreground"
                        >
                            {formatAxisTick(t)}
                        </text>
                    </g>
                );
            })}

            {/* Bars */}
            {rows.map((r, idx) => {
                const cx = PAD_LEFT + slot * idx + slot / 2;
                const h = (r.netAmount / ceil) * plotH;
                const x = cx - barW / 2;
                const y = baseY - h;
                return (
                    <g key={r.clubId}>
                        <rect
                            x={x}
                            y={y}
                            width={barW}
                            height={Math.max(h, 0)}
                            rx={4}
                            fill={clubColor(idx)}
                        >
                            <title>{`${r.clubName}: ${formatCurrency(r.netAmount)}`}</title>
                        </rect>
                        {/* Value label above the bar */}
                        <text
                            x={cx}
                            y={y - 6}
                            textAnchor="middle"
                            fontSize={11}
                            fontWeight={600}
                            className="fill-foreground"
                        >
                            {formatCurrency(r.netAmount)}
                        </text>
                        {/* Club name (wrapped to two short lines) */}
                        {wrapLabel(r.clubName).map((line, lineIdx) => (
                            <text
                                key={lineIdx}
                                x={cx}
                                y={baseY + 16 + lineIdx * 12}
                                textAnchor="middle"
                                fontSize={10}
                                className="fill-muted-foreground"
                            >
                                {line}
                            </text>
                        ))}
                    </g>
                );
            })}
        </svg>
    );
}

/** Splits a club name into at most two lines for the x-axis (keeps the chart legible). */
function wrapLabel(name: string): string[] {
    const words = name.split(" ");
    if (words.length <= 1) return [name];
    const mid = Math.ceil(words.length / 2);
    return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
}
