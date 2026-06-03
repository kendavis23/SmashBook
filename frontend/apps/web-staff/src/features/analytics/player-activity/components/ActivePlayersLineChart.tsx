import { useEffect, useMemo, useState, type JSX } from "react";
import type { ActivePlayersPoint, FlowGranularity } from "../../types";
import { formatPeriodLabel } from "../playerActivityConstants";

type Props = {
    points: ActivePlayersPoint[];
    granularity: FlowGranularity;
};

const W = 1200;
const H = 220;
const PAD = { top: 18, right: 24, bottom: 34, left: 48 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;
const TICK_COUNT = 4;
const TOOLTIP_W = 172;
const TOOLTIP_H = 74;
const TOOLTIP_GAP = 12;

function toX(i: number, total: number): number {
    if (total <= 1) return PAD.left + PLOT_W / 2;
    return PAD.left + (i / (total - 1)) * PLOT_W;
}

function niceCeil(max: number): number {
    if (max <= 0) return TICK_COUNT;
    const pow = Math.pow(10, Math.floor(Math.log10(max)));
    const steps = [1, 2, 2.5, 5, 10];
    for (const step of steps) {
        const candidate = step * pow;
        if (candidate >= max) return Math.ceil(candidate);
    }
    return Math.ceil(10 * pow);
}

function formatFullPeriodLabel(value: string, granularity: FlowGranularity): string {
    const datePart = value.slice(0, 10);
    const [y, m, d] = datePart.split("-").map(Number);
    if (!y || !m || !d || m < 1 || m > 12) return formatPeriodLabel(value, granularity);

    const month = new Intl.DateTimeFormat("en", { month: "short" }).format(
        new Date(Date.UTC(y, m - 1, 1))
    );
    if (granularity === "month") return `${month} ${y}`;
    return `${d} ${month} ${y}`;
}

function defaultActiveIndex(values: number[]): number | null {
    if (values.length === 0) return null;
    return values.length - 1;
}

/** Line chart of active players per period. Pure SVG — no external charting lib. */
export function ActivePlayersLineChart({ points, granularity }: Props): JSX.Element {
    const values = useMemo(() => points.map((p) => Number(p.active_players) || 0), [points]);
    const [hoverIdx, setHoverIdx] = useState<number | null>(null);

    useEffect(() => {
        setHoverIdx(null);
    }, [points]);

    if (points.length === 0) {
        return (
            <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
                No active-player data for this period.
            </div>
        );
    }

    const axisMax = niceCeil(Math.max(...values, 0));
    const toY = (value: number): number => {
        const clamped = Math.max(0, Math.min(axisMax, value));
        return PAD.top + PLOT_H - (clamped / axisMax) * PLOT_H;
    };
    const ySteps = Array.from({ length: TICK_COUNT + 1 }, (_, i) =>
        Math.round((axisMax / TICK_COUNT) * i)
    );

    const coords = points.map((p, i) => {
        const value = Number(p.active_players) || 0;
        return {
            x: toX(i, points.length),
            y: toY(value),
            value,
            label: formatPeriodLabel(p.period_start, granularity),
            fullLabel: formatFullPeriodLabel(p.period_start, granularity),
        };
    });
    const polyline = coords.map((c) => `${c.x},${c.y}`).join(" ");
    const areaPath =
        coords.length > 1
            ? `M ${coords[0]?.x ?? PAD.left} ${PAD.top + PLOT_H} L ${coords
                  .map((c) => `${c.x} ${c.y}`)
                  .join(" L ")} L ${coords[coords.length - 1]?.x ?? PAD.left} ${PAD.top + PLOT_H} Z`
            : "";
    const labelEvery = points.length > 8 ? Math.ceil(points.length / 6) : 1;
    const showAllValueLabels = points.length <= 35;
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const activeIdx = hoverIdx ?? defaultActiveIndex(values);
    const tooltip =
        activeIdx === null || coords[activeIdx] === undefined
            ? null
            : { ...coords[activeIdx], idx: activeIdx };

    return (
        <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="xMidYMid meet"
            className="block w-full"
            style={{ overflow: "visible" }}
            role="img"
            aria-label="Active players per period chart"
            onMouseLeave={() => setHoverIdx(null)}
        >
            <defs>
                <linearGradient id="active-players-area" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--cta))" stopOpacity="0.22" />
                    <stop offset="55%" stopColor="hsl(var(--cta))" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="hsl(var(--cta))" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="active-players-stroke" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="hsl(var(--cta))" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="hsl(var(--cta))" stopOpacity="1" />
                </linearGradient>
            </defs>

            {ySteps.map((v) => {
                const gy = toY(v);
                return (
                    <g key={v}>
                        <line
                            x1={PAD.left}
                            y1={gy}
                            x2={PAD.left + PLOT_W}
                            y2={gy}
                            stroke="currentColor"
                            strokeWidth={0.75}
                            strokeDasharray="2 5"
                            strokeLinecap="round"
                            className="text-border/70"
                        />
                        <text
                            x={PAD.left - 10}
                            y={gy + 3.5}
                            textAnchor="end"
                            fontSize={11}
                            fontWeight={600}
                            className="fill-muted-foreground/80"
                        >
                            {v.toLocaleString()}
                        </text>
                    </g>
                );
            })}

            {areaPath ? <path d={areaPath} fill="url(#active-players-area)" /> : null}

            {coords.length > 1 ? (
                <polyline
                    points={polyline}
                    fill="none"
                    stroke="url(#active-players-stroke)"
                    strokeWidth={2.75}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                />
            ) : null}

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

            {coords.map((c, i) => {
                const shouldLabelValue =
                    showAllValueLabels ||
                    i === 0 ||
                    i === coords.length - 1 ||
                    c.value === maxValue ||
                    c.value === minValue ||
                    activeIdx === i;
                const isActive = activeIdx === i;
                return (
                    <g key={i}>
                        <title>{`${c.fullLabel}: ${c.value.toLocaleString()} active players`}</title>
                        {isActive ? (
                            <circle cx={c.x} cy={c.y} r={8} fill="hsl(var(--cta))" opacity={0.14} />
                        ) : null}
                        <circle
                            cx={c.x}
                            cy={c.y}
                            r={isActive ? 5 : c.value > 0 ? 4 : 3.25}
                            fill="white"
                            stroke="hsl(var(--cta))"
                            strokeWidth={isActive ? 3 : c.value > 0 ? 2.5 : 2}
                            opacity={c.value > 0 ? 1 : 0.7}
                        />
                        <rect
                            x={c.x - 14}
                            y={PAD.top}
                            width={28}
                            height={PLOT_H}
                            fill="transparent"
                            tabIndex={0}
                            role="button"
                            aria-label={`${c.fullLabel}: ${c.value.toLocaleString()} active players`}
                            onMouseEnter={() => setHoverIdx(i)}
                            onFocus={() => setHoverIdx(i)}
                            onBlur={() => setHoverIdx(null)}
                            className="outline-none"
                            style={{ cursor: "crosshair", outline: "none" }}
                        />
                        {shouldLabelValue ? (
                            <text
                                x={c.x}
                                y={c.y - 11}
                                textAnchor="middle"
                                fontSize={11}
                                fontWeight={700}
                                className="fill-foreground"
                            >
                                {c.value.toLocaleString()}
                            </text>
                        ) : null}
                        {i === 0 || i === coords.length - 1 || i % labelEvery === 0 ? (
                            <text
                                x={c.x}
                                y={PAD.top + PLOT_H + 20}
                                textAnchor="middle"
                                fontSize={11}
                                fontWeight={600}
                                className="fill-muted-foreground"
                            >
                                {c.label}
                            </text>
                        ) : null}
                    </g>
                );
            })}
            {tooltip ? (
                <TooltipBox
                    label={tooltip.fullLabel}
                    value={tooltip.value}
                    x={tooltip.x}
                    y={tooltip.y}
                />
            ) : null}
        </svg>
    );
}

function TooltipBox({
    label,
    value,
    x,
    y,
}: {
    label: string;
    value: number;
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
            <div className="h-full rounded-xl border border-border bg-card px-3.5 py-3 shadow-lg">
                <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                    {value.toLocaleString()} active players
                </p>
            </div>
        </foreignObject>
    );
}
