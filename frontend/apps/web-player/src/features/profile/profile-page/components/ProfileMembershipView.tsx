import type { JSX } from "react";
import { formatUTCDate, formatCurrency } from "@repo/ui";
import { BadgeCheck, Calendar, CreditCard, Star, Ticket, Users } from "lucide-react";
import type { MembershipSubscription } from "../../types";

type StatusStyle = { label: string; bg: string; text: string };

const STATUS_STYLES: Record<string, StatusStyle> = {
    active: { label: "Active", bg: "bg-success/15", text: "text-success" },
    trialing: { label: "Trial", bg: "bg-info/15", text: "text-info" },
    paused: { label: "Paused", bg: "bg-warning/15", text: "text-warning" },
    cancelled: { label: "Cancelled", bg: "bg-destructive/10", text: "text-destructive" },
    expired: { label: "Expired", bg: "bg-muted", text: "text-muted-foreground" },
};

const FALLBACK_STYLE: StatusStyle = {
    label: "Unknown",
    bg: "bg-muted",
    text: "text-muted-foreground",
};

function StatRow({ label, value }: { label: string; value: string | number | null }): JSX.Element {
    return (
        <div className="flex items-center justify-between gap-4 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-muted/35">
            <span className="text-muted-foreground">{label}</span>
            <span className="text-right font-semibold text-foreground">{value ?? "—"}</span>
        </div>
    );
}

function SectionHeader({ icon, title }: { icon: JSX.Element; title: string }): JSX.Element {
    return (
        <div className="flex items-center gap-2.5 border-b border-border/70 px-4 py-3.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cta/10 text-cta ring-1 ring-cta/15">
                {icon}
            </span>
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                {title}
            </span>
        </div>
    );
}

type Props = {
    membership: MembershipSubscription | null;
    isLoading: boolean;
    error: Error | null;
};

export function ProfileMembershipView({ membership, isLoading, error }: Props): JSX.Element {
    if (isLoading) {
        return (
            <div className="flex min-h-48 items-center justify-center rounded-2xl border border-border bg-card/70">
                <div className="flex items-center gap-3 rounded-full border border-border bg-background px-4 py-2 shadow-sm">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-cta" />
                    <span className="text-sm font-medium text-muted-foreground">
                        Loading membership…
                    </span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
                Failed to load membership details.
            </div>
        );
    }

    if (!membership) {
        return (
            <div className="flex min-h-72 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-card/60 px-6 py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cta/10 text-cta ring-8 ring-cta/5">
                    <Star size={22} />
                </div>
                <p className="text-base font-semibold text-foreground">No active membership</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                    You do not currently have a membership plan at this club.
                </p>
            </div>
        );
    }

    const { plan, status } = membership;
    const style: StatusStyle = STATUS_STYLES[status] ?? FALLBACK_STYLE;

    return (
        <div className="space-y-5">
            {/* Plan header */}
            <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-5 shadow-sm shadow-black/5">
                <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cta text-cta-foreground shadow-lg shadow-cta/20 ring-4 ring-cta/10">
                            <BadgeCheck size={22} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-xl font-semibold tracking-tight text-foreground">
                                    {plan.name}
                                </h3>
                                <span
                                    className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${style.bg} ${style.text} ring-current/15`}
                                >
                                    {style.label}
                                </span>
                            </div>
                            {plan.description && (
                                <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                                    {plan.description}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-background/80 px-4 py-3 text-left shadow-sm backdrop-blur sm:text-right">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            Current price
                        </p>
                        <p className="mt-1 text-lg font-bold text-foreground">
                            {formatCurrency(plan.price)}
                            <span className="text-sm font-semibold text-muted-foreground">
                                {" "}
                                / {plan.billing_period === "annual" ? "year" : "month"}
                            </span>
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
                {/* Billing details */}
                <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm shadow-black/5">
                    <SectionHeader icon={<CreditCard size={15} />} title="Billing" />
                    <div className="p-2">
                        <StatRow
                            label="Price"
                            value={`${formatCurrency(plan.price)} / ${plan.billing_period === "annual" ? "year" : "month"}`}
                        />
                        <StatRow
                            label="Period start"
                            value={formatUTCDate(membership.current_period_start)}
                        />
                        <StatRow
                            label="Period end"
                            value={formatUTCDate(membership.current_period_end)}
                        />
                        {membership.cancel_at_period_end && (
                            <div className="mx-3 my-2 rounded-lg border border-warning/25 bg-warning/10 px-3 py-2 text-xs font-medium text-warning">
                                Cancels at end of current period
                            </div>
                        )}
                    </div>
                </section>

                {/* Usage */}
                <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm shadow-black/5">
                    <SectionHeader icon={<Calendar size={15} />} title="Usage" />
                    <div className="p-2">
                        <StatRow
                            label="Booking credits remaining"
                            value={membership.credits_remaining}
                        />
                        {membership.guest_passes_remaining !== null && (
                            <StatRow
                                label="Guest passes remaining"
                                value={membership.guest_passes_remaining}
                            />
                        )}
                        {plan.discount_pct !== null && (
                            <StatRow label="Booking discount" value={`${plan.discount_pct}%`} />
                        )}
                        {plan.priority_booking_days !== null && (
                            <StatRow
                                label="Priority booking window"
                                value={`${plan.priority_booking_days} days`}
                            />
                        )}
                    </div>
                </section>
            </div>

            {/* Plan limits */}
            {(plan.booking_credits_per_period !== null ||
                plan.guest_passes_per_period !== null ||
                plan.max_active_members !== null) && (
                <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm shadow-black/5">
                    <SectionHeader icon={<Ticket size={15} />} title="Plan allowances" />
                    <div className="p-2">
                        {plan.booking_credits_per_period !== null && (
                            <StatRow
                                label="Credits per period"
                                value={plan.booking_credits_per_period}
                            />
                        )}
                        {plan.guest_passes_per_period !== null && (
                            <StatRow
                                label="Guest passes per period"
                                value={plan.guest_passes_per_period}
                            />
                        )}
                        {plan.max_active_members !== null && (
                            <div className="flex items-center justify-between gap-4 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-muted/35">
                                <span className="flex items-center gap-1.5 text-muted-foreground">
                                    <Users size={12} />
                                    Max members
                                </span>
                                <span className="text-right font-semibold text-foreground">
                                    {plan.max_active_members}
                                </span>
                            </div>
                        )}
                    </div>
                </section>
            )}
        </div>
    );
}
