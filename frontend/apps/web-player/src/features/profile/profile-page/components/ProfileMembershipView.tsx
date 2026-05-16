import { useState, useCallback, useEffect, type JSX } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { formatUTCDate, formatCurrency } from "@repo/ui";
import { config } from "@repo/config";
import {
    useListMembershipPlans,
    useMyMembership,
    useSubscribeToMembership,
    useCancelMyMembership,
    useListPaymentMethods,
} from "@repo/player-domain/hooks";
import { useAuth } from "../../store";
import {
    ArrowLeft,
    BadgeCheck,
    Check,
    ChevronRight,
    CreditCard,
    Star,
    Ticket,
    Users,
    Zap,
} from "lucide-react";
import type { MembershipSubscription } from "../../types";
import type { MembershipPlan, PaymentMethod } from "@repo/player-domain/models";

const stripePromise = loadStripe(config.stripePublishableKey);

// ─── Flow ─────────────────────────────────────────────────────────────────────

type FlowStep =
    | { id: "current" }
    | { id: "plans" }
    | { id: "select_card"; plan: MembershipPlan }
    | { id: "success"; plan: MembershipPlan };

// ─── Status styles ────────────────────────────────────────────────────────────

type StatusStyle = { label: string; bg: string; text: string };

const STATUS_STYLES: Record<string, StatusStyle> = {
    active: { label: "Active", bg: "bg-success/10", text: "text-success" },
    trialing: { label: "Trial", bg: "bg-success/10", text: "text-success" },
    paused: { label: "Paused", bg: "bg-muted", text: "text-muted-foreground" },
    cancelled: { label: "Cancelled", bg: "bg-muted", text: "text-muted-foreground" },
    expired: { label: "Expired", bg: "bg-muted", text: "text-muted-foreground" },
};

const FALLBACK_STYLE: StatusStyle = {
    label: "Unknown",
    bg: "bg-muted",
    text: "text-muted-foreground",
};

// ─── Primitives ───────────────────────────────────────────────────────────────

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
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                {icon}
            </span>
            <span className="text-xs font-semibold text-foreground">{title}</span>
        </div>
    );
}

