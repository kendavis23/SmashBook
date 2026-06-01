import { useCallback, useState, type JSX } from "react";
import { useNavigate } from "@tanstack/react-router";
import { formatUTCDate } from "@repo/ui";
import { BadgeCheck, ArrowUpDown, ArrowDown } from "lucide-react";
import type { MembershipPlan } from "@repo/player-domain/models";
import {
    useMyMembership,
    useListMembershipPlans,
    useSubscribeToMembership,
    useUpgradeMyMembership,
    useDowngradeMyMembership,
    useCancelPendingDowngrade,
} from "@repo/player-domain/hooks";
import { useAuth } from "../../store";
import { PlansStep } from "./PlansStep";
import { PlanChangeModal } from "./PlanChangeModal";
import { stripePromise } from "../../../../lib/stripe";

export type PlanIntent = "subscribe" | "upgrade" | "downgrade";

type SuccessState = { plan: MembershipPlan; intent: PlanIntent } | null;

export default function MembershipPlansContainer(): JSX.Element {
    const { clubId } = useAuth();
    const navigate = useNavigate();

    const { data: membership } = useMyMembership(clubId ?? "", { enabled: true });

    const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [isConfirming, setIsConfirming] = useState(false);
    const [success, setSuccess] = useState<SuccessState>(null);

    const subscribeMutation = useSubscribeToMembership(clubId ?? "");
    const upgradeMutation = useUpgradeMyMembership(clubId ?? "");
    const downgradeMutation = useDowngradeMyMembership(clubId ?? "");
    const cancelPendingDowngradeMutation = useCancelPendingDowngrade(clubId ?? "");
    const { refetch: refetchMembership } = useMyMembership(clubId ?? "", { enabled: false });
    const { data: allPlans } = useListMembershipPlans(clubId ?? "");

    const [cancelPendingDowngradeError, setCancelPendingDowngradeError] = useState<string | null>(
        null
    );

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

    const hasActiveMembership =
        membership?.status === "active" || membership?.status === "trialing";

    const pendingPlanId = membership?.pending_plan_id ?? null;
    const pendingPlan = pendingPlanId
        ? (allPlans?.find((p) => p.id === pendingPlanId) ?? null)
        : null;

    function getPlanIntent(plan: MembershipPlan): PlanIntent {
        if (!hasActiveMembership || membership?.plan.id === plan.id) return "subscribe";
        if (plan.price > (membership?.plan.price ?? 0)) return "upgrade";
        return "downgrade";
    }

    const handleSelectPlan = useCallback((plan: MembershipPlan) => {
        setActionError(null);
        setSelectedPlan(plan);
    }, []);

    const handleCloseModal = useCallback(() => {
        if (isConfirming) return;
        setSelectedPlan(null);
        setActionError(null);
    }, [isConfirming]);

    const handleConfirm = useCallback(
        async (plan: MembershipPlan, paymentMethodId: string) => {
            const intent = getPlanIntent(plan);
            setActionError(null);
            setIsConfirming(true);
            try {
                if (intent === "downgrade") {
                    await downgradeMutation.mutateAsync({ plan_id: plan.id });
                    await refetchMembership();
                    setSelectedPlan(null);
                    setSuccess({ plan, intent });
                    return;
                }

                const result =
                    intent === "upgrade"
                        ? await upgradeMutation.mutateAsync({
                              plan_id: plan.id,
                              payment_method_id: paymentMethodId,
                          })
                        : await subscribeMutation.mutateAsync({
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
                        setActionError(stripeError.message ?? "Payment confirmation failed.");
                        setIsConfirming(false);
                        return;
                    }
                }

                await refetchMembership();
                setSelectedPlan(null);
                setSuccess({ plan, intent });
            } catch (err) {
                setActionError(
                    (err as { message?: string })?.message ?? "Action failed — please try again."
                );
            } finally {
                setIsConfirming(false);
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [subscribeMutation, upgradeMutation, downgradeMutation, refetchMembership, membership]
    );

    const isActionPending =
        subscribeMutation.isPending ||
        upgradeMutation.isPending ||
        downgradeMutation.isPending ||
        isConfirming;

    // Success screen (replaces the whole view after checkout)
    if (success) {
        const heading =
            success.intent === "upgrade"
                ? "Plan upgraded!"
                : success.intent === "downgrade"
                  ? "Downgrade scheduled!"
                  : "You're now a member!";
        const body =
            success.intent === "upgrade" ? (
                <>
                    You have been upgraded to{" "}
                    <span className="font-semibold text-foreground">{success.plan.name}</span>.
                    Billing restarts today.
                </>
            ) : success.intent === "downgrade" ? (
                <>
                    Your plan will change to{" "}
                    <span className="font-semibold text-foreground">{success.plan.name}</span> at
                    the end of your current billing period.
                </>
            ) : (
                <>
                    Successfully subscribed to{" "}
                    <span className="font-semibold text-foreground">{success.plan.name}</span>.
                </>
            );

        return (
            <div className="w-full space-y-5">
                <section className="card-surface overflow-hidden">
                    <div className="px-5 py-6 sm:px-6">
                        <div className="flex flex-col items-center gap-5 rounded-xl border border-border bg-card px-6 py-10 text-center">
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
                                <BadgeCheck size={28} />
                            </div>
                            <div>
                                <p className="text-lg font-bold text-foreground">{heading}</p>
                                <p className="mt-1 text-sm text-muted-foreground">{body}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() =>
                                    void navigate({ to: "/profile/memberships/current" })
                                }
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

    return (
        <>
            <div className="w-full space-y-5">
                <section className="card-surface overflow-hidden">
                    <header className="border-b border-border bg-muted/10 px-5 py-4 sm:px-6">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground shadow-xs">
                                    <BadgeCheck size={16} />
                                </div>
                                <div>
                                    <h1 className="text-lg font-semibold tracking-tight text-foreground">
                                        Membership Plans
                                    </h1>
                                    <p className="mt-0.5 text-sm text-muted-foreground">
                                        {hasActiveMembership
                                            ? "Upgrade, downgrade, or switch your plan"
                                            : "Compare credits, discounts, and booking access"}
                                    </p>
                                </div>
                            </div>
                            {hasActiveMembership && (
                                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1.5 text-xs font-semibold text-foreground">
                                    <ArrowUpDown size={12} />
                                    Plan: {membership?.plan.name}
                                </span>
                            )}
                        </div>
                    </header>
                    <div className="px-5 py-6 sm:px-6 space-y-4">
                        {pendingPlanId && (
                            <PendingDowngradePlansAlert
                                currentPlanName={membership?.plan.name ?? ""}
                                pendingPlanName={pendingPlan?.name ?? null}
                                periodEnd={membership?.current_period_end ?? ""}
                                onCancelDowngrade={() => void handleCancelPendingDowngrade()}
                                isCancelling={cancelPendingDowngradeMutation.isPending}
                                error={cancelPendingDowngradeError}
                            />
                        )}
                        <PlansStep
                            clubId={clubId ?? ""}
                            currentPlanId={membership?.plan.id ?? null}
                            currentPlanPrice={membership?.plan.price ?? null}
                            membershipStatus={membership?.status ?? null}
                            pendingPlanId={pendingPlanId}
                            onSelectPlan={handleSelectPlan}
                        />
                    </div>
                </section>
            </div>

            {selectedPlan && (
                <PlanChangeModal
                    plan={selectedPlan}
                    planIntent={getPlanIntent(selectedPlan)}
                    onClose={handleCloseModal}
                    onConfirm={(paymentMethodId) =>
                        void handleConfirm(selectedPlan, paymentMethodId)
                    }
                    isLoading={isActionPending}
                    error={actionError}
                />
            )}
        </>
    );
}

function PendingDowngradePlansAlert({
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
                                <span className="font-semibold text-destructive/90">
                                    {currentPlanName}
                                </span>{" "}
                                →{" "}
                                <span className="font-semibold text-destructive/90">
                                    {pendingPlanName}
                                </span>{" "}
                                on{" "}
                                <span className="font-semibold text-destructive/90">
                                    {periodEnd
                                        ? formatUTCDate(periodEnd)
                                        : "your next billing date"}
                                </span>
                                .
                            </>
                        ) : (
                            <>
                                A downgrade is scheduled for{" "}
                                <span className="font-semibold text-destructive/90">
                                    {periodEnd
                                        ? formatUTCDate(periodEnd)
                                        : "your next billing date"}
                                </span>
                                .
                            </>
                        )}{" "}
                        Cancel it to keep your current plan, or upgrade to a higher plan below.
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
