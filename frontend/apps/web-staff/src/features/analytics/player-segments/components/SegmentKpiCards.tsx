import type { JSX } from "react";
import { Users, Wallet, TrendingUp, RotateCcw, CalendarCheck } from "lucide-react";
import { formatCurrency } from "@repo/ui";
import type { SegmentSummary } from "../playerSegmentsSummary";

type Props = {
    summary: SegmentSummary;
};

type KpiCardProps = {
    label: string;
    value: string;
    caption: string;
    icon: JSX.Element;
    iconBg: string;
};

function KpiCard({ label, value, caption, icon, iconBg }: KpiCardProps): JSX.Element {
    return (
        <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-card p-4 shadow-sm ring-1 ring-black/[0.02] transition-colors hover:border-border">
            <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg}`}
            >
                {icon}
            </div>
            <div className="min-w-0">
                <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
                <p className="truncate text-lg font-bold leading-tight tracking-tight text-foreground">
                    {value}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground/80">{caption}</p>
            </div>
        </div>
    );
}

export function SegmentKpiCards({ summary }: Props): JSX.Element {
    return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <KpiCard
                label="Total Players"
                value={summary.totalPlayers.toLocaleString()}
                caption="Across all segments"
                iconBg="bg-cta/10 text-cta"
                icon={<Users size={18} />}
            />
            <KpiCard
                label="Total Lifetime Spend"
                value={formatCurrency(summary.totalLifetimeSpend)}
                caption="Net of refunds"
                iconBg="bg-warning/10 text-warning"
                icon={<Wallet size={18} />}
            />
            <KpiCard
                label="Avg Lifetime Spend"
                value={formatCurrency(summary.avgLifetimeSpendPerPlayer)}
                caption="Per player"
                iconBg="bg-info/10 text-info"
                icon={<TrendingUp size={18} />}
            />
            <KpiCard
                label="Total Lifetime Refunds"
                value={formatCurrency(summary.totalLifetimeRefunds)}
                caption="Across all segments"
                iconBg="bg-destructive/10 text-destructive"
                icon={<RotateCcw size={18} />}
            />
            <KpiCard
                label="Total Bookings Played"
                value={summary.totalBookingsPlayed.toLocaleString()}
                caption="Across all segments"
                iconBg="bg-secondary text-secondary-foreground"
                icon={<CalendarCheck size={18} />}
            />
        </div>
    );
}
