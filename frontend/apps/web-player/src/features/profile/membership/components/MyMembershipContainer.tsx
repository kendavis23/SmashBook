import { useCallback, useState, type JSX } from "react";
import { useNavigate } from "@tanstack/react-router";
import { loadStripe } from "@stripe/stripe-js";
import { config } from "@repo/config";
import { formatCurrency } from "@repo/ui";
import { BadgeCheck, Star, Zap, ArrowUp } from "lucide-react";
import type { MembershipPlan } from "@repo/player-domain/models";
import {
    useMyMembership,
    useListMembershipPlans,
    useCancelMyMembership,
    useSubscribeToMembership,
    useCancelPendingDowngrade,
} from "@repo/player-domain/hooks";
import { useAuth } from "../../store";
import { CurrentMembershipCard } from "./CurrentMembershipCard";
import { SelectCardStep } from "./SelectCardStep";

const stripePromise = loadStripe(config.stripePublishableKey);

type FlowStep =
    | { id: "current" }
    | { id: "select_card"; plan: MembershipPlan }
    | { id: "success"; plan: MembershipPlan };

export default function MyMembershipContainer(): JSX.Element {
    const { clubId } = useAuth();
    const navigate = useNavigate();

    const { data: membership, isLoading, error } = useMyMembership(clubId ?? "", { enabled: true });
    const { data: allPlans } = useListMembershipPlans(clubId ?? "");

    const [step, setStep] = useState<FlowStep>({ id: "current" });
    const [subscribeError, setSubscribeError] = useState<string | null>(null);
    const [isConfirming, setIsConfirming] = useState(false);
    const [cancelError, setCancelError] = useState<string | null>(null);
    const [cancelPendingDowngradeError, setCancelPendingDowngradeError] = useState<string | null>(
        null
    );

    const cancelMutation = useCancelMyMembership(clubId ?? "");
    const subscribeMutation = useSubscribeToMembership(clubId ?? "");
    const cancelPendingDowngradeMutation = useCancelPendingDowngrade(clubId ?? "");
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

    const handleCancelPendingDowngrade = useCallback(async () => {
        setCancelPendingDowngradeError(null);
        try {
            await cancelPendingDowngradeMutation.mutateAsync();
        } catch (err) {
            setCancelPendingDowngradeError(
                (err as { message?: string })?.message ?? "Failed to revert — please try again."
            );
        }
    }, [cancelPendingDowngradeMutation]);

    const handleBrowsePlans = useCallback(() => {
        void navigate({ to: "/profile/memberships/plans" });
    }, [navigate]);

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
            <div className="w-full space-y-5">
                <section className="card-surface overflow-hidden">
                    <div className="flex min-h-48 items-center justify-center rounded-2xl border border-border bg-card/70">
                        <div className="flex items-center gap-3 rounded-full border border-border bg-background px-4 py-2 shadow-sm">
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-cta" />
                            <span className="text-sm font-medium text-muted-foreground">
                                Loading membership…
                            </span>
                        </div>
                    </div>
                </section>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full space-y-5">
                <section className="card-surface overflow-hidden">
                    <div className="px-5 py-6 sm:px-6">
                        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
                            Failed to load membership details.
                        </div>
                    </div>
                </section>
            </div>
        );
    }

    if (step.id === "success") {
        return (
            <div className="w-full space-y-5">
                <section className="card-surface overflow-hidden">
                    <div className="px-5 py-6 sm:px-6">
                        <div className="flex flex-col items-center gap-5 rounded-xl border border-border bg-card px-6 py-10 text-center">
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-foreground">
                                <BadgeCheck size={28} />
                            </div>
                            <div>
                                <p className="text-lg font-bold text-foreground">
                                    You&apos;re now a member!
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Successfully subscribed to{" "}
                                    <span className="font-semibold text-foreground">
                                        {step.plan.name}
                                    </span>
                                    .
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setStep({ id: "current" })}
                                className="btn-cta min-h-11 px-6 text-sm font-semibold"
                            >
                                View my membership
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        );
    }

    if (isConfirming) {
        return (
            <div className="w-full space-y-5">
                <section className="card-surface overflow-hidden">
                    <div className="px-5 py-6 sm:px-6">
                        <div className="flex min-h-64 flex-col items-center justify-center gap-5 rounded-2xl border border-border bg-card/70 px-6 py-10 text-center">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-cta/20 bg-cta/5">
                                <span className="h-7 w-7 animate-spin rounded-full border-4 border-border border-t-cta" />
                            </div>
                            <div>
                                <p className="text-base font-semibold text-foreground">
                                    Confirming subscription…
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Authorizing your payment securely
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        );
    }

    if (step.id === "select_card") {
        return (
            <div className="w-full space-y-5">
                <section className="card-surface overflow-hidden">
                    <div className="px-5 py-6 sm:px-6">
                        <SelectCardStep
                            plan={step.plan}
                            onBack={() => setStep({ id: "current" })}
                            onConfirm={(paymentMethodId) =>
                                void handleSubscribe(step.plan, paymentMethodId)
                            }
                            isLoading={subscribeMutation.isPending || isConfirming}
                            error={subscribeError}
                        />
                    </div>
                </section>
            </div>
        );
    }

    return (
        <div className="w-full space-y-5">
            <section className="card-surface overflow-hidden">
                <header className="border-b border-border bg-muted/10 px-5 py-4 sm:px-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground shadow-xs">
                            <BadgeCheck size={16} />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold tracking-tight text-foreground">
                                My Membership
                            </h1>
                            <p className="mt-0.5 text-sm text-muted-foreground">
                                Your current membership status and benefits
                            </p>
                        </div>
                    </div>
                </header>
                <div className="px-5 py-6 sm:px-6">
                    {membership ? (
                        <>
                            <CurrentMembershipCard
                                membership={membership}
                                allPlans={allPlans ?? []}
                                onCancel={() => void handleCancel()}
                                isCancelling={cancelMutation.isPending}
                                cancelError={cancelError}
                                onCancelPendingDowngrade={() => void handleCancelPendingDowngrade()}
                                isCancellingPendingDowngrade={
                                    cancelPendingDowngradeMutation.isPending
                                }
                                cancelPendingDowngradeError={cancelPendingDowngradeError}
                            />
                            {(membership.status === "active" || membership.status === "trialing") &&
                                !membership.cancel_at_period_end &&
                                !membership.pending_plan_id &&
                                (allPlans ?? []).some((p) => p.price > membership.plan.price) && (
                                    <UpgradeCTABanner
                                        currentPlanName={membership.plan.name}
                                        nextPlan={
                                            (allPlans ?? [])
                                                .filter((p) => p.price > membership.plan.price)
                                                .sort((a, b) => a.price - b.price)[0] ?? null
                                        }
                                        onBrowsePlans={handleBrowsePlans}
                                    />
                                )}
                        </>
                    ) : (
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
                                            Join a plan for booking credits, guest passes, and
                                            member pricing.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleBrowsePlans}
                                    className="btn-cta min-h-10 w-full justify-center px-4 text-sm font-semibold sm:w-auto"
                                >
                                    <Zap size={15} />
                                    View membership plans
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}

function UpgradeCTABanner({
    currentPlanName,
    nextPlan,
    onBrowsePlans,
}: {
    currentPlanName: string;
    nextPlan: MembershipPlan | null;
    onBrowsePlans: () => void;
}): JSX.Element {
    return (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-cta/20 bg-cta/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cta/10 text-cta">
                    <ArrowUp size={15} />
                </div>
                <div>
                    <p className="text-sm font-semibold text-foreground">
                        Upgrade from {currentPlanName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {nextPlan
                            ? `Get more credits, passes, and perks — from ${formatCurrency(nextPlan.price)} / ${nextPlan.billing_period === "annual" ? "year" : "month"}`
                            : "Get more credits, passes, and perks with a higher plan."}
                    </p>
                </div>
            </div>
            <button
                type="button"
                onClick={onBrowsePlans}
                className="btn-cta min-h-9 shrink-0 px-4 text-xs font-semibold sm:self-center"
            >
                <Zap size={13} />
                See upgrade options
            </button>
        </div>
    );
}
