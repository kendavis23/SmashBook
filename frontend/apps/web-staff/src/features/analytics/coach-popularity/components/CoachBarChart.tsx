import type { JSX } from "react";
import { Info } from "lucide-react";
import type { CoachPopularityRow } from "../../types";
import { coachDisplayName } from "../coachPopularityConstants";
import { panelCls, panelTitleCls } from "../coachPopularityConstants";

type BarChartRow = {
    label: string;
    value: number;
    display: string;
};

type CoachBarChartProps = {
    title: string;
    hint: string;
    xAxisLabel: string;
    rows: CoachPopularityRow[];
    metricOf: (row: CoachPopularityRow) => { value: number; display: string };
    barClassName: string;
    maxValue?: number;
    tickFormatter?: (value: number) => string;
};

const TICK_COUNT = 4;

function roundedAxisMaximum(value: number): number {
    if (value <= 0) return 1;

    const roughStep = value / TICK_COUNT;
    const magnitude = 10 ** Math.floor(Math.log10(roughStep));
    const normalizedStep = roughStep / magnitude;
    const niceStep =
        normalizedStep <= 1 ? 1 : normalizedStep <= 2 ? 2 : normalizedStep <= 5 ? 5 : 10;

    return niceStep * magnitude * TICK_COUNT;
}

export function CoachBarChart({
    title,
    hint,
    xAxisLabel,
    rows,
    metricOf,
    barClassName,
    maxValue: configuredMaxValue,
    tickFormatter = (value) => value.toLocaleString(),
}: CoachBarChartProps): JSX.Element {
    const data: BarChartRow[] = rows.map((r) => {
        const { value, display } = metricOf(r);
        return { label: coachDisplayName(r.coach_name), value, display };
    });

    const dataMax = Math.max(...data.map((d) => d.value), 0);
    const axisMaximum = configuredMaxValue ?? roundedAxisMaximum(dataMax);
    const ticks = Array.from(
        { length: TICK_COUNT + 1 },
        (_, index) => (axisMaximum / TICK_COUNT) * index
    );

    return (
        <section className={`${panelCls} flex min-w-0 flex-col gap-5 overflow-hidden`}>
            <div className="flex items-start gap-1.5">
                <h2 className={panelTitleCls}>{title}</h2>
                <span
                    title={hint}
                    className="mt-0.5 cursor-default text-muted-foreground/60 hover:text-muted-foreground"
                >
                    <Info size={13} />
                </span>
            </div>

            {data.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No data</p>
            ) : (
                <div className="overflow-x-auto pb-1">
                    <div
                        className="grid min-w-[27rem] grid-cols-[6rem_minmax(12rem,1fr)_3.5rem]"
                        role="img"
                        aria-label={`${title}. ${xAxisLabel} values by coach name.`}
                    >
                        {data.map((d, index) => {
                            const pct =
                                axisMaximum > 0
                                    ? Math.min(100, Math.max(0, (d.value / axisMaximum) * 100))
                                    : 0;

                            return (
                                <div
                                    key={d.label}
                                    className="col-start-1 col-end-4 grid grid-cols-[6rem_minmax(12rem,1fr)_3.5rem] items-center"
                                >
                                    <p
                                        className="truncate pr-2 text-xs font-medium text-foreground"
                                        title={d.label}
                                    >
                                        {d.label}
                                    </p>
                                    <div
                                        className={`relative flex h-11 items-center border-l border-border/80 ${
                                            index === data.length - 1 ? "border-b" : ""
                                        }`}
                                    >
                                        {ticks.slice(1).map((tick, tickIndex) => (
                                            <div
                                                key={tick}
                                                className="pointer-events-none absolute inset-y-0 border-l border-dashed border-border/55"
                                                style={{
                                                    left: `${((tickIndex + 1) / TICK_COUNT) * 100}%`,
                                                }}
                                            />
                                        ))}
                                        <div
                                            className={`relative z-10 h-4 rounded-r ${barClassName} transition-[width] duration-500`}
                                            style={{
                                                width: `${pct}%`,
                                                minWidth: d.value > 0 ? "0.35rem" : undefined,
                                            }}
                                        />
                                    </div>
                                    <span className="pl-3 text-sm font-semibold tabular-nums text-foreground">
                                        {d.display}
                                    </span>
                                </div>
                            );
                        })}

                        <div className="col-start-2 grid grid-cols-5 pt-2">
                            {ticks.map((tick, index) => (
                                <span
                                    key={tick}
                                    className={`text-[10px] font-medium tabular-nums text-muted-foreground ${
                                        index === 0
                                            ? "text-left"
                                            : index === ticks.length - 1
                                              ? "text-right"
                                              : "text-center"
                                    }`}
                                >
                                    {tickFormatter(tick)}
                                </span>
                            ))}
                        </div>
                        <p className="col-start-2 pt-2 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            {xAxisLabel}
                        </p>
                    </div>
                </div>
            )}
        </section>
    );
}
