import { useState, useCallback, type JSX } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { config } from "@repo/config";
import {
    useMyMembership,
    useSubscribeToMembership,
    useCancelMyMembership,
} from "@repo/player-domain/hooks";
import { BadgeCheck, Star, Zap } from "lucide-react";
import type { MembershipPlan } from "@repo/player-domain/models";
import type { MembershipSubscription } from "../../types";
import { useAuth } from "../../store";
import { CurrentMembershipCard } from "./CurrentMembershipCard";
import { PlansStep } from "./PlansStep";
import { SelectCardStep } from "./SelectCardStep";

const stripePromise = loadStripe(config.stripePublishableKey);

type FlowStep =
    | { id: "current" }
    | { id: "plans" }
    | { id: "select_card"; plan: MembershipPlan }
    | { id: "success"; plan: MembershipPlan };

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
