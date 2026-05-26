import { type JSX } from "react";
import { formatCurrency } from "@repo/ui";
import { BadgeCheck, Check, ArrowUp, ArrowDown } from "lucide-react";
import type { MembershipPlan } from "@repo/player-domain/models";

type Props = {
    plan: MembershipPlan;
    isCurrent: boolean;
    hasActiveMembership: boolean;
    currentPlanPrice: number | null;
    onSelect: () => void;
};

export function MembershipPlanCard({
    plan,
    isCurrent,
    hasActiveMembership,
    currentPlanPrice,
    onSelect,
}: Props): JSX.Element {
    const perks = [
        plan.booking_credits_per_period !== null &&
            `${plan.booking_credits_per_period} booking credits`,
        plan.guest_passes_per_period !== null && `${plan.guest_passes_per_period} guest passes`,
        plan.discount_pct !== null && `${plan.discount_pct}% booking discount`,
        plan.priority_booking_days !== null && `${plan.priority_booking_days}-day priority window`,
        plan.trial_days > 0 && `${plan.trial_days}-day free trial`,
    ].filter(Boolean) as string[];

    const isUpgrade =
        hasActiveMembership &&
        !isCurrent &&
        currentPlanPrice !== null &&
        plan.price > currentPlanPrice;
    const isDowngrade =
        hasActiveMembership &&
        !isCurrent &&
        currentPlanPrice !== null &&
        plan.price < currentPlanPrice;
    const isSwitchSameTier =
        hasActiveMembership &&
        !isCurrent &&
        currentPlanPrice !== null &&
        plan.price === currentPlanPrice;

    function getButtonLabel(): string {
        if (isUpgrade) return "Upgrade to this plan";
        if (isDowngrade) return "Downgrade to this plan";
        if (isSwitchSameTier) return "Switch to this plan";
        return "Select this plan";
    }

    return (
        <div
            className={`relative flex h-full flex-col overflow-hidden rounded-xl border transition ${
                isCurrent
                    ? "border-cta bg-card ring-1 ring-cta/20"
                    : hasActiveMembership
                      ? isUpgrade
                          ? "border-border bg-card hover:border-cta/40 hover:shadow-sm"
                          : "border-border bg-card hover:border-foreground/25 hover:shadow-sm"
                      : "border-border bg-card hover:border-foreground/25"
            }`}
        >
            {isUpgrade && (
                <div className="absolute right-0 top-0 rounded-bl-xl rounded-tr-xl bg-cta px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-cta-foreground">
                    Recommended
                </div>
            )}

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
                    {isUpgrade && currentPlanPrice !== null && (
                        <span className="ml-2 inline-flex items-center gap-0.5 text-xs font-semibold text-cta">
                            <ArrowUp size={10} />
                            {formatCurrency(Math.abs(plan.price - currentPlanPrice))} more
                        </span>
                    )}
                    {isDowngrade && currentPlanPrice !== null && (
                        <span className="ml-2 inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground">
                            <ArrowDown size={10} />
                            {formatCurrency(Math.abs(currentPlanPrice - plan.price))} less
                        </span>
                    )}
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
                    ) : (
                        <button
                            type="button"
                            onClick={onSelect}
                            className={`inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl text-sm font-semibold transition-all ${
                                isUpgrade
                                    ? "btn-cta"
                                    : "border border-border bg-card text-foreground hover:bg-muted"
                            }`}
                        >
                            {isUpgrade && <ArrowUp size={13} />}
                            {isDowngrade && <ArrowDown size={13} />}
                            {getButtonLabel()}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
