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
};

function KpiCard({ icon, label, value, secondary, caption }: KpiCardProps): JSX.Element {
    return (
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                    {icon}
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-medium text-muted-foreground">{label}</p>
                    <p className="mt-0.5 text-2xl font-semibold tracking-tight text-foreground">
                        {value}
                        {secondary ? (
                            <span className="ml-1 text-base font-medium text-muted-foreground">
                                {secondary}
                            </span>
                        ) : null}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{caption}</p>
                </div>
            </div>
        </div>
    );
}

/** Four headline KPI cards. Adapts captions for single-day vs multi-day ranges. */
export function UtilisationKpiCards({ summary }: Props): JSX.Element {
    const acrossCaption = summary.isSingleDay ? "Selected day" : "Across selected dates";

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
                icon={<LayoutGrid size={20} />}
                label="Total Slots"
                value={summary.totalSlots.toLocaleString()}
                caption={acrossCaption}
            />
            <KpiCard
                icon={<CalendarCheck size={20} />}
                label="Booked Slots"
                value={summary.bookedSlots.toLocaleString()}
                caption={acrossCaption}
            />
            <KpiCard
                icon={<PieChart size={20} />}
                label={summary.isSingleDay ? "Utilisation" : "Average Utilisation"}
                value={summary.totalSlots > 0 ? `${summary.avgUtilisationPct.toFixed(1)}%` : "—"}
                caption="Booked / Total"
            />
            <KpiCard
                icon={<PoundSterling size={20} />}
                label="Revenue"
                value={formatCurrency(summary.revenueActual)}
                secondary={`/ ${formatCurrency(summary.revenuePotential)}`}
                caption="Actual / Potential"
            />
        </div>
    );
}
