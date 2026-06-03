import type { JSX } from "react";
import { formatCurrency } from "@repo/ui";
import type { RevenueTypeStats } from "../revenueSummary";
import { revenueTypeColor, revenueTypeLabel } from "../revenueConstants";

type Props = {
    rows: RevenueTypeStats[];
    totalNet: number;
};

const CX = 110;
const CY = 110;
const R_OUTER = 92;
const R_INNER = 56;

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

export function RevenueDonutChart({ rows, totalNet }: Props): JSX.Element {
    if (rows.length === 0 || totalNet <= 0) {
        return (
            <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
                No data to display.
            </div>
        );
    }

    let cursor = 0;
    const slices = rows.map((r) => {
        const sweep = (r.netAmount / totalNet) * 360;
        const start = cursor;
        cursor += sweep;
        return { ...r, start, sweep };
    });

    return (
        <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-center lg:gap-8">
            {/* SVG donut */}
            <svg
                viewBox="0 0 220 220"
                className="h-[220px] w-[220px] shrink-0"
                role="img"
                aria-label="Revenue by type donut chart"
            >
                {slices.map((s) => (
                    <path
                        key={s.revenueType}
                        d={describeArc(CX, CY, R_OUTER, R_INNER, s.start, s.start + s.sweep)}
                        fill={revenueTypeColor(s.revenueType)}
                    >
                        <title>{`${revenueTypeLabel(s.revenueType)} (${s.sharePct.toFixed(1)}%): ${formatCurrency(s.netAmount)}`}</title>
                    </path>
                ))}
                {/* Centre label */}
                <text
                    x={CX}
                    y={CY - 6}
                    textAnchor="middle"
                    fontSize={10}
                    className="fill-muted-foreground"
                >
                    Total Net Revenue
                </text>
                <text
                    x={CX}
                    y={CY + 14}
                    textAnchor="middle"
                    fontSize={17}
                    fontWeight={800}
                    className="fill-foreground"
                >
                    {formatCurrency(totalNet)}
                </text>
            </svg>

            {/* Legend */}
            <div className="w-full min-w-0">
                <ul className="space-y-1">
                    {rows.map((r) => (
                        <li
                            key={r.revenueType}
                            className="flex items-center gap-2.5 py-0.5 text-sm"
                        >
                            <span
                                className="h-2.5 w-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: revenueTypeColor(r.revenueType) }}
                            />
                            <span className="text-foreground">
                                {revenueTypeLabel(r.revenueType)}
                            </span>
                            <span className="tabular-nums text-muted-foreground">
                                ({r.sharePct.toFixed(1)}%)
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