function RadioDot({ active }: { active: boolean }): JSX.Element {
    return (
        <div
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
                active ? "border-cta bg-cta text-cta-foreground" : "border-muted-foreground/40"
            }`}
        >
            {active ? <Check size={11} /> : null}
        </div>
    );
}

function BackButton({ label, onClick }: { label: string; onClick: () => void }): JSX.Element {
    return (
        <button
            type="button"
            onClick={onClick}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-1 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
            <ArrowLeft size={14} />
            {label}
        </button>
    );
}

// ─── Current membership ───────────────────────────────────────────────────────

function CurrentMembershipCard({
    membership,
    onBrowsePlans,
    onCancel,
    isCancelling,
    cancelError,
}: {
    membership: MembershipSubscription;
    onBrowsePlans: () => void;
    onCancel: () => void;
    isCancelling: boolean;
    cancelError: string | null;
}): JSX.Element {
    const [showConfirm, setShowConfirm] = useState(false);
    const { plan, status } = membership;
    const style = STATUS_STYLES[status] ?? FALLBACK_STYLE;
    const billingPeriod = plan.billing_period === "annual" ? "year" : "month";

    return (
        <div className="space-y-4">
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
                {/* Billing */}
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
                        {membership.cancel_at_period_end && (
                            <div className="mx-3 my-2 rounded-lg border border-warning/25 bg-warning/10 px-3 py-2 text-xs font-medium text-warning">
                                Cancels on {formatUTCDate(membership.current_period_end)} — you keep
                                full access until then
                            </div>
                        )}
                    </div>
                </section>

                {/* Usage */}
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

            {/* Plan allowances */}
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

            <button
                type="button"
                onClick={onBrowsePlans}
                className="btn-outline w-full min-h-11 text-sm font-medium"
            >
                Browse available plans
                <ChevronRight size={15} />
            </button>

            {(status === "active" || status === "trialing") && !membership.cancel_at_period_end && (
                <div className="pt-1">
                    {cancelError && (
                        <div className="mb-3 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
                            {cancelError}
                        </div>
                    )}

                    {showConfirm ? (
                        <div className="rounded-2xl border border-destructive/25 bg-destructive/5 p-4 space-y-3">
                            <p className="text-sm font-medium text-foreground">
                                Cancel membership?
                            </p>
                            <p className="text-xs text-muted-foreground">
                                You&apos;ll keep full access until{" "}
                                <span className="font-semibold text-foreground">
                                    {formatUTCDate(membership.current_period_end)}
                                </span>
                                . After that, your membership will not renew.
                            </p>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm(false)}
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
                                onClick={() => setShowConfirm(true)}
                                className="text-muted-foreground underline underline-offset-2 transition hover:text-destructive"
                            >
                                Cancel membership
                            </button>
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── No membership empty state ────────────────────────────────────────────────

function NoMembershipState({ onBrowsePlans }: { onBrowsePlans: () => void }): JSX.Element {
    return (
        <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <Star size={18} />
                    </span>
                    <div>
                        <p className="text-base font-semibold text-foreground">
                            No active membership
                        </p>
                        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                            Join a plan for booking credits, guest passes, and member pricing.
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={onBrowsePlans}
                    className="btn-cta min-h-10 w-full justify-center px-4 text-sm font-semibold sm:w-auto"
                >
                    <Zap size={15} />
                    View membership plans
                </button>
            </div>
        </div>
    );
}

// ─── Plan card ────────────────────────────────────────────────────────────────

function PlanCard({
    plan,
    isCurrent,
    locked,
    onSelect,
}: {
    plan: MembershipPlan;
    isCurrent: boolean;
    locked: boolean;
    onSelect: () => void;
}): JSX.Element {
    const perks = [
        plan.booking_credits_per_period !== null &&
            `${plan.booking_credits_per_period} booking credits`,
        plan.guest_passes_per_period !== null && `${plan.guest_passes_per_period} guest passes`,
        plan.discount_pct !== null && `${plan.discount_pct}% booking discount`,
        plan.priority_booking_days !== null && `${plan.priority_booking_days}-day priority window`,
        plan.trial_days > 0 && `${plan.trial_days}-day free trial`,
    ].filter(Boolean) as string[];

    return (
        <div
            className={`relative flex h-full flex-col overflow-hidden rounded-xl border transition ${
                isCurrent
                    ? "border-cta bg-card"
                    : locked
                      ? "border-border bg-card opacity-60"
                      : "border-border bg-card hover:border-foreground/25"
            }`}
        >
            <div className="flex flex-1 flex-col p-4">
                <div className="mb-3 flex min-h-[4rem] items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold text-foreground">
                            {plan.name}
                        </h3>
                        {plan.description && (
                            <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                                {plan.description}
                            </p>
                        )}
                    </div>
                    {isCurrent && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-success/20 bg-success/10 px-2.5 py-1 text-[10px] font-semibold text-success">
                            <BadgeCheck size={10} />
                            Current
                        </span>
                    )}
                </div>

                <div className="mb-3">
                    <span className="text-xl font-bold tracking-tight text-foreground">
                        {formatCurrency(plan.price)}
                    </span>
                    <span className="ml-1 text-sm text-muted-foreground">
                        / {plan.billing_period === "annual" ? "year" : "month"}
                    </span>
                </div>

                {perks.length > 0 && (
                    <ul className="mb-4 flex-1 space-y-1.5">
                        {perks.map((perk) => (
                            <li
                                key={perk}
                                className="flex items-center gap-2 text-sm text-muted-foreground"
                            >
                                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                    <Check size={9} />
                                </span>
                                <span className="min-w-0 truncate">{perk}</span>
                            </li>
                        ))}
                    </ul>
                )}

                <div className="mt-auto">
                    {isCurrent ? (
                        <div className="flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-success/25 bg-success/10 text-xs font-semibold text-success">
                            <BadgeCheck size={13} />
                            Current plan
                        </div>
                    ) : !locked ? (
                        <button
                            type="button"
                            onClick={onSelect}
                            className="btn-cta min-h-10 w-full rounded-xl text-sm font-semibold transition-all"
                        >
                            Select this plan
                        </button>
                    ) : (
                        <div className="flex min-h-10 w-full items-center justify-center rounded-xl bg-muted text-xs font-semibold text-muted-foreground">
                            Plan change unavailable
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Plans step ───────────────────────────────────────────────────────────────

function PlansStep({
    clubId,
    currentPlanId,
    membershipStatus,
    onBack,
    onSelectPlan,
}: {
    clubId: string;
    currentPlanId: string | null;
    membershipStatus: string | null;
    onBack: () => void;
    onSelectPlan: (plan: MembershipPlan) => void;
}): JSX.Element {
    const { data: plans, isLoading, error } = useListMembershipPlans(clubId);
    const activePlans = plans?.filter((p) => p.is_active) ?? [];
    const locked = membershipStatus === "active" || membershipStatus === "trialing";

    return (
        <div className="space-y-4">
            <BackButton label="Back" onClick={onBack} />

            <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h2 className="text-lg font-semibold tracking-tight text-foreground">
                            Membership plans
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Compare credits, discounts, and booking access.
                        </p>
                    </div>
                    {locked && (
                        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-success/20 bg-success/10 px-3 py-1.5 text-xs font-semibold text-success">
                            <BadgeCheck size={13} />
                            You already have an active plan
                        </span>
                    )}
                </div>
            </div>

            {isLoading && (
                <div className="flex min-h-48 items-center justify-center rounded-2xl border border-border bg-card/70">
                    <div className="flex items-center gap-3 rounded-full border border-border bg-background px-4 py-2 shadow-sm">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-cta" />
                        <span className="text-sm font-medium text-muted-foreground">
                            Loading plans…
                        </span>
                    </div>
                </div>
            )}

            {error && !isLoading && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
                    Failed to load membership plans.
                </div>
            )}

            {!isLoading && !error && activePlans.length === 0 && (
                <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 px-6 py-10 text-center">
                    <p className="text-sm font-medium text-muted-foreground">
                        No membership plans available yet.
                    </p>
                </div>
            )}

            {activePlans.length > 0 && (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {activePlans.map((plan) => (
                        <PlanCard
                            key={plan.id}
                            plan={plan}
                            isCurrent={locked && plan.id === currentPlanId}
                            locked={locked && plan.id !== currentPlanId}
                            onSelect={() => onSelectPlan(plan)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Card row ─────────────────────────────────────────────────────────────────

function CardRow({
    card,
    selected,
    onSelect,
}: {
    card: PaymentMethod;
    selected: boolean;
    onSelect: () => void;
}): JSX.Element {
    return (
        <button
            type="button"
            onClick={onSelect}
            className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                selected
                    ? "border-cta bg-card"
                    : "border-transparent hover:border-border hover:bg-muted/30"
            }`}
        >
            <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {card.brand.slice(0, 4)}
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">•••• {card.last4}</p>
                <p className="text-xs text-muted-foreground">
                    Exp {card.exp_month.toString().padStart(2, "0")}/{card.exp_year}
                </p>
            </div>
            {card.is_default && (
                <span className="hidden rounded-full bg-cta/10 px-2 py-0.5 text-[10px] font-semibold text-cta sm:inline-flex">
                    Default
                </span>
            )}
            <RadioDot active={selected} />
        </button>
    );
}

