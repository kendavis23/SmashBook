import { type JSX } from "react";
import { useListMembershipPlans } from "@repo/player-domain/hooks";
import { BadgeCheck } from "lucide-react";
import type { MembershipPlan } from "@repo/player-domain/models";
import { BackButton } from "./MembershipPrimitives";
import { MembershipPlanCard } from "./MembershipPlanCard";

type Props = {
    clubId: string;
    currentPlanId: string | null;
    membershipStatus: string | null;
    onBack: () => void;
    onSelectPlan: (plan: MembershipPlan) => void;
};

export function PlansStep({
    clubId,
    currentPlanId,
    membershipStatus,
    onBack,
    onSelectPlan,
}: Props): JSX.Element {
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
                        <MembershipPlanCard
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
