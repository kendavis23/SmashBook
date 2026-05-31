import type { JSX } from "react";
import { CalendarCheck, LayoutGrid, PieChart, PoundSterling } from "lucide-react";
import { formatCurrency } from "@repo/ui";
import type { UtilisationSummary } from "../../types";

type Props = {
    summary: UtilisationSummary;
};

type KpiCardProps = {
    icon: JSX.Element;
    label: string;
    value: string;
    secondary?: string;
    caption: string;
    tone: "default" | "booked" | "utilisation" | "revenue";
};

const toneCls: Record<KpiCardProps["tone"], string> = {
    default: "bg-secondary text-secondary-foreground",
    booked: "bg-cta/10 text-cta",
    utilisation: "bg-success/10 text-success",
    revenue: "bg-warning/10 text-warning",
};

function KpiCard({ icon, label, value, secondary, caption, tone }: KpiCardProps): JSX.Element {
    return (
        <div className="rounded-xl border border-border/80 bg-card px-3.5 py-3 shadow-sm shadow-black/5 transition hover:border-cta/25 hover:shadow-md">
            <div className="flex items-center gap-3">
                <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${toneCls[tone]}`}
                >
                    {icon}
                </div>
                <div className="min-w-0">
                    <p className="truncate text-xs font-semibold leading-4 text-muted-foreground">
                        {label}
                    </p>
                    <p className="mt-0.5 truncate text-xl font-semibold leading-7 tracking-tight text-foreground">
                        {value}
                        {secondary ? (
                            <span className="ml-1 text-sm font-medium text-muted-foreground">
                                {secondary}
                            </span>
                        ) : null}
                    </p>
                    <p className="truncate text-[11px] font-medium leading-4 text-muted-foreground">
                        {caption}
                    </p>
                </div>
            </div>
        </div>
    );
}

/** Four headline KPI cards. Adapts captions for single-day vs multi-day ranges. */
export function UtilisationKpiCards({ summary }: Props): JSX.Element {
    const acrossCaption = summary.isSingleDay ? "Selected day" : "Across selected dates";

    return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
                icon={<LayoutGrid size={18} />}
                label="Total Slots"
                value={summary.totalSlots.toLocaleString()}
                caption={acrossCaption}
                tone="default"
            />
            <KpiCard
                icon={<CalendarCheck size={18} />}
                label="Booked Slots"
                value={summary.bookedSlots.toLocaleString()}
                caption={acrossCaption}
                tone="booked"
            />
            <KpiCard
                icon={<PieChart size={18} />}
                label={summary.isSingleDay ? "Utilisation" : "Average Utilisation"}
                value={summary.totalSlots > 0 ? `${summary.avgUtilisationPct.toFixed(1)}%` : "—"}
                caption="Booked / Total"
                tone="utilisation"
            />
            <KpiCard
                icon={<PoundSterling size={18} />}
                label="Revenue"
                value={formatCurrency(summary.revenueActual)}
                secondary={`/ ${formatCurrency(summary.revenuePotential)}`}
                caption="Actual / Potential"
                tone="revenue"
            />
        </div>
    );
}