// ─── Select card + confirm step ───────────────────────────────────────────────

function SelectCardStep({
    plan,
    onBack,
    onConfirm,
    isLoading,
    error,
}: {
    plan: MembershipPlan;
    onBack: () => void;
    onConfirm: (paymentMethodId: string) => void;
    isLoading: boolean;
    error: string | null;
}): JSX.Element {
    const { data: methods = [], isLoading: methodsLoading } = useListPaymentMethods();
    const defaultCard = methods.find((m) => m.is_default) ?? methods[0];
    const [selectedCardId, setSelectedCardId] = useState<string | null>(defaultCard?.id ?? null);
    const selectedCard = methods.find((m) => m.id === selectedCardId) ?? null;
    const billingPeriod = plan.billing_period === "annual" ? "year" : "month";

    useEffect(() => {
        if (!selectedCardId && defaultCard) {
            setSelectedCardId(defaultCard.id);
        }
    }, [defaultCard, selectedCardId]);

    return (
        <div className="space-y-4">
            <BackButton label="Back to plans" onClick={onBack} />

            <section className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                        <h2 className="text-lg font-semibold tracking-tight text-foreground">
                            Confirm subscription
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {plan.name}
                            {plan.description ? ` · ${plan.description}` : ""}
                        </p>
                    </div>
                    <div className="shrink-0 sm:text-right">
                        <p className="text-lg font-bold tracking-tight text-foreground">
                            {formatCurrency(plan.price)}
                            <span className="text-sm font-medium text-muted-foreground">
                                {" "}
                                / {billingPeriod}
                            </span>
                        </p>
                    </div>
                </div>

                {plan.trial_days > 0 && (
                    <div className="mt-3 rounded-lg border border-border bg-muted px-3 py-2 text-xs font-medium text-muted-foreground">
                        Includes {plan.trial_days}-day free trial. You will not be charged until it
                        ends.
                    </div>
                )}
            </section>

            {/* Card selection */}
            <section className="overflow-hidden rounded-xl border border-border bg-card">
                <SectionHeader icon={<CreditCard size={15} />} title="Payment card" />

                {methodsLoading ? (
                    <div className="flex items-center gap-3 px-4 py-5">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-cta" />
                        <span className="text-sm text-muted-foreground">Loading cards…</span>
                    </div>
                ) : methods.length === 0 ? (
                    <div className="px-4 py-5 text-sm text-muted-foreground">
                        No saved cards. Add a card in the{" "}
                        <span className="font-medium text-foreground">Billing</span> tab first.
                    </div>
                ) : (
                    <div className="divide-y divide-border/50 p-2">
                        {methods.map((card) => (
                            <CardRow
                                key={card.id}
                                card={card}
                                selected={selectedCardId === card.id}
                                onSelect={() => setSelectedCardId(card.id)}
                            />
                        ))}
                    </div>
                )}
            </section>

            {error && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
                    {error}
                </div>
            )}

            <button
                type="button"
                onClick={() => selectedCardId && onConfirm(selectedCardId)}
                disabled={!selectedCard || isLoading || methodsLoading}
                className="btn-cta w-full min-h-12 text-sm font-semibold disabled:opacity-50"
            >
                {isLoading ? (
                    <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-cta-foreground/40 border-t-cta-foreground" />
                        Confirming…
                    </>
                ) : selectedCard ? (
                    <>
                        <CreditCard size={15} />
                        Confirm with ••{selectedCard.last4}
                    </>
                ) : (
                    "Select a card to continue"
                )}
            </button>

            <p className="text-center text-[11px] text-muted-foreground">
                Secured by Stripe · 3D Secure may apply
            </p>
        </div>
    );
}

