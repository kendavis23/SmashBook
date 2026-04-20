import type { MembershipPlan } from "../../types";
import { BILLING_PERIOD_LABELS } from "../../types";
import { Breadcrumb } from "@repo/ui";
import { CreditCard, Pencil, Plus, RefreshCw, Tag, Users, Zap } from "lucide-react";
import type { JSX } from "react";

type Props = {
    plans: MembershipPlan[];
    isLoading: boolean;
    error: Error | null;
    canManagePlans: boolean;
    onCreateClick: () => void;
    onEditPlan: (plan: MembershipPlan) => void;
    onRefresh: () => void;
};

export default function MembershipPlansView({
    plans,
    isLoading,
    error,
    canManagePlans,
    onCreateClick,
    onEditPlan,
    onRefresh,
}: Props): JSX.Element {
    const activePlans = plans.filter((p) => p.is_active).length;

    return (
        <div className="w-full space-y-5">
            <Breadcrumb items={[{ label: "Membership Plans" }]} />

            <section className="card-surface overflow-hidden">
                <header className="flex flex-col gap-3 border-b border-border bg-muted/10 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground shadow-xs">
                                <CreditCard size={16} />
                            </div>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-lg font-semibold tracking-tight text-foreground">
                                        Membership Plans
                                    </h1>
                                    {plans.length > 0 ? (
                                        <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground shadow-xs">
                                            {plans.length} total
                                        </span>
                                    ) : null}
                                </div>
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                    {activePlans > 0
                                        ? `${activePlans} active · manage your club's membership plans`
                                        : "Define membership plans for your club members"}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <button
                            onClick={onRefresh}
                            className="btn-outline min-h-10 px-4"
                            aria-label="Refresh membership plans"
                        >
                            <RefreshCw size={14} /> Refresh
                        </button>
                        {canManagePlans ? (
                            <button onClick={onCreateClick} className="btn-cta min-h-10 px-4">
                                <Plus size={14} /> Add Plan
                            </button>
                        ) : null}
                    </div>
                </header>

                <div className="px-5 py-5 sm:px-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center gap-3 py-20">
                            <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-cta" />
                            <span className="text-sm text-muted-foreground">
                                Loading membership plans…
                            </span>
                        </div>
                    ) : error ? (
                        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                            {error.message}
                        </div>
                    ) : plans.length === 0 ? (
                        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                                <CreditCard size={24} className="text-muted-foreground/40" />
                            </div>
                            <h3 className="text-sm font-semibold text-foreground">
                                No membership plans yet
                            </h3>
                            <p className="mt-1.5 max-w-xs text-xs text-muted-foreground">
                                Create your first membership plan to offer recurring access to your
                                club.
                            </p>
                            {canManagePlans ? (
                                <button onClick={onCreateClick} className="btn-cta mt-5">
                                    <Plus size={14} /> Add Plan
                                </button>
                            ) : null}
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {plans.map((plan) => (
                                <article
                                    key={plan.id}
                                    className="flex flex-col rounded-xl border border-border bg-background shadow-xs overflow-hidden"
                                >
                                    {/* Card top accent */}
                                    <div
                                        className={`h-1 w-full ${plan.is_active ? "bg-cta" : "bg-muted"}`}
                                    />

                                    <div className="flex flex-col gap-4 p-5">
                                        {/* Header row */}
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="text-sm font-semibold text-foreground">
                                                        {plan.name}
                                                    </h3>
                                                    <span
                                                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                                            plan.is_active
                                                                ? "bg-success/15 text-success"
                                                                : "bg-muted text-muted-foreground"
                                                        }`}
                                                    >
                                                        {plan.is_active ? "Active" : "Inactive"}
                                                    </span>
                                                </div>
                                                {plan.description ? (
                                                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                                                        {plan.description}
                                                    </p>
                                                ) : null}
                                            </div>
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                                                <CreditCard
                                                    size={16}
                                                    className="text-muted-foreground"
                                                />
                                            </div>
                                        </div>

                                        {/* Price */}
                                        <div className="flex items-end gap-1">
                                            <span className="text-2xl font-bold tracking-tight text-foreground">
                                                £{Number(plan.price).toFixed(2)}
                                            </span>
                                            <span className="mb-0.5 text-xs text-muted-foreground">
                                                /{" "}
                                                {(
                                                    BILLING_PERIOD_LABELS[plan.billing_period] ??
                                                    plan.billing_period
                                                ).toLowerCase()}
                                            </span>
                                        </div>

                                        {/* Badges */}
                                        {plan.trial_days > 0 || plan.discount_pct != null ? (
                                            <div className="flex flex-wrap gap-1.5">
                                                {plan.trial_days > 0 ? (
                                                    <span className="inline-flex items-center gap-1 rounded-md bg-info/15 px-2 py-0.5 text-[11px] font-medium text-info">
                                                        <Zap size={10} />
                                                        {plan.trial_days}d free trial
                                                    </span>
                                                ) : null}
                                                {plan.discount_pct != null ? (
                                                    <span className="inline-flex items-center gap-1 rounded-md bg-warning/15 px-2 py-0.5 text-[11px] font-medium text-warning">
                                                        <Tag size={10} />
                                                        {plan.discount_pct}% off
                                                    </span>
                                                ) : null}
                                            </div>
                                        ) : null}

                                        {/* Stats grid */}
                                        <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-3">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                                    Credits
                                                </span>
                                                <span className="text-sm font-semibold text-foreground">
                                                    {plan.booking_credits_per_period ?? "—"}
                                                </span>
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                                    Guests
                                                </span>
                                                <span className="text-sm font-semibold text-foreground">
                                                    {plan.guest_passes_per_period ?? "—"}
                                                </span>
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                                    Priority
                                                </span>
                                                <span className="text-sm font-semibold text-foreground">
                                                    {plan.priority_booking_days != null
                                                        ? `${plan.priority_booking_days}d`
                                                        : "—"}
                                                </span>
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                                    Member cap
                                                </span>
                                                <span className="text-sm font-semibold text-foreground">
                                                    {plan.max_active_members ?? "Unlimited"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    {canManagePlans ? (
                                        <div className="flex items-center justify-between border-t border-border px-5 py-3">
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                <Users size={11} />
                                                <span>
                                                    {plan.max_active_members
                                                        ? `Up to ${plan.max_active_members} members`
                                                        : "Unlimited members"}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => onEditPlan(plan)}
                                                className="btn-outline px-3 py-1.5 text-xs"
                                                aria-label={`Edit ${plan.name}`}
                                            >
                                                <Pencil size={11} /> Edit
                                            </button>
                                        </div>
                                    ) : null}
                                </article>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
