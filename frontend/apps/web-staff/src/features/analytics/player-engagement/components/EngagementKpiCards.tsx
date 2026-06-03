import type { JSX } from "react";
import { CalendarCheck, UserX } from "lucide-react";
import type { PlayerEngagementSummary } from "../playerEngagementSummary";

type Props = {
    summary: PlayerEngagementSummary;
    windowDays: number;
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

export function EngagementKpiCards({ summary, windowDays }: Props): JSX.Element {
    return (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <KpiCard
                label={`Played in Last ${windowDays} Days`}
                value={summary.playedRecently.toLocaleString()}
                iconBg="bg-success/10 text-success"
                icon={<CalendarCheck size={18} />}
            />
            <KpiCard
                label={`Inactive Members (${windowDays}+ Days)`}
                value={summary.inactiveMembers.toLocaleString()}
                iconBg="bg-destructive/10 text-destructive"
                icon={<UserX size={18} />}
            />
        </div>
    );
}
