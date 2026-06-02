import { useEffect, useState, type JSX } from "react";
import { formatCurrency } from "@repo/ui";
import type { RevenueTimeseriesPoint } from "@repo/staff-domain/models";
import { formatShortDate } from "../revenueConstants";

type Props = {
    points: RevenueTimeseriesPoint[];
};

const W = 1000;
const H = 240;
const PAD = { top: 18, right: 16, bottom: 36, left: 56 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;
const Y_TICKS = 5;
const TOOLTIP_W = 220;
const TOOLTIP_H = 136;
const TOOLTIP_GAP = 12;

function niceCeil(value: number): number {
    if (value <= 0) return 100;
    const pow = Math.pow(10, Math.floor(Math.log10(value)));
    for (const step of [1, 1.5, 2, 2.5, 5, 10]) {
        const candidate = step * pow;
        if (candidate >= value) return candidate;
    }
    return 10 * pow;
}

type TooltipState = {
    x: number;
    y: number;
    point: RevenueTimeseriesPoint;
    idx: number;
} | null;

function defaultActiveIndex(points: RevenueTimeseriesPoint[]): number | null {
    if (points.length === 0) return null;

    let bestIdx = 0;
    let bestNet = Number(points[0]?.net_amount) || 0;
    points.forEach((point, idx) => {
        const net = Number(point.net_amount) || 0;
        if (net > bestNet) {
            bestNet = net;
            bestIdx = idx;
        }
    });

    return bestIdx;
}

export function RevenueTimeseriesChart({ points }: Props): JSX.Element {
    const [activeIdx, setActiveIdx] = useState<number | null>(() => defaultActiveIndex(points));

    useEffect(() => {
        setActiveIdx(defaultActiveIndex(points));
    }, [points]);

    if (points.length === 0) {
        return (
            <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
                No data to display.
            </div>
        );
    }

    const maxGross = Math.max(0, ...points.map((p) => Number(p.gross_amount) || 0));
    const axisMax = niceCeil(maxGross);

    const toX = (i: number): number =>
        PAD.left + (points.length > 1 ? (i / (points.length - 1)) * PLOT_W : PLOT_W / 2);
    const toY = (value: number): number =>
        axisMax > 0 ? PAD.top + PLOT_H - (value / axisMax) * PLOT_H : PAD.top + PLOT_H;

    const ticks = Array.from({ length: Y_TICKS + 1 }, (_, i) => (axisMax / Y_TICKS) * i);

    const grossColor = "hsl(142 71% 45%)";
    const refundColor = "hsl(0 84% 60%)";
    const netColor = "hsl(var(--cta))";

    const makePath = (values: number[]): string =>
        values.map((v, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(v)}`).join(" ");

    const makeAreaPath = (values: number[]): string => {
        const baseline = toY(0);
        const linePart = values
            .map((v, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(v)}`)
            .join(" ");
        return `${linePart} L ${toX(values.length - 1)} ${baseline} L ${toX(0)} ${baseline} Z`;
    };

    const grossValues = points.map((p) => Number(p.gross_amount) || 0);
    const refundValues = points.map((p) => Number(p.refund_amount) || 0);
    const netValues = points.map((p) => Number(p.net_amount) || 0);
    const tooltip: TooltipState =
        activeIdx === null || points[activeIdx] === undefined
            ? null
            : {
                  x: toX(activeIdx),
                  y: toY(Number(points[activeIdx].net_amount) || 0),
                  point: points[activeIdx],
                  idx: activeIdx,
              };

    // Show every Nth label to avoid overlap
    const maxLabels = 10;
    const labelStep = Math.max(1, Math.ceil(points.length / maxLabels));

    return (
        <div>
            {/* Legend */}
            <div className="mb-3 flex flex-wrap items-center gap-5">
                {[
                    { color: grossColor, label: "Gross Amount" },
                    { color: refundColor, label: "Refund Amount" },
                    { color: netColor, label: "Net Amount" },
                ].map((s) => (
                    <span
                        key={s.label}
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

            <div className="relative">
                <svg
                    viewBox={`0 0 ${W} ${H}`}
                    preserveAspectRatio="xMidYMid meet"
                    className="h-[260px] w-full"
                    style={{ overflow: "visible" }}
                    role="img"
                    aria-label="Revenue over time chart"
                    onMouseLeave={() => setActiveIdx(defaultActiveIndex(points))}
                >
                    <defs>
                        <linearGradient id="rev-gross-area" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor={grossColor} stopOpacity="0.12" />
                            <stop offset="100%" stopColor={grossColor} stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="rev-net-area" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor={netColor} stopOpacity="0.10" />
                            <stop offset="100%" stopColor={netColor} stopOpacity="0" />
                        </linearGradient>
                    </defs>

                    {/* Gridlines + Y-axis labels */}
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
                                    fontSize={12}
                                    fontWeight={600}
                                    className="fill-muted-foreground/80"
                                >
                                    {formatCurrency(t)}
                                </text>
                            </g>
                        );
                    })}

                    {/* Area fills */}
                    <path d={makeAreaPath(grossValues)} fill="url(#rev-gross-area)" />
                    <path d={makeAreaPath(netValues)} fill="url(#rev-net-area)" />

                    {/* Lines */}
                    <path
                        d={makePath(grossValues)}
                        fill="none"
                        stroke={grossColor}
                        strokeWidth={2}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                    />
                    <path
                        d={makePath(refundValues)}
                        fill="none"
                        stroke={refundColor}
                        strokeWidth={2}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                    />
                    <path
                        d={makePath(netValues)}
                        fill="none"
                        stroke={netColor}
                        strokeWidth={2}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                    />

                    {/* Dots + hover targets */}
                    {points.map((p, i) => {
                        const cx = toX(i);
                        const isHovered = activeIdx === i;
                        return (
                            <g key={p.period_start}>
                                <circle
                                    cx={cx}
                                    cy={toY(Number(p.gross_amount) || 0)}
                                    r={isHovered ? 5 : 3.5}
                                    fill={grossColor}
                                />
                                <circle
                                    cx={cx}
                                    cy={toY(Number(p.refund_amount) || 0)}
                                    r={isHovered ? 5 : 3.5}
                                    fill={refundColor}
                                />
                                <circle
                                    cx={cx}
                                    cy={toY(Number(p.net_amount) || 0)}
                                    r={isHovered ? 5 : 3.5}
                                    fill={netColor}
                                />
                                {/* Invisible wide hit area */}
                                <rect
                                    x={cx - 12}
                                    y={PAD.top}
                                    width={24}
                                    height={PLOT_H}
                                    fill="transparent"
                                    onMouseEnter={() => setActiveIdx(i)}
                                    style={{ cursor: "crosshair" }}
                                />
                            </g>
                        );
                    })}

                    {/* Hover crosshair */}
                    {tooltip ? (
                        <line
                            x1={tooltip.x}
                            y1={PAD.top}
                            x2={tooltip.x}
                            y2={PAD.top + PLOT_H}
                            stroke="currentColor"
                            strokeWidth={1}
                            strokeDasharray="4 3"
                            className="text-muted-foreground/50"
                        />
                    ) : null}

                    {/* X-axis labels */}
                    {points.map((p, i) => {
                        if (i % labelStep !== 0 && i !== points.length - 1) return null;
                        return (
                            <text
                                key={p.period_start}
                                x={toX(i)}
                                y={H - 8}
                                textAnchor="middle"
                                fontSize={12}
                                fontWeight={600}
                                className="fill-muted-foreground/80"
                            >
                                {formatShortDate(p.period_start.substring(0, 10))}
                            </text>
                        );
                    })}

                    {/* Tooltip */}
                    {tooltip ? (
                        <TooltipBox point={tooltip.point} x={tooltip.x} y={tooltip.y} />
                    ) : null}
                </svg>
            </div>
        </div>
    );
}

