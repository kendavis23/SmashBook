import type { JSX } from "react";
import { formatCurrency } from "@repo/ui";
import type { RevenueTypeStats } from "../revenueSummary";
import { revenueTypeColor, revenueTypeLabel } from "../revenueConstants";

type Props = {
    rows: RevenueTypeStats[];
    /** Currency code shown in the axis caption, e.g. "USD". */
    currencyCode?: string | null;
};

const W = 520;
const H = 280;
const PAD = { top: 36, right: 16, bottom: 44, left: 52 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;
const Y_TICKS = 4;
const BAR_WIDTH_RATIO = 0.5;

function niceCeil(value: number): number {
    if (value <= 0) return 100;
    const pow = Math.pow(10, Math.floor(Math.log10(value)));
    for (const step of [1, 1.5, 2, 2.5, 5, 10]) {
        const candidate = step * pow;
        if (candidate >= value) return candidate;
    }
    return 10 * pow;
}

/** Compact y-axis tick: 8000 → "8K", 1500000 → "1.5M", 0 → "0". */
function formatTick(value: number): string {
    if (value === 0) return "0";
    if (value >= 1_000_000)
        return `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(value % 1_000 === 0 ? 0 : 1)}K`;
    return String(value);
}

export function RevenueByTypeBarChart({ rows, currencyCode }: Props): JSX.Element {
    if (rows.length === 0) {
        return (
            <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
                No data to display.
            </div>
        );
    }

    const maxVal = Math.max(0, ...rows.map((r) => r.netAmount));
    const axisMax = niceCeil(maxVal);
    const ticks = Array.from({ length: Y_TICKS + 1 }, (_, i) => (axisMax / Y_TICKS) * i);
    const slot = PLOT_W / rows.length;
    const barW = slot * BAR_WIDTH_RATIO;
    const toY = (v: number): number =>
        axisMax > 0 ? PAD.top + PLOT_H - (v / axisMax) * PLOT_H : PAD.top + PLOT_H;

    const axisCaption = currencyCode ? `Amount (${currencyCode})` : "Amount";

    return (
        <svg
            viewBox={`0 0 ${W} ${H}`}
            className="h-[280px] w-full"
            style={{ overflow: "visible" }}
            role="img"
            aria-label="Net revenue by type bar chart"
        >
            {/* Axis caption */}
            <text
                x={PAD.left - 44}
                y={PAD.top - 16}
                textAnchor="start"
                fontSize={11}
                className="fill-muted-foreground"
            >
                {axisCaption}
            </text>

            {/* Gridlines + Y labels */}
            {ticks.map((t) => {
                const gy = toY(t);
                return (
                    <g key={t}>
                        <line
                            x1={PAD.left}
                            y1={gy}
                            x2={PAD.left + PLOT_W}
                            y2={gy}
                            stroke="currentColor"
                            strokeWidth={0.75}
                            strokeDasharray="2 6"
                            strokeLinecap="round"
                            className="text-border/70"
                        />
                        <text
                            x={PAD.left - 10}
                            y={gy + 4}
                            textAnchor="end"
                            fontSize={11}
                            fontWeight={600}
                            className="fill-muted-foreground/80"
                        >
                            {formatTick(t)}
                        </text>
                    </g>
                );
            })}

            {/* Bars */}
            {rows.map((r, i) => {
                const x = PAD.left + slot * i + (slot - barW) / 2;
                const barH = axisMax > 0 ? (r.netAmount / axisMax) * PLOT_H : 0;
                const y = toY(r.netAmount);
                const radius = Math.min(5, barW / 2);
                const color = revenueTypeColor(r.revenueType);
                const cx = PAD.left + slot * i + slot / 2;

                return (
                    <g key={r.revenueType}>
                        <title>{`${revenueTypeLabel(r.revenueType)}: ${formatCurrency(r.netAmount)}`}</title>
                        {barH > 0 ? (
                            <>
                                <rect
                                    x={x}
                                    y={y}
                                    width={barW}
                                    height={barH}
                                    rx={radius}
                                    ry={radius}
                                    fill={color}
                                />
                                <text
                                    x={cx}
                                    y={y - 5}
                                    textAnchor="middle"
                                    fontSize={11}
                                    fontWeight={700}
                                    className="fill-foreground/90"
                                >
                                    {formatCurrency(r.netAmount)}
                                </text>
                            </>
                        ) : null}
                        <text
                            x={cx}
                            y={PAD.top + PLOT_H + 24}
                            textAnchor="middle"
                            fontSize={11}
                            fontWeight={600}
                            className="fill-muted-foreground/80"
                        >
                            {revenueTypeLabel(r.revenueType).split(" ")[0]}
                        </text>
                        {revenueTypeLabel(r.revenueType).split(" ").length > 1 ? (
                            <text
                                x={cx}
                                y={PAD.top + PLOT_H + 36}
                                textAnchor="middle"
                                fontSize={11}
                                fontWeight={600}
                                className="fill-muted-foreground/80"
                            >
                                {revenueTypeLabel(r.revenueType).split(" ").slice(1).join(" ")}
                            </text>
                        ) : null}
                    </g>
                );
            })}
        </svg>
    );
}
