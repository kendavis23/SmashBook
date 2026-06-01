import type { JSX } from "react";

export type GroupedSeries = {
    key: string;
    label: string;
    /** CSS color (token var or literal). */
    color: string;
    /** Value for this series within each group, indexed by group. */
    values: number[];
    /** Pre-formatted value per group, shown in the tooltip. */
    display: string[];
};

type Props = {
    /** One label per group (e.g. a date per day). */
    groups: string[];
    /** Two (or more) series compared side by side within each group. */
    series: GroupedSeries[];
    /** Formats the y-axis tick values. Defaults to a locale-grouped integer. */
    formatTick?: (value: number) => string;
    /** Show a colour-keyed legend above the plot. */
    showLegend?: boolean;
    /**
     * Draw the pre-formatted value above each bar. Defaults to on when the
     * groups are few enough to stay legible; force off for dense charts.
     */
    showValueLabels?: boolean;
};

/** Above how many groups bar-top labels start to overlap and are dropped. */
const VALUE_LABEL_GROUP_LIMIT = 14;

const W = 900;
const H = 280;
const PAD = { top: 24, right: 16, bottom: 44, left: 68 };
const PLOT_H = H - PAD.top - PAD.bottom;
const PLOT_W = W - PAD.left - PAD.right;
const Y_TICKS = 5;
const GROUP_GAP_RATIO = 0.4; // share of each group slot left empty between groups
const BAR_GAP = 4; // px between bars within a group

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
 * Grouped bar chart — compares two or more series side by side within each
 * group (e.g. Total vs Booked slots per day). Pure SVG, shared y-scale.
 */
export function GroupedBarChart({
    groups,
    series,
    formatTick = defaultFormatTick,
    showLegend = false,
    showValueLabels,
}: Props): JSX.Element {
    const maxValue = Math.max(0, ...series.flatMap((s) => s.values));

    if (groups.length === 0 || series.length === 0 || maxValue <= 0) {
        return (
            <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                No data to display.
            </div>
        );
    }

    const showValueLabelsResolved = showValueLabels ?? groups.length <= VALUE_LABEL_GROUP_LIMIT;

    const axisMax = niceCeil(maxValue);
    const slot = PLOT_W / groups.length;
    const groupW = slot * (1 - GROUP_GAP_RATIO);
    const barW = Math.max((groupW - BAR_GAP * (series.length - 1)) / series.length, 1);
    const ticks = Array.from({ length: Y_TICKS + 1 }, (_, i) => (axisMax / Y_TICKS) * i);
    const toY = (value: number): number => PAD.top + PLOT_H - (value / axisMax) * PLOT_H;

    return (
        <div className="space-y-2">
            {showLegend ? (
                <div className="flex items-center justify-center gap-5">
                    {series.map((s) => (
                        <span
                            key={s.key}
                            className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-tight text-muted-foreground"
                        >
                            <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: s.color }}
                            />
                            {s.label}
                        </span>
                    ))}
                </div>
            ) : null}

            <svg
                viewBox={`0 0 ${W} ${H}`}
                className="h-[280px] w-full"
                style={{ overflow: "visible" }}
                role="img"
                aria-label="Grouped bar chart"
            >
                <defs>
                    {series.map((s) => (
                        <linearGradient
                            key={s.key}
                            id={`bar-grad-${s.key}`}
                            x1="0"
                            x2="0"
                            y1="0"
                            y2="1"
                        >
                            <stop offset="0%" stopColor={s.color} stopOpacity="1" />
                            <stop offset="100%" stopColor={s.color} stopOpacity="0.78" />
                        </linearGradient>
                    ))}
                </defs>

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
                                y={gy + 4.5}
                                textAnchor="end"
                                fontSize={13}
                                fontWeight={600}
                                className="fill-muted-foreground/80"
                            >
                                {formatTick(t)}
                            </text>
                        </g>
                    );
                })}

                {groups.map((group, gi) => {
                    const groupX = PAD.left + slot * gi + (slot - groupW) / 2;
                    const cx = PAD.left + slot * gi + slot / 2;
                    return (
                        <g key={group}>
                            {series.map((s, si) => {
                                const value = s.values[gi] ?? 0;
                                const barH = (value / axisMax) * PLOT_H;
                                const x = groupX + si * (barW + BAR_GAP);
                                const y = PAD.top + PLOT_H - barH;
                                const radius = Math.min(4, barW / 2, barH);
                                return (
                                    <g key={s.key}>
                                        <title>{`${group} · ${s.label}: ${s.display[gi] ?? ""}`}</title>
                                        {barH > 0 ? (
                                            <rect
                                                x={x}
                                                y={y}
                                                width={barW}
                                                height={barH}
                                                rx={radius}
                                                ry={radius}
                                                fill={`url(#bar-grad-${s.key})`}
                                            />
                                        ) : null}
                                        {showValueLabelsResolved ? (
                                            <text
                                                x={x + barW / 2}
                                                y={y - 6}
                                                textAnchor="middle"
                                                fontSize={13}
                                                fontWeight={700}
                                                className="fill-foreground/90"
                                            >
                                                {s.display[gi] ?? ""}
                                            </text>
                                        ) : null}
                                    </g>
                                );
                            })}
                            <text
                                x={cx}
                                y={PAD.top + PLOT_H + 24}
                                textAnchor="middle"
                                fontSize={15}
                                fontWeight={600}
                                className="fill-muted-foreground/80"
                            >
                                {group}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}
