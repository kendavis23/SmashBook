import type { JSX } from "react";
import { TrendingUp, ArrowDownLeft, Wallet, Users, DollarSign } from "lucide-react";
import { formatCurrency } from "@repo/ui";
import type { RevenueSummaryStats } from "../revenueSummary";

type Props = {
    stats: RevenueSummaryStats;
};

type KpiCardProps = {
    label: string;
    value: string;
    icon: JSX.Element;
    iconBg: string;
};

function KpiCard({ label, value, icon, iconBg }: KpiCardProps): JSX.Element {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3.5 shadow-sm ring-1 ring-black/[0.02] transition-colors hover:border-border">
            <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBg}`}
            >
                {icon}
            </div>
            <div className="min-w-0">
                <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
                <p className="truncate text-lg font-bold leading-tight tracking-tight text-foreground">
                    {value}
                </p>
            </div>
        </div>
    );
}

export function RevenueKpiCards({ stats }: Props): JSX.Element {
    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <KpiCard
                label="Gross Revenue"
                value={formatCurrency(stats.grossAmount)}
                iconBg="bg-cta/10 text-cta"
                icon={<TrendingUp size={16} />}
            />
            <KpiCard
                label="Refunds"
                value={formatCurrency(stats.refundAmount)}
                iconBg="bg-destructive/10 text-destructive"
                icon={<ArrowDownLeft size={16} />}
            />
            <KpiCard
                label="Net Revenue"
                value={formatCurrency(stats.netAmount)}
                iconBg="bg-success/10 text-success"
                icon={<Wallet size={16} />}
            />
            <KpiCard
                label="Transactions"
                value={stats.transactionCount.toLocaleString()}
                iconBg="bg-info/10 text-info"
                icon={<Users size={16} />}
            />
            <KpiCard
                label="Avg. Per Transaction"
                value={formatCurrency(stats.avgTransactionValue)}
                iconBg="bg-warning/10 text-warning"
                icon={<DollarSign size={16} />}
            />
        </div>
    );
}
