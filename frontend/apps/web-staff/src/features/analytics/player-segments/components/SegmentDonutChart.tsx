import type { JSX } from "react";
import type { SegmentStats } from "../playerSegmentsSummary";
import { segmentColor } from "../playerSegmentsConstants";

type Props = {
    rows: SegmentStats[];
    totalPlayers: number;
};

const CX = 110;
const CY = 110;
const R_OUTER = 92;
const R_INNER = 60;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(
    cx: number,
    cy: number,
    rOuter: number,
    rInner: number,
    startDeg: number,
    endDeg: number
): string {
    const gap = 1.5;
    const s = startDeg + gap / 2;
    const e = endDeg - gap / 2;
    if (e <= s) return "";

    const o1 = polarToCartesian(cx, cy, rOuter, s);
    const o2 = polarToCartesian(cx, cy, rOuter, e);
    const i1 = polarToCartesian(cx, cy, rInner, e);
    const i2 = polarToCartesian(cx, cy, rInner, s);
    const large = e - s > 180 ? 1 : 0;

    return [
        `M ${o1.x} ${o1.y}`,
        `A ${rOuter} ${rOuter} 0 ${large} 1 ${o2.x} ${o2.y}`,
        `L ${i1.x} ${i1.y}`,
        `A ${rInner} ${rInner} 0 ${large} 0 ${i2.x} ${i2.y}`,
        "Z",
    ].join(" ");
}

/**
 * Donut of player count by segment, with a legend listing each segment's
 * player count and share. Pure SVG — no charting library. Renders a "No data"
 * branch when there are no players to plot.
 */
export function SegmentDonutChart({ rows, totalPlayers }: Props): JSX.Element {
    if (rows.length === 0 || totalPlayers <= 0) {
        return (
            <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                No players to display.
            </div>
        );
    }

    let cursor = 0;
    const slices = rows
        .filter((r) => r.players > 0)
        .map((r, idx) => {
            const sweep = (r.players / totalPlayers) * 360;
            const start = cursor;
            cursor += sweep;
            return { row: r, color: segmentColor(idx), start, sweep };
        });

    return (
        <div className="flex flex-col items-center gap-6 lg:flex-row lg:gap-8">
            <svg
                viewBox="0 0 220 220"
                className="h-[220px] w-[220px] shrink-0"
                role="img"
                aria-label="Players by segment donut chart"
            >
                {slices.map((s) => (
                    <path
                        key={s.row.groupKey}
                        d={describeArc(CX, CY, R_OUTER, R_INNER, s.start, s.start + s.sweep)}
                        fill={s.color}
                    >
                        <title>{`${s.row.groupLabel}: ${s.row.players.toLocaleString()} (${s.row.playerSharePct.toFixed(1)}%)`}</title>
                    </path>
                ))}
                <text
                    x={CX}
                    y={CY - 4}
                    textAnchor="middle"
                    fontSize={26}
                    fontWeight={800}
                    className="fill-foreground"
                >
                    {totalPlayers.toLocaleString()}
                </text>
                <text
                    x={CX}
                    y={CY + 16}
                    textAnchor="middle"
                    fontSize={11}
                    className="fill-muted-foreground"
                >
                    Total Players
                </text>
            </svg>

            {/* Legend — segment, count, share % */}
            <div className="w-full min-w-0">
                <ul className="space-y-0.5">
                    {rows.map((r, idx) => (
                        <li
                            key={r.groupKey}
                            className="flex items-center gap-3 py-1.5 text-sm tabular-nums"
                        >
                            <span
                                className="h-2.5 w-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: segmentColor(idx) }}
                            />
                            <span className="min-w-0 flex-1 truncate text-foreground">
                                {r.groupLabel}
                            </span>
                            <span className="shrink-0 text-muted-foreground">
                                {r.players.toLocaleString()}
                            </span>
                            <span className="w-14 shrink-0 text-right font-medium text-foreground">
                                {r.playerSharePct.toFixed(1)}%
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
