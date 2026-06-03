import type { JSX } from "react";
import { TrendingUp, Wallet } from "lucide-react";
import { formatCurrency } from "@repo/ui";
import type { PlayerValueSummary } from "../playerValueSummary";

type Props = {
    summary: PlayerValueSummary;
};

type KpiCardProps = {
    label: string;
    value: string;
    icon: JSX.Element;
    iconBg: string;
};

function KpiCard({ label, value, icon, iconBg }: KpiCardProps): JSX.Element {
    return (
        <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-card px-3 py-2.5 shadow-xs ring-1 ring-black/[0.02] transition-colors hover:border-border">
            <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${iconBg}`}
            >
                {icon}
            </div>
            <div className="min-w-0">
                <p className="truncate text-[11px] font-medium leading-4 text-muted-foreground">
                    {label}
                </p>
                <p className="truncate text-base font-semibold leading-5 tracking-tight text-foreground">
                    {value}
                </p>
            </div>
        </div>
    );
}

export function PlayerValueKpiCards({ summary }: Props): JSX.Element {
    return (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <KpiCard
                label="Total Bookings (All Time)"
                value={summary.totalBookings.toLocaleString()}
                iconBg="bg-info/10 text-info"
                icon={<TrendingUp size={15} />}
            />
            <KpiCard
                label="Total Lifetime Spend"
                value={formatCurrency(summary.totalLifetimeSpend)}
                iconBg="bg-warning/10 text-warning"
                icon={<Wallet size={15} />}
            />
        </div>
    );
}
