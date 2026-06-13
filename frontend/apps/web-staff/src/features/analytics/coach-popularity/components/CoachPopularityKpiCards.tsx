import type { JSX } from "react";
import { CalendarCheck, Repeat, UserCheck, Users, Wallet } from "lucide-react";
import { formatCurrency } from "@repo/ui";
import type { CoachPopularitySummary } from "../coachPopularitySummary";

type Props = {
    summary: CoachPopularitySummary;
};

type KpiCardProps = {
    label: string;
    value: string;
    icon: JSX.Element;
    iconBg: string;
    subtext?: string;
};

function KpiCard({ label, value, icon, iconBg, subtext }: KpiCardProps): JSX.Element {
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
                {subtext !== undefined && (
                    <p className="truncate text-[10px] leading-3 text-muted-foreground/70">
                        {subtext}
                    </p>
                )}
            </div>
        </div>
    );
}

export function CoachPopularityKpiCards({ summary }: Props): JSX.Element {
    const inactiveCount = summary.coachCount - summary.activeCoachCount;
    const coachSubtext =
        summary.coachCount > 0
            ? `Active: ${summary.activeCoachCount}${inactiveCount > 0 ? ` (−${inactiveCount})` : ""}`
            : undefined;

    return (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 min-[1100px]:grid-cols-5">
            <KpiCard
                label="Total Coaches"
                value={summary.coachCount.toLocaleString()}
                subtext={coachSubtext}
                iconBg="bg-purple-500/10 text-purple-500"
                icon={<UserCheck size={15} />}
            />
            <KpiCard
                label="Total Sessions"
                value={summary.totalSessions.toLocaleString()}
                iconBg="bg-info/10 text-info"
                icon={<CalendarCheck size={15} />}
            />
            <KpiCard
                label="Distinct Players"
                value={summary.totalDistinctPlayers.toLocaleString()}
                iconBg="bg-cta/10 text-cta"
                icon={<Users size={15} />}
            />
            <KpiCard
                label="Return Rate"
                value={`${summary.avgReturnRatePct.toFixed(1)}%`}
                iconBg="bg-success/10 text-success"
                icon={<Repeat size={15} />}
            />
            <KpiCard
                label="Lesson Revenue"
                value={formatCurrency(summary.totalLessonRevenue)}
                iconBg="bg-warning/10 text-warning"
                icon={<Wallet size={15} />}
            />
        </div>
    );
}
