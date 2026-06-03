import { useEffect, useMemo, useState, type JSX } from "react";
import type { DailyUtilisationPoint } from "../../types";
import { formatShortDate } from "../utilisationConstants";

type Props = {
    points: DailyUtilisationPoint[];
};

const W = 1200;
const H = 220;
const PAD = { top: 18, right: 24, bottom: 34, left: 44 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;
const TOOLTIP_W = 164;
const TOOLTIP_H = 74;
const TOOLTIP_GAP = 12;

function toX(i: number, total: number): number {
    if (total <= 1) return PAD.left + PLOT_W / 2;
    return PAD.left + (i / (total - 1)) * PLOT_W;
}

function getAxisMax(maxPct: number): number {
    if (maxPct <= 10) return 10;
    if (maxPct <= 20) return 20;
    if (maxPct <= 50) return 50;
    return 100;
}

function getYSteps(axisMax: number): number[] {
    if (axisMax === 10) return [0, 2, 4, 6, 8, 10];
    if (axisMax === 20) return [0, 5, 10, 15, 20];
    if (axisMax === 50) return [0, 10, 20, 30, 40, 50];
    return [0, 20, 40, 60, 80, 100];
}

function toY(pct: number, axisMax: number): number {
    const clamped = Math.max(0, Math.min(axisMax, pct));
    return PAD.top + PLOT_H - (clamped / axisMax) * PLOT_H;
}

function formatFullDate(snapshotDate: string): string {
    const [year, month, day] = snapshotDate.split("-").map(Number);
    if (!year || !month || !day || month < 1 || month > 12) return formatShortDate(snapshotDate);

    const monthName = new Intl.DateTimeFormat("en", { month: "short" }).format(
        new Date(Date.UTC(year, month - 1, 1))
    );
    return `${day} ${monthName} ${year}`;
}

function defaultActiveIndex(values: number[]): number | null {
    if (values.length === 0) return null;
    return values.length - 1;
}

/** Line chart of daily utilisation percentage. Pure SVG — no external charting lib. */
export function UtilisationLineChart({ points }: Props): JSX.Element {
    const values = useMemo(() => points.map((p) => Number(p.utilisation_pct) || 0), [points]);
    const [hoverIdx, setHoverIdx] = useState<number | null>(null);

    useEffect(() => {
        setHoverIdx(null);
    }, [points]);

    if (points.length === 0) {
        return (
            <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
                No utilisation data for this period.
            </div>
        );
    }

    const maxPct = Math.max(...values, 0);
    const axisMax = getAxisMax(maxPct);
    const ySteps = getYSteps(axisMax);

    const coords = points.map((p, i) => {
        const pctNum = Number(p.utilisation_pct) || 0;
        return {
            x: toX(i, points.length),
            y: toY(pctNum, axisMax),
            pct: Math.round(pctNum),
            label: formatShortDate(p.snapshot_date),
            fullLabel: formatFullDate(p.snapshot_date),
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
    const maxValue = Math.max(...coords.map((c) => c.pct));
    const minValue = Math.min(...coords.map((c) => c.pct));
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
            aria-label="Daily utilisation percentage chart"
            onMouseLeave={() => setHoverIdx(null)}
        >
            <defs>
                <linearGradient id="utilisation-area" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--cta))" stopOpacity="0.22" />
                    <stop offset="55%" stopColor="hsl(var(--cta))" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="hsl(var(--cta))" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="utilisation-stroke" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="hsl(var(--cta))" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="hsl(var(--cta))" stopOpacity="1" />
                </linearGradient>
                <filter id="utilisation-glow" x="-20%" y="-40%" width="140%" height="180%">
                    <feDropShadow
                        dx="0"
                        dy="2"
                        stdDeviation="3"
                        floodColor="hsl(var(--cta))"
                        floodOpacity="0.25"
                    />
                </filter>
            </defs>

            {ySteps.map((v) => {
                const gy = toY(v, axisMax);
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
                            {v}%
                        </text>
                    </g>
                );
            })}

            {areaPath ? <path d={areaPath} fill="url(#utilisation-area)" /> : null}

            {coords.length > 1 ? (
                <polyline
                    points={polyline}
                    fill="none"
                    stroke="url(#utilisation-stroke)"
                    strokeWidth={2.75}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    filter="url(#utilisation-glow)"
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
                    c.pct === maxValue ||
                    c.pct === minValue ||
                    activeIdx === i;
                const isActive = activeIdx === i;
                return (
                    <g key={i}>
                        <title>{`${c.fullLabel}: ${c.pct}% utilisation`}</title>
                        {c.pct > 0 || isActive ? (
                            <circle
                                cx={c.x}
                                cy={c.y}
                                r={isActive ? 8 : 7}
                                fill="hsl(var(--cta))"
                                opacity={isActive ? 0.16 : 0.12}
                            />
                        ) : null}
                        <circle
                            cx={c.x}
                            cy={c.y}
                            r={isActive ? 5 : c.pct > 0 ? 4 : 3.25}
                            fill="white"
                            stroke="hsl(var(--cta))"
                            strokeWidth={isActive ? 3 : c.pct > 0 ? 2.5 : 2}
                            opacity={c.pct > 0 ? 1 : 0.7}
                        />
                        <rect
                            x={c.x - 14}
                            y={PAD.top}
                            width={28}
                            height={PLOT_H}
                            fill="transparent"
                            tabIndex={0}
                            role="button"
                            aria-label={`${c.fullLabel}: ${c.pct}% utilisation`}
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
                                {c.pct}%
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
                    pct={tooltip.pct}
                    x={tooltip.x}
                    y={tooltip.y}
                />
            ) : null}
        </svg>
    );
}

function TooltipBox({
    label,
    pct,
    x,
    y,
}: {
    label: string;
    pct: number;
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
                <p className="mt-1 text-sm font-semibold text-foreground">{pct}% utilisation</p>
            </div>
        </foreignObject>
    );
}
