import type { JSX } from "react";
import { DollarSign, ArrowDownLeft, TrendingUp, Users, Database } from "lucide-react";
import { formatCurrency } from "@repo/ui";
import type { ClubsRevenueSummary } from "../clubsRevenueSummary";

type Props = {
    summary: ClubsRevenueSummary;
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

export function ClubsRevenueKpiCards({ summary }: Props): JSX.Element {
    const caption = `Across ${summary.clubCount} ${summary.clubCount === 1 ? "Club" : "Clubs"}`;

    return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <KpiCard
                label="Total Gross Revenue"
                value={formatCurrency(summary.totalGross)}
                caption={caption}
                iconBg="bg-cta/10 text-cta"
                icon={<DollarSign size={18} />}
            />
            <KpiCard
                label="Total Refunds"
                value={formatCurrency(summary.totalRefund)}
                caption={caption}
                iconBg="bg-destructive/10 text-destructive"
                icon={<ArrowDownLeft size={18} />}
            />
            <KpiCard
                label="Total Net Revenue"
                value={formatCurrency(summary.totalNet)}
                caption={caption}
                iconBg="bg-success/10 text-success"
                icon={<TrendingUp size={18} />}
            />
            <KpiCard
                label="Total Transactions"
                value={summary.totalTransactions.toLocaleString()}
                caption={caption}
                iconBg="bg-info/10 text-info"
                icon={<Users size={18} />}
            />
            <KpiCard
                label="Avg. Revenue / Transaction"
                value={formatCurrency(summary.avgPerTransaction)}
                caption={caption}
                iconBg="bg-warning/10 text-warning"
                icon={<Database size={18} />}
            />
        </div>
    );
}