// ─── Confirming (Stripe in-flight) ────────────────────────────────────────────

function ConfirmingStep(): JSX.Element {
    return (
        <div className="flex min-h-64 flex-col items-center justify-center gap-5 rounded-2xl border border-border bg-card/70 px-6 py-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-cta/20 bg-cta/5">
                <span className="h-7 w-7 animate-spin rounded-full border-4 border-border border-t-cta" />
            </div>
            <div>
                <p className="text-base font-semibold text-foreground">Confirming subscription…</p>
                <p className="mt-1 text-sm text-muted-foreground">
                    Authorizing your payment securely
                </p>
            </div>
        </div>
    );
}

// ─── Success ──────────────────────────────────────────────────────────────────

function SuccessStep({ plan, onDone }: { plan: MembershipPlan; onDone: () => void }): JSX.Element {
    return (
        <div className="flex flex-col items-center gap-5 rounded-xl border border-border bg-card px-6 py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-foreground">
                <BadgeCheck size={28} />
            </div>
            <div>
                <p className="text-lg font-bold text-foreground">You&apos;re now a member!</p>
                <p className="mt-1 text-sm text-muted-foreground">
                    Successfully subscribed to{" "}
                    <span className="font-semibold text-foreground">{plan.name}</span>.
                </p>
            </div>
            <button
                type="button"
                onClick={onDone}
                className="btn-cta min-h-11 px-6 text-sm font-semibold"
            >
                View my membership
            </button>
        </div>
    );
}

