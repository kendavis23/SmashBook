import type { JSX } from "react";

export type SkillDataPoint = {
    label: string;
    value: number;
};

type Props = {
    data: SkillDataPoint[];
    /** Y-axis domain min/max — defaults to 1 and 7 */
    yMin?: number;
    yMax?: number;
};

const W = 640;
const H = 260;
const PAD = { top: 24, right: 34, bottom: 52, left: 42 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

function toX(i: number, total: number): number {
    if (total <= 1) return PAD.left + PLOT_W / 2;
    return PAD.left + (i / (total - 1)) * PLOT_W;
}

function toY(v: number, min: number, max: number): number {
    const range = max - min || 1;
    return PAD.top + PLOT_H - ((v - min) / range) * PLOT_H;
}

export function SkillLineChart({ data, yMin = 1, yMax = 7 }: Props): JSX.Element {
    if (data.length === 0) {
        return (
            <div className="flex h-full min-h-[220px] items-center justify-center text-xs text-muted-foreground">
                No data
            </div>
        );
    }

    const allValues = data.map((d) => d.value);
    const dataMin = Math.min(...allValues);
    const dataMax = Math.max(...allValues);
    const domainMin = Math.min(yMin, dataMin);
    const domainMax = Math.max(yMax, dataMax);

    const points = data.map((d, i) => ({
        x: toX(i, data.length),
        y: toY(d.value, domainMin, domainMax),
        value: d.value,
        label: d.label,
    }));

    const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");

    // Grid lines for each integer step
    const ySteps: number[] = [];
    for (let v = Math.ceil(domainMin); v <= Math.floor(domainMax); v++) {
        ySteps.push(v);
    }

    const lastPoint = points.length > 0 ? points[points.length - 1] : null;
    const lastVal = data.length > 0 ? data[data.length - 1]?.value : undefined;
    const prevVal = data.length > 1 ? data[data.length - 2]?.value : undefined;
    const isUp = lastVal == null || prevVal == null ? true : lastVal >= prevVal;
    const labelEvery = data.length > 8 ? Math.ceil(data.length / 5) : 1;

    const lineColor = isUp ? "var(--color-success, #22c55e)" : "var(--color-destructive, #ef4444)";

    return (
        <svg
            viewBox={`0 0 ${W} ${H}`}
            width="100%"
            height="100%"
            style={{ overflow: "visible" }}
            aria-label="Skill progression chart"
        >
            <defs>
                <linearGradient id="skill-line-fill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={lineColor} stopOpacity={0.18} />
                    <stop offset="100%" stopColor={lineColor} stopOpacity={0.02} />
                </linearGradient>
            </defs>

            {/* Grid */}
            {ySteps.map((v) => {
                const gy = toY(v, domainMin, domainMax);
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
                            x={PAD.left - 5}
                            y={gy + 3.5}
                            textAnchor="end"
                            fontSize={11}
                            fontWeight={600}
                            className="fill-muted-foreground"
                        >
                            {v}
                        </text>
                    </g>
                );
            })}

            {points.map((p, i) =>
                i === 0 || i === points.length - 1 || i % labelEvery === 0 ? (
                    <line
                        key={`x-grid-${i}`}
                        x1={p.x}
                        y1={PAD.top}
                        x2={p.x}
                        y2={PAD.top + PLOT_H}
                        stroke="currentColor"
                        strokeWidth={0.5}
                        strokeDasharray="3 5"
                        className="text-border/70"
                    />
                ) : null
            )}

            {/* Axes */}
            <line
                x1={PAD.left}
                y1={PAD.top}
                x2={PAD.left}
                y2={PAD.top + PLOT_H}
                stroke="currentColor"
                strokeWidth={1}
                className="text-border"
            />
            <line
                x1={PAD.left}
                y1={PAD.top + PLOT_H}
                x2={PAD.left + PLOT_W}
                y2={PAD.top + PLOT_H}
                stroke="currentColor"
                strokeWidth={1}
                className="text-border"
            />

            {/* Area fill */}
            {points.length > 1 && points[0] != null && points[points.length - 1] != null ? (
                <polygon
                    points={`${points[0].x},${PAD.top + PLOT_H} ${polyline} ${points[points.length - 1]!.x},${PAD.top + PLOT_H}`}
                    fill="url(#skill-line-fill)"
                />
            ) : null}

            {/* Line */}
            {points.length > 1 ? (
                <polyline
                    points={polyline}
                    fill="none"
                    stroke={lineColor}
                    strokeWidth={4}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                />
            ) : null}

            {/* Data points */}
            {points.map((p, i) => (
                <g key={i}>
                    <title>{`${p.label}: ${p.value}`}</title>
                    <circle
                        cx={p.x}
                        cy={p.y}
                        r={5}
                        fill="white"
                        stroke={lineColor}
                        strokeWidth={2.5}
                    />
                    {i === 0 || i === data.length - 1 || i % labelEvery === 0 ? (
                        <text
                            x={p.x}
                            y={PAD.top + PLOT_H + 22}
                            textAnchor="middle"
                            fontSize={12}
                            fontWeight={600}
                            className="fill-muted-foreground"
                        >
                            {p.label}
                        </text>
                    ) : null}
                </g>
            ))}

            {/* Latest value callout */}
            {lastPoint ? (
                <g>
                    <rect
                        x={Math.min(Math.max(lastPoint.x - 18, PAD.left), W - PAD.right - 36)}
                        y={Math.max(lastPoint.y - 30, 2)}
                        width={36}
                        height={19}
                        rx={5}
                        fill={lineColor}
                    />
                    <text
                        x={Math.min(Math.max(lastPoint.x, PAD.left + 18), W - PAD.right - 18)}
                        y={Math.max(lastPoint.y - 17, 15)}
                        textAnchor="middle"
                        fontSize={12}
                        fontWeight="700"
                        fill="white"
                    >
                        {lastPoint.value}
                    </text>
                </g>
            ) : null}
        </svg>
    );
}
