import type { JSX } from "react";
import { Clock, TrendingUp, Calendar } from "lucide-react";
import type { PeakDay, PeakHour } from "../heatmapUtils";

type Props = {
    overallAvgPct: number;
    peakHour: PeakHour | undefined;
    peakDay: PeakDay | undefined;
    rangeLabel: string;
};

export function HeatmapKpiCards({
    overallAvgPct,
    peakHour,
    peakDay,
    rangeLabel,
}: Props): JSX.Element {
    return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <KpiCard
                icon={<TrendingUp size={18} />}
                label="Avg Utilisation"
                value={`${overallAvgPct.toFixed(1)}%`}
                caption={rangeLabel}
                tone="cta"
            />
            <KpiCard
                icon={<Clock size={18} />}
                label="Peak Hour"
                value={peakHour ? peakHour.label : "—"}
                caption={peakHour ? `${peakHour.avgPct.toFixed(1)}% avg across week` : "No data"}
                tone="success"
            />
            <KpiCard
                icon={<Calendar size={18} />}
                label="Busiest Day"
                value={peakDay ? peakDay.label : "—"}
                caption={peakDay ? `${peakDay.avgPct.toFixed(1)}% avg utilisation` : "No data"}
                tone="warning"
            />
        </div>
    );
}

type KpiCardProps = {
    icon: JSX.Element;
    label: string;
    value: string;
    caption: string;
    tone: "cta" | "success" | "warning";
};

const toneMap = {
    cta: {
        icon: "bg-cta/10 text-cta",
        value: "text-cta",
    },
    success: {
        icon: "bg-success/10 text-success",
        value: "text-success",
    },
    warning: {
        icon: "bg-warning/10 text-warning",
        value: "text-warning",
    },
} as const;

function KpiCard({ icon, label, value, caption, tone }: KpiCardProps): JSX.Element {
    const t = toneMap[tone];
    return (
        <div className="rounded-xl border border-border/80 bg-card px-3.5 py-3 shadow-sm shadow-black/5 transition hover:border-cta/25 hover:shadow-md">
            <div className="flex items-center gap-3">
                <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${t.icon}`}
                >
                    {icon}
                </span>
                <div className="min-w-0">
                    <p className="truncate text-xs font-semibold leading-4 text-muted-foreground">
                        {label}
                    </p>
                    <p
                        className={`mt-0.5 truncate text-xl font-semibold leading-7 tracking-tight ${t.value}`}
                    >
                        {value}
                    </p>
                    <p className="truncate text-[11px] font-medium leading-4 text-muted-foreground">
                        {caption}
                    </p>
                </div>
            </div>
        </div>
    );
}