function TooltipBox({
    point,
    x,
    y,
}: {
    point: RevenueTimeseriesPoint;
    x: number;
    y: number;
}): JSX.Element {
    const placeLeft = x + TOOLTIP_GAP + TOOLTIP_W > W - PAD.right;
    const rawX = placeLeft ? x - TOOLTIP_GAP - TOOLTIP_W : x + TOOLTIP_GAP;
    const tooltipX = Math.max(PAD.left, Math.min(rawX, W - PAD.right - TOOLTIP_W));
    const tooltipY = Math.max(PAD.top, Math.min(y - TOOLTIP_H / 2, H - PAD.bottom - TOOLTIP_H));

    return (
        <foreignObject
            x={tooltipX}
            y={tooltipY}
            width={TOOLTIP_W}
            height={TOOLTIP_H}
            className="pointer-events-none overflow-visible"
        >
            <div className="h-full rounded-xl border border-border bg-card px-4 py-3 shadow-lg">
                <p className="mb-2 text-[11px] font-semibold text-muted-foreground">
                    {formatShortDate(point.period_start.substring(0, 10))}
                </p>
                <div className="space-y-1">
                    <Row
                        label="Gross Amount"
                        value={formatCurrency(Number(point.gross_amount) || 0)}
                        color="hsl(142 71% 45%)"
                    />
                    <Row
                        label="Refund Amount"
                        value={formatCurrency(Number(point.refund_amount) || 0)}
                        color="hsl(0 84% 60%)"
                    />
                    <Row
                        label="Net Amount"
                        value={formatCurrency(Number(point.net_amount) || 0)}
                        color="hsl(var(--cta))"
                    />
                    <div className="border-t border-border pt-1">
                        <Row
                            label="Transactions"
                            value={(Number(point.transaction_count) || 0).toLocaleString()}
                            color="hsl(var(--muted-foreground))"
                        />
                    </div>
                </div>
            </div>
        </foreignObject>
    );
}

function Row({
    label,
    value,
    color,
}: {
    label: string;
    value: string;
    color: string;
}): JSX.Element {
    return (
        <div className="flex items-center justify-between gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                {label}
            </span>
            <span className="font-semibold text-foreground">{value}</span>
        </div>
    );
}
