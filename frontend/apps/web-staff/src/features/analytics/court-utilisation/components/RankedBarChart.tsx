import type { JSX } from "react";

export type RankedBar = {
    /** Stable key (court id). */
    key: string;
    /** Row label drawn at the start of the bar (court name). */
    label: string;
    /** 0–100 value driving bar length. */
    value: number;
    /** Pre-formatted value drawn at the bar end (e.g. "86%"). */
    display: string;
    /** Fill colour as `hsl(var(--token))`. */
    color: string;
};

type Props = {
    bars: RankedBar[];
};

const W = 760;
const ROW_H = 68;
const BAR_H = 40;
const PAD = { top: 8, right: 56, bottom: 28, left: 100 };
const AXIS_MAX = 100; // utilisation is a percentage
const TICKS = [0, 25, 50, 75, 100];

/**
 * Horizontal ranked bar chart — one row per court, ordered best-first by the
 * caller. Horizontal layout keeps long court names readable and reads naturally
 * as a ranking. Pure SVG, fixed 0–100 percentage scale.
 */
export function RankedBarChart({ bars }: Props): JSX.Element {
    if (bars.length === 0) {
        return (
            <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                No courts to display.
            </div>
        );
    }

    const plotW = W - PAD.left - PAD.right;
    const height = PAD.top + bars.length * ROW_H + PAD.bottom;
    const toX = (value: number): number =>
        PAD.left + (Math.min(value, AXIS_MAX) / AXIS_MAX) * plotW;

    return (
        <svg
            viewBox={`0 0 ${W} ${height}`}
            className="w-full max-w-2xl"
            style={{ overflow: "visible" }}
            role="img"
            aria-label="Court utilisation ranking"
        >
            {/* gridlines + axis ticks */}
            {TICKS.map((t) => {
                const gx = toX(t);
                return (
                    <g key={t}>
                        <line
                            x1={gx}
                            y1={PAD.top}
                            x2={gx}
                            y2={PAD.top + bars.length * ROW_H}
                            stroke="currentColor"
                            strokeWidth={0.75}
                            strokeDasharray="2 6"
                            strokeLinecap="round"
                            className="text-border/70"
                        />
                        <text
                            x={gx}
                            y={height - 8}
                            textAnchor="middle"
                            fontSize={15}
                            fontWeight={600}
                            className="fill-muted-foreground/80"
                        >
                            {t}%
                        </text>
                    </g>
                );
            })}

            {bars.map((bar, i) => {
                const rowY = PAD.top + i * ROW_H;
                const barY = rowY + (ROW_H - BAR_H) / 2;
                const barW = Math.max(toX(bar.value) - PAD.left, 0);
                const radius = Math.min(6, BAR_H / 2, barW || BAR_H / 2);
                return (
                    <g key={bar.key}>
                        <title>{`${bar.label}: ${bar.display}`}</title>
                        {/* track */}
                        <rect
                            x={PAD.left}
                            y={barY}
                            width={plotW}
                            height={BAR_H}
                            rx={6}
                            ry={6}
                            className="fill-muted/50"
                        />
                        {/* court name */}
                        <text
                            x={PAD.left - 12}
                            y={barY + BAR_H / 2 + 5}
                            textAnchor="end"
                            fontSize={15}
                            fontWeight={600}
                            className="fill-foreground"
                        >
                            {bar.label}
                        </text>
                        {/* value bar */}
                        {barW > 0 ? (
                            <rect
                                x={PAD.left}
                                y={barY}
                                width={barW}
                                height={BAR_H}
                                rx={radius}
                                ry={radius}
                                fill={bar.color}
                            />
                        ) : null}
                        {/* value label at bar end */}
                        <text
                            x={toX(bar.value) + 10}
                            y={barY + BAR_H / 2 + 5}
                            textAnchor="start"
                            fontSize={15}
                            fontWeight={800}
                            fill={bar.color}
                        >
                            {bar.display}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
}