// ─── Main export ──────────────────────────────────────────────────────────────

type Props = {
    membership: MembershipSubscription | null;
    isLoading: boolean;
    error: Error | null;
};

export function ProfileMembershipView({ membership, isLoading, error }: Props): JSX.Element {
    const { clubId } = useAuth();
    const [step, setStep] = useState<FlowStep>({ id: "current" });
    const [subscribeError, setSubscribeError] = useState<string | null>(null);
    const [isConfirming, setIsConfirming] = useState(false);
    const [cancelError, setCancelError] = useState<string | null>(null);

    const subscribeMutation = useSubscribeToMembership(clubId ?? "");
    const cancelMutation = useCancelMyMembership(clubId ?? "");
    const { refetch: refetchMembership } = useMyMembership(clubId ?? "", { enabled: false });

    const handleCancel = useCallback(async () => {
        setCancelError(null);
        try {
            await cancelMutation.mutateAsync();
        } catch (err) {
            setCancelError(
                (err as { message?: string })?.message ?? "Failed to cancel — please try again."
            );
        }
    }, [cancelMutation]);

    const handleSelectPlan = useCallback((plan: MembershipPlan) => {
        setSubscribeError(null);
        setStep({ id: "select_card", plan });
    }, []);

    const handleSubscribe = useCallback(
        async (plan: MembershipPlan, paymentMethodId: string) => {
            setSubscribeError(null);
            setIsConfirming(true);
            try {
                const result = await subscribeMutation.mutateAsync({
                    plan_id: plan.id,
                    payment_method_id: paymentMethodId,
                });

                if (result.client_secret) {
                    const stripe = await stripePromise;
                    if (!stripe) throw new Error("Stripe failed to load.");

                    const { error: stripeError } = await stripe.confirmCardPayment(
                        result.client_secret
                    );

                    if (stripeError) {
                        setSubscribeError(stripeError.message ?? "Payment confirmation failed.");
                        setIsConfirming(false);
                        return;
                    }
                }

                await refetchMembership();
                setStep({ id: "success", plan });
            } catch (err) {
                setSubscribeError(
                    (err as { message?: string })?.message ??
                        "Subscription failed — please try again."
                );
            } finally {
                setIsConfirming(false);
            }
        },
        [subscribeMutation, refetchMembership]
    );

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

    if (step.id === "success") {
        return <SuccessStep plan={step.plan} onDone={() => setStep({ id: "current" })} />;
    }

    if (isConfirming) {
        return <ConfirmingStep />;
    }

    if (step.id === "plans") {
        return (
            <PlansStep
                clubId={clubId ?? ""}
                currentPlanId={membership?.plan.id ?? null}
                membershipStatus={membership?.status ?? null}
                onBack={() => setStep({ id: "current" })}
                onSelectPlan={handleSelectPlan}
            />
        );
    }

    if (step.id === "select_card") {
        return (
            <SelectCardStep
                plan={step.plan}
                onBack={() => setStep({ id: "plans" })}
                onConfirm={(paymentMethodId) => void handleSubscribe(step.plan, paymentMethodId)}
                isLoading={subscribeMutation.isPending || isConfirming}
                error={subscribeError}
            />
        );
    }

    return membership ? (
        <CurrentMembershipCard
            membership={membership}
            onBrowsePlans={() => setStep({ id: "plans" })}
            onCancel={() => void handleCancel()}
            isCancelling={cancelMutation.isPending}
            cancelError={cancelError}
        />
    ) : (
        <NoMembershipState onBrowsePlans={() => setStep({ id: "plans" })} />
    );
}
