import type { JSX } from "react";

export type ComparisonBar = {
    label: string;
    value: number;
    /** CSS color (token var or literal). */
    color: string;
    /** Pre-formatted value shown above the bar (e.g. "£2,860" or "350"). */
    display: string;
};

type Props = {
    bars: ComparisonBar[];
    /** Formats the y-axis tick values. Defaults to a locale-grouped integer. */
    formatTick?: (value: number) => string;
    /** Show a colour-keyed legend above the plot. */
    showLegend?: boolean;
};

const W = 460;
const H = 300;
const PAD = { top: 36, right: 16, bottom: 40, left: 56 };
const PLOT_H = H - PAD.top - PAD.bottom;
const PLOT_W = W - PAD.left - PAD.right;
const BAR_W = 96;
const Y_TICKS = 5;

const defaultFormatTick = (value: number): string => Math.round(value).toLocaleString();

/** Rounds a raw max up to a clean axis ceiling so ticks land on tidy numbers. */
function niceCeil(value: number): number {
    if (value <= 0) return 0;
    const pow = Math.pow(10, Math.floor(Math.log10(value)));
    const steps = [1, 1.5, 2, 2.5, 5, 10];
    for (const step of steps) {
        const candidate = step * pow;
        if (candidate >= value) return candidate;
    }
    return 10 * pow;
}

/**
 * Two-bar comparison chart (e.g. Booked vs Total, Actual vs Potential revenue).
 * Pure SVG. Bars share a single y-scale with gridlines and axis tick labels.
 */
export function ComparisonBarChart({
    bars,
    formatTick = defaultFormatTick,
    showLegend = false,
}: Props): JSX.Element {
    const maxValue = Math.max(...bars.map((b) => b.value), 0);

    if (bars.length === 0 || maxValue <= 0) {
        return (
            <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                No data to display.
            </div>
        );
    }

    const axisMax = niceCeil(maxValue);
    const slot = PLOT_W / bars.length;
    const ticks = Array.from({ length: Y_TICKS + 1 }, (_, i) => (axisMax / Y_TICKS) * i);
    const toY = (value: number): number => PAD.top + PLOT_H - (value / axisMax) * PLOT_H;

    return (
        <div className="space-y-3">
            {showLegend ? (
                <div className="flex items-center justify-center gap-5">
                    {bars.map((bar) => (
                        <span
                            key={bar.label}
                            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
                        >
                            <span
                                className="h-2.5 w-2.5 rounded-sm"
                                style={{ backgroundColor: bar.color }}
                            />
                            {bar.label}
                        </span>
                    ))}
                </div>
            ) : null}

            <svg
                viewBox={`0 0 ${W} ${H}`}
                width="100%"
                height="100%"
                style={{ overflow: "visible" }}
                role="img"
                aria-label="Comparison bar chart"
            >
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
                                {formatTick(t)}
                            </text>
                        </g>
                    );
                })}

                {bars.map((bar, i) => {
                    const barH = (bar.value / axisMax) * PLOT_H;
                    const cx = PAD.left + slot * i + slot / 2;
                    const x = cx - BAR_W / 2;
                    const y = PAD.top + PLOT_H - barH;
                    return (
                        <g key={bar.label}>
                            <title>{`${bar.label}: ${bar.display}`}</title>
                            <rect x={x} y={y} width={BAR_W} height={barH} rx={8} fill={bar.color} />
                            <text
                                x={cx}
                                y={y - 10}
                                textAnchor="middle"
                                fontSize={13}
                                fontWeight={700}
                                className="fill-foreground"
                            >
                                {bar.display}
                            </text>
                            <text
                                x={cx}
                                y={PAD.top + PLOT_H + 24}
                                textAnchor="middle"
                                fontSize={12}
                                fontWeight={600}
                                className="fill-muted-foreground"
                            >
                                {bar.label}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}
