import { useState, type JSX } from "react";
import { formatUTCDate, formatCurrency } from "@repo/ui";
import { BadgeCheck, CreditCard, Ticket, Users, ArrowDown, CalendarX } from "lucide-react";
import type { MembershipPlan } from "@repo/player-domain/models";
import type { MembershipSubscription } from "../../types";
import { STATUS_STYLES, FALLBACK_STYLE } from "./membershipConstants";
import { StatRow, SectionHeader } from "./MembershipPrimitives";

type Props = {
    membership: MembershipSubscription;
    allPlans: MembershipPlan[];
    onCancel: () => void;
    isCancelling: boolean;
    cancelError: string | null;
    onCancelPendingDowngrade: () => void;
    isCancellingPendingDowngrade: boolean;
    cancelPendingDowngradeError: string | null;
};

export function CurrentMembershipCard({
    membership,
    allPlans,
    onCancel,
    isCancelling,
    cancelError,
    onCancelPendingDowngrade,
    isCancellingPendingDowngrade,
    cancelPendingDowngradeError,
}: Props): JSX.Element {
    const [showConfirm, setShowConfirm] = useState(false);
    const { plan, status } = membership;
    const pendingPlan = membership.pending_plan_id
        ? (allPlans.find((p) => p.id === membership.pending_plan_id) ?? null)
        : null;
    const style = STATUS_STYLES[status] ?? FALLBACK_STYLE;
    const billingPeriod = plan.billing_period === "annual" ? "year" : "month";

    return (
        <div className="space-y-4">
            {membership.pending_plan_id && (
                <PendingDowngradeSection
                    currentPlanName={plan.name}
                    pendingPlanName={pendingPlan?.name ?? null}
                    periodEnd={membership.current_period_end}
                    onCancelDowngrade={onCancelPendingDowngrade}
                    isCancelling={isCancellingPendingDowngrade}
                    error={cancelPendingDowngradeError}
                />
            )}

            {membership.cancel_at_period_end && !membership.pending_plan_id && (
                <CancellationNotice
                    planName={plan.name}
                    periodEnd={membership.current_period_end}
                />
            )}

            <section className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                            <BadgeCheck size={18} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h3 className="truncate text-lg font-semibold tracking-tight text-foreground">
                                    {plan.name}
                                </h3>
                                <span
                                    className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${style.bg} ${style.text}`}
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
                    <div className="shrink-0 sm:text-right">
                        <p className="text-lg font-bold tracking-tight text-foreground">
                            {formatCurrency(plan.price)}
                            <span className="text-sm font-medium text-muted-foreground">
                                {" "}
                                / {billingPeriod}
                            </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Renews {formatUTCDate(membership.current_period_end)}
                        </p>
                    </div>
                </div>
            </section>

            <div className="grid gap-4 lg:grid-cols-2">
                <section className="overflow-hidden rounded-xl border border-border bg-card">
                    <SectionHeader icon={<CreditCard size={15} />} title="Billing" />
                    <div className="p-2">
                        <StatRow
                            label="Price"
                            value={`${formatCurrency(plan.price)} / ${billingPeriod}`}
                        />
                        <StatRow
                            label="Period start"
                            value={formatUTCDate(membership.current_period_start)}
                        />
                        <StatRow
                            label="Period end"
                            value={formatUTCDate(membership.current_period_end)}
                        />
                    </div>
                </section>

                <section className="overflow-hidden rounded-xl border border-border bg-card">
                    <SectionHeader icon={<Ticket size={15} />} title="Usage" />
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

            {((plan.booking_credits_per_period ?? 0) > 0 ||
                (plan.guest_passes_per_period ?? 0) > 0 ||
                (plan.max_active_members ?? 0) > 0) && (
                <section className="overflow-hidden rounded-xl border border-border bg-card">
                    <SectionHeader icon={<Ticket size={15} />} title="Plan allowances" />
                    <div className="p-2">
                        {(plan.booking_credits_per_period ?? 0) > 0 && (
                            <StatRow
                                label="Credits per period"
                                value={plan.booking_credits_per_period}
                            />
                        )}
                        {(plan.guest_passes_per_period ?? 0) > 0 && (
                            <StatRow
                                label="Guest passes per period"
                                value={plan.guest_passes_per_period}
                            />
                        )}
                        {(plan.max_active_members ?? 0) > 0 && (
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

            {(status === "active" || status === "trialing") && !membership.cancel_at_period_end && (
                <CancelSection
                    periodEnd={membership.current_period_end}
                    isCancelling={isCancelling}
                    cancelError={cancelError}
                    showConfirm={showConfirm}
                    onShowConfirm={() => setShowConfirm(true)}
                    onHideConfirm={() => setShowConfirm(false)}
                    onCancel={onCancel}
                />
            )}
        </div>
    );
}

function PendingDowngradeSection({
    currentPlanName,
    pendingPlanName,
    periodEnd,
    onCancelDowngrade,
    isCancelling,
    error,
}: {
    currentPlanName: string;
    pendingPlanName: string | null;
    periodEnd: string;
    onCancelDowngrade: () => void;
    isCancelling: boolean;
    error: string | null;
}): JSX.Element {
    return (
        <div className="overflow-hidden rounded-xl border border-destructive/25 bg-destructive/5">
            <div className="flex items-start gap-3 border-b border-destructive/15 px-4 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                    <ArrowDown size={15} />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-destructive">Downgrade scheduled</p>
                    <p className="mt-0.5 text-xs leading-5 text-destructive/70">
                        {pendingPlanName ? (
                            <>
                                Switching from{" "}
                                <span className="font-semibold text-destructive/90">
                                    {currentPlanName}
                                </span>{" "}
                                →{" "}
                                <span className="font-semibold text-destructive/90">
                                    {pendingPlanName}
                                </span>{" "}
                                on{" "}
                                <span className="font-semibold text-destructive/90">
                                    {formatUTCDate(periodEnd)}
                                </span>
                                .
                            </>
                        ) : (
                            <>
                                Your plan downgrades on{" "}
                                <span className="font-semibold text-destructive/90">
                                    {formatUTCDate(periodEnd)}
                                </span>
                                .
                            </>
                        )}{" "}
                        You keep all current benefits until then.
                    </p>
                </div>
            </div>
            <div className="px-4 py-3 space-y-2">
                {error && (
                    <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                        {error}
                    </div>
                )}
                <button
                    type="button"
                    onClick={onCancelDowngrade}
                    disabled={isCancelling}
                    className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-destructive px-4 text-sm font-semibold text-destructive-foreground transition hover:bg-destructive/90 disabled:opacity-50"
                >
                    {isCancelling ? (
                        <>
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-destructive-foreground/40 border-t-destructive-foreground" />
                            Reverting…
                        </>
                    ) : (
                        <>
                            <ArrowDown size={14} className="rotate-180" />
                            Cancel downgrade — stay on {currentPlanName}
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

function CancellationNotice({
    planName,
    periodEnd,
}: {
    planName: string;
    periodEnd: string;
}): JSX.Element {
    return (
        <div className="overflow-hidden rounded-xl border-2 border-warning/50 bg-warning/10">
            <div className="flex items-center gap-3 border-b border-warning/25 bg-warning/15 px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-warning/25 text-warning">
                    <CalendarX size={17} />
                </div>
                <p className="text-sm font-bold text-warning">Membership ending soon</p>
            </div>
            <div className="px-4 py-3.5">
                <p className="text-sm leading-6 text-warning/90">
                    Your <span className="font-bold text-warning">{planName}</span> membership will
                    not renew after{" "}
                    <span className="font-bold text-warning">{formatUTCDate(periodEnd)}</span>. You
                    keep full access until then.
                </p>
            </div>
        </div>
    );
}

function CancelSection({
    periodEnd,
    isCancelling,
    cancelError,
    showConfirm,
    onShowConfirm,
    onHideConfirm,
    onCancel,
}: {
    periodEnd: string;
    isCancelling: boolean;
    cancelError: string | null;
    showConfirm: boolean;
    onShowConfirm: () => void;
    onHideConfirm: () => void;
    onCancel: () => void;
}): JSX.Element {
    return (
        <div className="pt-1">
            {cancelError && (
                <div className="mb-3 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
                    {cancelError}
                </div>
            )}
            {showConfirm ? (
                <div className="rounded-2xl border border-destructive/25 bg-destructive/5 p-4 space-y-3">
                    <p className="text-sm font-medium text-foreground">Cancel membership?</p>
                    <p className="text-xs text-muted-foreground">
                        You&apos;ll keep full access until{" "}
                        <span className="font-semibold text-foreground">
                            {formatUTCDate(periodEnd)}
                        </span>
                        . After that, your membership will not renew.
                    </p>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onHideConfirm}
                            disabled={isCancelling}
                            className="btn-outline flex-1 min-h-10 text-sm font-medium"
                        >
                            Keep membership
                        </button>
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={isCancelling}
                            className="flex-1 min-h-10 rounded-xl border border-destructive/30 bg-destructive/10 text-sm font-semibold text-destructive transition hover:bg-destructive/15 disabled:opacity-50"
                        >
                            {isCancelling ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-destructive/40 border-t-destructive" />
                                    Cancelling…
                                </span>
                            ) : (
                                "Yes, cancel"
                            )}
                        </button>
                    </div>
                </div>
            ) : (
                <p className="text-center text-xs text-muted-foreground">
                    Want to leave?{" "}
                    <button
                        type="button"
                        onClick={onShowConfirm}
                        className="text-muted-foreground underline underline-offset-2 transition hover:text-destructive"
                    >
                        Cancel membership
                    </button>
                </p>
            )}
        </div>
    );
}
