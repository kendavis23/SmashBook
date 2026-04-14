import type { PricingRule } from "../../types";
import { Pencil, Tag, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import type { JSX } from "react";
import { DAY_NAMES, formatPrice } from "./pricingRulesConstants";

export function RuleCard({
    rule,
    currency,
    onEdit,
    onDelete,
}: {
    rule: PricingRule;
    currency: string;
    onEdit: () => void;
    onDelete: () => void;
}): JSX.Element {
    return (
        <article
            className={`rounded-xl border px-4 py-3 shadow-sm ${
                rule.is_active
                    ? "border-border bg-card"
                    : "border-border/50 bg-muted/30 text-muted-foreground"
            }`}
        >
            <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <h3 className="truncate text-sm font-semibold text-foreground">{rule.label}</h3>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                        {DAY_NAMES[rule.day_of_week]}
                    </span>
                    <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            rule.is_active
                                ? "bg-success/15 text-success"
                                : "bg-muted text-muted-foreground"
                        }`}
                    >
                        {rule.is_active ? "Active" : "Inactive"}
                    </span>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                    <button onClick={onEdit} className="btn-ghost-sm">
                        <Pencil size={11} />
                        Edit
                    </button>
                    <button onClick={onDelete} className="btn-destructive-sm">
                        <Trash2 size={11} />
                        Delete
                    </button>
                </div>
            </div>

            <div className="mt-2 flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm">
                <p className="space-x-1.5">
                    <span className="text-xs text-muted-foreground">Time</span>
                    <span className="font-medium text-foreground">
                        {rule.start_time} – {rule.end_time}
                    </span>
                </p>
                <p className="space-x-1.5">
                    <span className="text-xs text-muted-foreground">Base</span>
                    <span className="text-base font-semibold text-foreground">
                        {formatPrice(rule.price_per_slot, currency)}
                    </span>
                </p>
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
                {rule.surge_trigger_pct ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-medium text-warning">
                        <TrendingUp size={10} />
                        Surge ≥{rule.surge_trigger_pct}% (+{rule.surge_max_pct}%)
                    </span>
                ) : null}
                {rule.low_demand_trigger_pct ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-info/15 px-2.5 py-0.5 text-xs font-medium text-info">
                        <TrendingDown size={10} />
                        Low ≤{rule.low_demand_trigger_pct}% (-{rule.low_demand_min_pct}%)
                    </span>
                ) : null}
                {rule.incentive_price ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                        <Tag size={10} />
                        {formatPrice(rule.incentive_price, currency)}
                        {rule.incentive_label ? ` · ${rule.incentive_label}` : ""}
                    </span>
                ) : null}
                {!rule.surge_trigger_pct &&
                !rule.low_demand_trigger_pct &&
                !rule.incentive_price ? (
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                        Base price only
                    </span>
                ) : null}
            </div>
        </article>
    );
}
