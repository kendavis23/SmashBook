import { type JSX } from "react";
import { formatCurrency } from "@repo/ui";
import { BadgeCheck, Check } from "lucide-react";
import type { MembershipPlan } from "@repo/player-domain/models";

type Props = {
    plan: MembershipPlan;
    isCurrent: boolean;
    locked: boolean;
    onSelect: () => void;
};

export function MembershipPlanCard({ plan, isCurrent, locked, onSelect }: Props): JSX.Element {
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
