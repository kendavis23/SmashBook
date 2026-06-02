import type { JSX } from "react";
import { ArrowUpRight, ArrowDownRight, Minus, Award } from "lucide-react";
import { formatCurrency } from "@repo/ui";
import type { Granularity } from "@repo/staff-domain/models";
import type { RevenueTrendStats } from "../revenueTrend";
import { formatShortDate } from "../revenueConstants";

type Props = {
    trend: RevenueTrendStats;
    granularity: Granularity;
};

const PERIOD_NOUN: Record<Granularity, string> = {
    day: "day",
    week: "week",
    month: "month",
};

function changeTone(direction: RevenueTrendStats["direction"]): {
    cls: string;
    icon: JSX.Element;
} {
    if (direction === "up") {
        return { cls: "bg-success/10 text-success", icon: <ArrowUpRight size={14} /> };
    }
    if (direction === "down") {
        return { cls: "bg-destructive/10 text-destructive", icon: <ArrowDownRight size={14} /> };
    }
    return { cls: "bg-muted text-muted-foreground", icon: <Minus size={14} /> };
}

/** Compact trend KPIs derived from the timeseries — average, peak, momentum. */
export function RevenueTrendStrip({ trend, granularity }: Props): JSX.Element {
    const noun = PERIOD_NOUN[granularity];
    const tone = changeTone(trend.direction);
    const changeLabel =
        trend.direction === "flat"
            ? "No change"
            : `${trend.changePct > 0 ? "+" : ""}${trend.changePct.toFixed(1)}%`;

    return (
        <div className="mb-5 grid grid-cols-3 gap-2.5">
            <Stat
                icon={<BarsIcon />}
                iconCls="bg-info/10 text-info"
                label={`Avg / ${noun}`}
                value={formatCurrency(trend.avgNetPerPeriod)}
            />
            <Stat
                icon={<Award size={14} />}
                iconCls="bg-warning/10 text-warning"
                label={`Best ${noun}`}
                value={formatCurrency(trend.peakNet)}
                hint={
                    trend.peakPeriod
                        ? formatShortDate(trend.peakPeriod.substring(0, 10))
                        : undefined
                }
            />
            <Stat
                icon={tone.icon}
                iconCls={tone.cls}
                label="Latest Change"
                value={changeLabel}
                hint={`vs prev ${noun}`}
            />
        </div>
    );
}

type StatProps = {
    icon: JSX.Element;
    iconCls: string;
    label: string;
    value: string;
    hint?: string;
};

function Stat({ icon, iconCls, label, value, hint }: StatProps): JSX.Element {
    return (
        <div className="flex items-center gap-2.5 rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
            <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${iconCls}`}
            >
                {icon}
            </div>
            <div className="min-w-0">
                <p className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {label}
                </p>
                <div className="flex items-baseline gap-1.5">
                    <span className="truncate text-sm font-bold leading-tight tracking-tight text-foreground">
                        {value}
                    </span>
                    {hint ? (
                        <span className="truncate text-[10px] text-muted-foreground">{hint}</span>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

/** Small bar-chart glyph for the "average" stat. */
function BarsIcon(): JSX.Element {
    return (
        <svg width={14} height={14} viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="1.5" y="9" width="3" height="5.5" rx="1" fill="currentColor" />
            <rect x="6.5" y="5" width="3" height="9.5" rx="1" fill="currentColor" />
            <rect x="11.5" y="2" width="3" height="12.5" rx="1" fill="currentColor" />
        </svg>
    );
}
