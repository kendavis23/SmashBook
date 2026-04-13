import type { MembershipPlan } from "../../types";
import { BILLING_PERIOD_LABELS } from "../../types";
import { Breadcrumb } from "@repo/ui";
import { CreditCard, Pencil, Plus } from "lucide-react";
import type { JSX } from "react";

type Props = {
    plans: MembershipPlan[];
    isLoading: boolean;
    error: Error | null;
    canManagePlans: boolean;
    onCreateClick: () => void;
    onEditPlan: (plan: MembershipPlan) => void;
};

function formatPrice(price: number, billingPeriod: string): string {
    const label = BILLING_PERIOD_LABELS[billingPeriod] ?? billingPeriod;
    return `€${Number(price).toFixed(2)} / ${label.toLowerCase()}`;
}

export default function MembershipPlansView({
    plans,
    isLoading,
    error,
    canManagePlans,
    onCreateClick,
    onEditPlan,
}: Props): JSX.Element {
    const activePlans = plans.filter((p) => p.is_active).length;

    return (
        <div className="w-full space-y-5">
            <Breadcrumb items={[{ label: "Membership Plans" }]} />

            <section className="w-full rounded-xl border border-border bg-card px-6 py-6 shadow-sm sm:px-8">
                <header className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                        <h1 className="text-xl font-semibold text-foreground">Membership Plans</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {plans.length > 0
                                ? `${activePlans} active · ${plans.length} total`
                                : "Define membership plans for your club members"}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        {canManagePlans ? (
                            <button onClick={onCreateClick} className="btn-cta min-h-11 px-4.5">
                                <Plus size={14} /> Add Plan
                            </button>
                        ) : null}
                    </div>
                </header>

                <div className="mt-5">
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
                                    className="flex flex-col gap-4 rounded-xl border border-border bg-background p-5 shadow-xs"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="text-sm font-semibold text-foreground">
                                                    {plan.name}
                                                </h3>
                                                <span
                                                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${plan.is_active
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
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <span className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-foreground">
                                            {formatPrice(plan.price, plan.billing_period)}
                                        </span>
                                        {plan.trial_days > 0 ? (
                                            <span className="rounded-md bg-info/15 px-2 py-1 text-xs font-medium text-info">
                                                {plan.trial_days}d trial
                                            </span>
                                        ) : null}
                                        {plan.discount_pct != null ? (
                                            <span className="rounded-md bg-warning/15 px-2 py-1 text-xs font-medium text-warning">
                                                {plan.discount_pct}% off
                                            </span>
                                        ) : null}
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                                        <span>
                                            Credits:{" "}
                                            <strong className="text-foreground">
                                                {plan.booking_credits_per_period ?? "—"}
                                            </strong>
                                        </span>
                                        <span>
                                            Guests:{" "}
                                            <strong className="text-foreground">
                                                {plan.guest_passes_per_period ?? "—"}
                                            </strong>
                                        </span>
                                        <span>
                                            Priority:{" "}
                                            <strong className="text-foreground">
                                                {plan.priority_booking_days != null
                                                    ? `${plan.priority_booking_days}d`
                                                    : "—"}
                                            </strong>
                                        </span>
                                        <span>
                                            Cap:{" "}
                                            <strong className="text-foreground">
                                                {plan.max_active_members ?? "Unlimited"}
                                            </strong>
                                        </span>
                                    </div>

                                    {canManagePlans ? (
                                        <div className="flex justify-end border-t border-border pt-3">
                                            <button
                                                onClick={() => onEditPlan(plan)}
                                                className="btn-outline px-3 py-2 text-xs"
                                                aria-label={`Edit ${plan.name}`}
                                            >
                                                <Pencil size={12} /> Edit
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
