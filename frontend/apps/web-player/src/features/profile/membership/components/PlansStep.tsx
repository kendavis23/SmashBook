import { type JSX } from "react";
import { useListMembershipPlans } from "@repo/player-domain/hooks";
import type { MembershipPlan } from "@repo/player-domain/models";
import { MembershipPlanCard } from "./MembershipPlanCard";

type Props = {
    clubId: string;
    currentPlanId: string | null;
    currentPlanPrice: number | null;
    membershipStatus: string | null;
    onSelectPlan: (plan: MembershipPlan) => void;
};

export function PlansStep({
    clubId,
    currentPlanId,
    currentPlanPrice,
    membershipStatus,
    onSelectPlan,
}: Props): JSX.Element {
    const { data: plans, isLoading, error } = useListMembershipPlans(clubId);
    const activePlans = plans?.filter((p) => p.is_active) ?? [];
    const hasActiveMembership = membershipStatus === "active" || membershipStatus === "trialing";

    return (
        <div className="space-y-4">
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
                            isCurrent={hasActiveMembership && plan.id === currentPlanId}
                            hasActiveMembership={hasActiveMembership}
                            currentPlanPrice={currentPlanPrice}
                            onSelect={() => onSelectPlan(plan)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
