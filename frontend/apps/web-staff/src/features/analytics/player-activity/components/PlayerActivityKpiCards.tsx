import type { JSX } from "react";
import { Activity, UserPlus } from "lucide-react";
import type { PlayerActivitySummary } from "../playerActivitySummary";

type Props = {
    summary: PlayerActivitySummary;
};

type KpiCardProps = {
    label: string;
    value: string;
    icon: JSX.Element;
    iconBg: string;
};

function KpiCard({ label, value, icon, iconBg }: KpiCardProps): JSX.Element {
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
            </div>
        </div>
    );
}

export function PlayerActivityKpiCards({ summary }: Props): JSX.Element {
    return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <KpiCard
                label={`Active Players (Last ${summary.windowDays} Days)`}
                value={summary.activePlayers.toLocaleString()}
                iconBg="bg-cta/10 text-cta"
                icon={<Activity size={18} />}
            />
            <KpiCard
                label="New Signups (Selected Range)"
                value={summary.totalSignups.toLocaleString()}
                iconBg="bg-success/10 text-success"
                icon={<UserPlus size={18} />}
            />
        </div>
    );
}
