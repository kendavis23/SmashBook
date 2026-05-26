import { useCallback, useState, type JSX } from "react";
import { useNavigate } from "@tanstack/react-router";
import { loadStripe } from "@stripe/stripe-js";
import { config } from "@repo/config";
import { BadgeCheck, ArrowUpDown } from "lucide-react";
import type { MembershipPlan } from "@repo/player-domain/models";
import { useMyMembership, useSubscribeToMembership } from "@repo/player-domain/hooks";
import { useAuth } from "../../store";
import { PlansStep } from "./PlansStep";
import { PlanChangeModal } from "./PlanChangeModal";

const stripePromise = loadStripe(config.stripePublishableKey);

type SuccessState = { plan: MembershipPlan; wasPlanChange: boolean } | null;

export default function MembershipPlansContainer(): JSX.Element {
    const { clubId } = useAuth();
    const navigate = useNavigate();

    const { data: membership } = useMyMembership(clubId ?? "", { enabled: true });

    // Which plan is being checked out (null = modal closed)
    const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);
    const [subscribeError, setSubscribeError] = useState<string | null>(null);
    const [isConfirming, setIsConfirming] = useState(false);
    const [success, setSuccess] = useState<SuccessState>(null);

    const subscribeMutation = useSubscribeToMembership(clubId ?? "");
    const { refetch: refetchMembership } = useMyMembership(clubId ?? "", { enabled: false });

    const handleSelectPlan = useCallback((plan: MembershipPlan) => {
        setSubscribeError(null);
        setSelectedPlan(plan);
    }, []);

    const handleCloseModal = useCallback(() => {
        if (isConfirming) return; // prevent close while processing
        setSelectedPlan(null);
        setSubscribeError(null);
    }, [isConfirming]);

    const handleSubscribe = useCallback(
        async (plan: MembershipPlan, paymentMethodId: string) => {
            const wasPlanChange =
                membership?.status === "active" || membership?.status === "trialing";
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
                setSelectedPlan(null);
                setSuccess({ plan, wasPlanChange: wasPlanChange ?? false });
            } catch (err) {
                setSubscribeError(
                    (err as { message?: string })?.message ??
                        "Subscription failed — please try again."
                );
            } finally {
                setIsConfirming(false);
            }
        },
        [subscribeMutation, refetchMembership, membership]
    );

    const hasActiveMembership =
        membership?.status === "active" || membership?.status === "trialing";
    const isPlanChange = hasActiveMembership;

    // Success screen (replaces the whole view after checkout)
    if (success) {
        return (
            <div className="w-full space-y-5">
                <section className="card-surface overflow-hidden">
                    <div className="px-5 py-6 sm:px-6">
                        <div className="flex flex-col items-center gap-5 rounded-xl border border-border bg-card px-6 py-10 text-center">
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
                                <BadgeCheck size={28} />
                            </div>
                            <div>
                                <p className="text-lg font-bold text-foreground">
                                    {success.wasPlanChange
                                        ? "Plan updated!"
                                        : "You're now a member!"}
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {success.wasPlanChange ? (
                                        <>
                                            Your plan has been changed to{" "}
                                            <span className="font-semibold text-foreground">
                                                {success.plan.name}
                                            </span>
                                            . Changes take effect at the next billing cycle.
                                        </>
                                    ) : (
                                        <>
                                            Successfully subscribed to{" "}
                                            <span className="font-semibold text-foreground">
                                                {success.plan.name}
                                            </span>
                                            .
                                        </>
                                    )}
                                </p>
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
                    <div className="px-5 py-6 sm:px-6">
                        <PlansStep
                            clubId={clubId ?? ""}
                            currentPlanId={membership?.plan.id ?? null}
                            currentPlanPrice={membership?.plan.price ?? null}
                            membershipStatus={membership?.status ?? null}
                            onSelectPlan={handleSelectPlan}
                        />
                    </div>
                </section>
            </div>

            {/* Modal — renders over the plans grid via portal */}
            {selectedPlan && (
                <PlanChangeModal
                    plan={selectedPlan}
                    isPlanChange={isPlanChange}
                    onClose={handleCloseModal}
                    onConfirm={(paymentMethodId) =>
                        void handleSubscribe(selectedPlan, paymentMethodId)
                    }
                    isLoading={subscribeMutation.isPending || isConfirming}
                    error={subscribeError}
                />
            )}
        </>
    );
}
