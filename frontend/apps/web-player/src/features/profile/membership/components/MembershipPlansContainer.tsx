import { useCallback, useState, type JSX } from "react";
import { useNavigate } from "@tanstack/react-router";
import { loadStripe } from "@stripe/stripe-js";
import { config } from "@repo/config";
import { BadgeCheck } from "lucide-react";
import type { MembershipPlan } from "@repo/player-domain/models";
import { useMyMembership, useSubscribeToMembership } from "@repo/player-domain/hooks";
import { useAuth } from "../../store";
import { PlansStep } from "./PlansStep";
import { SelectCardStep } from "./SelectCardStep";

const stripePromise = loadStripe(config.stripePublishableKey);

type FlowStep =
    | { id: "plans" }
    | { id: "select_card"; plan: MembershipPlan }
    | { id: "success"; plan: MembershipPlan };

export default function MembershipPlansContainer(): JSX.Element {
    const { clubId } = useAuth();
    const navigate = useNavigate();

    const { data: membership } = useMyMembership(clubId ?? "", { enabled: true });

    const [step, setStep] = useState<FlowStep>({ id: "plans" });
    const [subscribeError, setSubscribeError] = useState<string | null>(null);
    const [isConfirming, setIsConfirming] = useState(false);

    const subscribeMutation = useSubscribeToMembership(clubId ?? "");
    const { refetch: refetchMembership } = useMyMembership(clubId ?? "", { enabled: false });

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

    if (step.id === "select_card") {
        return (
            <div className="w-full space-y-5">
                <section className="card-surface overflow-hidden">
                    <div className="px-5 py-6 sm:px-6">
                        <SelectCardStep
                            plan={step.plan}
                            onBack={() => setStep({ id: "plans" })}
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

    const locked =
        membership?.status === "active" || membership?.status === "trialing";

    return (
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
                                    Compare credits, discounts, and booking access
                                </p>
                            </div>
                        </div>
                        {locked && (
                            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-success/20 bg-success/10 px-3 py-1.5 text-xs font-semibold text-success">
                                <BadgeCheck size={13} />
                                You already have an active plan
                            </span>
                        )}
                    </div>
                </header>
                <div className="px-5 py-6 sm:px-6">
                    <PlansStep
                        clubId={clubId ?? ""}
                        currentPlanId={membership?.plan.id ?? null}
                        membershipStatus={membership?.status ?? null}
                        onSelectPlan={handleSelectPlan}
                    />
                </div>
            </section>
        </div>
    );
}
