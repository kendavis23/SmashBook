import type { JSX } from "react";
import { Breadcrumb } from "@repo/ui";
import { formatUTCDate } from "@repo/ui";
import { BadgeCheck, RefreshCw, Building2, Circle, Users, Clock } from "lucide-react";
import type { Subscription } from "../../types";
import { SUBSCRIPTION_STATUS_LABELS } from "../../types";

type Props = {
    subscription: Subscription | null;
    isLoading: boolean;
    error: Error | null;
    onRefresh: () => void;
};

function StatusBadge({ status }: { status: string | null }): JSX.Element {
    if (!status) return <span className="text-sm text-muted-foreground">—</span>;
    const label = SUBSCRIPTION_STATUS_LABELS[status] ?? status;
    const cls =
        status === "active"
            ? "bg-success/15 text-success"
            : status === "trialing"
              ? "bg-info/15 text-info"
              : status === "past_due"
                ? "bg-warning/15 text-warning"
                : "bg-destructive/15 text-destructive";
    return (
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${cls}`}>{label}</span>
    );
}

function FeatureFlag({ enabled, label }: { enabled: boolean; label: string }): JSX.Element {
    return (
        <div className="flex items-center gap-2">
            <span
                className={`h-2 w-2 rounded-full ${enabled ? "bg-success" : "bg-muted-foreground/30"}`}
            />
            <span className={`text-sm ${enabled ? "text-foreground" : "text-muted-foreground"}`}>
                {label}
            </span>
        </div>
    );
}

function LimitRow({
    icon,
    label,
    used,
    max,
}: {
    icon: JSX.Element;
    label: string;
    used: number;
    max: number;
}): JSX.Element {
    const pct = max === -1 ? 0 : Math.min(100, Math.round((used / max) * 100));
    const isNearLimit = max !== -1 && pct >= 80;
    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-foreground">
                    {icon}
                    {label}
                </div>
                <span className="text-xs text-muted-foreground">
                    {used} / {max === -1 ? "∞" : max}
                </span>
            </div>
            {max !== -1 ? (
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                        className={`h-full rounded-full transition-all ${isNearLimit ? "bg-warning" : "bg-cta"}`}
                        style={{ width: `${pct}%` }}
                    />
                </div>
            ) : null}
        </div>
    );
}

export default function MySubscriptionView({
    subscription,
    isLoading,
    error,
    onRefresh,
}: Props): JSX.Element {
    return (
        <div className="w-full space-y-5">
            <Breadcrumb items={[{ label: "My Plan" }]} />

            <section className="card-surface overflow-hidden">
                <header className="flex flex-col gap-3 border-b border-border bg-muted/10 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground shadow-xs">
                                <BadgeCheck size={16} />
                            </div>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-lg font-semibold tracking-tight text-foreground">
                                        My Plan
                                    </h1>
                                    {subscription ? (
                                        <StatusBadge status={subscription.subscription_status} />
                                    ) : null}
                                </div>
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                    Your organisation&apos;s SmashBook subscription and usage.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <button
                            onClick={onRefresh}
                            className="btn-outline min-h-10 px-4"
                            aria-label="Refresh subscription"
                        >
                            <RefreshCw size={14} /> Refresh
                        </button>
                    </div>
                </header>

                <div className="px-5 py-5 sm:px-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center gap-3 py-20">
                            <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-cta" />
                            <span className="text-sm text-muted-foreground">
                                Loading subscription…
                            </span>
                        </div>
                    ) : error ? (
                        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                            {error.message}
                        </div>
                    ) : !subscription ? null : (
                        <div className="space-y-6">
                            {/* Plan summary */}
                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                {/* Plan name + price */}
                                <div className="rounded-xl border border-border bg-background p-5 shadow-xs">
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                        Plan
                                    </p>
                                    <p className="mt-1 text-lg font-bold text-foreground">
                                        {subscription.plan_name}
                                    </p>
                                    <p className="mt-0.5 text-sm text-muted-foreground">
                                        £{Number(subscription.price_per_month).toFixed(2)} / month
                                    </p>
                                </div>

                                {/* Period end */}
                                <div className="rounded-xl border border-border bg-background p-5 shadow-xs">
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                        Current Period Ends
                                    </p>
                                    <div className="mt-1 flex items-center gap-2">
                                        <Clock size={14} className="text-muted-foreground" />
                                        <p className="text-lg font-bold text-foreground">
                                            {subscription.current_period_end
                                                ? formatUTCDate(subscription.current_period_end)
                                                : "—"}
                                        </p>
                                    </div>
                                    {subscription.subscription_start_date ? (
                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                            Since{" "}
                                            {formatUTCDate(subscription.subscription_start_date)}
                                        </p>
                                    ) : null}
                                </div>

                                {/* Payment method */}
                                <div className="rounded-xl border border-border bg-background p-5 shadow-xs">
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                        Payment Method
                                    </p>
                                    <p
                                        className={`mt-1 text-lg font-bold ${subscription.has_payment_method ? "text-success" : "text-warning"}`}
                                    >
                                        {subscription.has_payment_method ? "On file" : "Not set up"}
                                    </p>
                                </div>
                            </div>

                            {/* Usage */}
                            <div className="rounded-xl border border-border bg-background p-5 shadow-xs">
                                <h2 className="mb-4 text-sm font-semibold text-foreground">
                                    Usage
                                </h2>
                                <div className="space-y-4">
                                    <LimitRow
                                        icon={
                                            <Building2
                                                size={14}
                                                className="text-muted-foreground"
                                            />
                                        }
                                        label="Clubs"
                                        used={subscription.usage.clubs_used}
                                        max={subscription.limits.max_clubs}
                                    />
                                    <LimitRow
                                        icon={
                                            <Circle size={14} className="text-muted-foreground" />
                                        }
                                        label="Courts"
                                        used={subscription.usage.courts_used}
                                        max={subscription.limits.max_courts_per_club}
                                    />
                                    <LimitRow
                                        icon={<Users size={14} className="text-muted-foreground" />}
                                        label="Staff users"
                                        used={subscription.usage.staff_used}
                                        max={subscription.limits.max_staff_users}
                                    />
                                </div>
                            </div>

                            {/* Features */}
                            <div className="rounded-xl border border-border bg-background p-5 shadow-xs">
                                <h2 className="mb-4 text-sm font-semibold text-foreground">
                                    Features
                                </h2>
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                    <FeatureFlag
                                        enabled={subscription.features.open_games}
                                        label="Open Games"
                                    />
                                    <FeatureFlag
                                        enabled={subscription.features.waitlist}
                                        label="Waitlist"
                                    />
                                    <FeatureFlag
                                        enabled={subscription.features.white_label}
                                        label="White Label"
                                    />
                                    <FeatureFlag
                                        enabled={subscription.features.analytics}
                                        label="Analytics"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}

export { StatusBadge, FeatureFlag, LimitRow };
