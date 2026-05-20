import type { PricingRule } from "../../types";
import { AlertToast } from "@repo/ui";
import { Plus } from "lucide-react";
import type { JSX } from "react";
import { DeleteModal } from "./DeleteModal";
import { RuleCard } from "./PricingRuleCard";
import { DAY_NAMES } from "./pricingRulesConstants";

type Props = {
    rules: PricingRule[];
    pagedRules: PricingRule[];
    currency: string;
    saving: boolean;
    success: boolean;
    finalError: Error | null;
    toastDismissed: boolean;
    currentPage: number;
    totalPages: number;
    deleteIndex: number | null;
    selectedDay: number;
    onToastDismiss: () => void;
    onDayChange: (day: number) => void;
    onAddRule: () => void;
    onEditRule: (index: number) => void;
    onDeleteRule: (index: number) => void;
    onPageChange: (page: number) => void;
    onDeleteConfirmed: () => void;
    onDeleteCancel: () => void;
};

export default function PricingRulesView({
    rules,
    currency,
    saving,
    success,
    finalError,
    toastDismissed,
    deleteIndex,
    selectedDay,
    onToastDismiss,
    onDayChange,
    onAddRule,
    onEditRule,
    onDeleteRule,
    onDeleteConfirmed,
    onDeleteCancel,
}: Props): JSX.Element {
    const dayRules = rules
        .map((rule, i) => ({ rule, globalIndex: i }))
        .filter(({ rule }) => rule.day_of_week === selectedDay);

    return (
        <div className="space-y-4">
            {finalError && !toastDismissed ? (
                <AlertToast title={finalError.message} variant="error" onClose={onToastDismiss} />
            ) : null}
            {success && !toastDismissed ? (
                <AlertToast title="Changes saved." variant="success" onClose={onToastDismiss} />
            ) : null}

            {rules.length === 0 ? (
                <section className="rounded-xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center">
                    <h3 className="text-lg font-semibold text-foreground">No pricing set yet</h3>
                    <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                        Create your first pricing rule to set a base rate for a day and time range.
                        You can always add surge or quiet-hour adjustments later.
                    </p>
                    <button
                        onClick={onAddRule}
                        className="btn-cta mt-6 inline-flex items-center gap-2"
                    >
                        <Plus size={14} />
                        Add rule
                    </button>
                </section>
            ) : null}

            {rules.length > 0 ? (
                <div className="flex gap-0 rounded-xl border border-border bg-card overflow-hidden">
                    {/* Day nav */}
                    <div className="w-44 shrink-0 border-r border-border bg-muted/20">
                        <p className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Days
                        </p>
                        {DAY_NAMES.map((name, idx) => (
                            <button
                                key={name}
                                onClick={() => onDayChange(idx)}
                                className={`w-full px-4 py-3 text-left text-sm transition ${
                                    selectedDay === idx
                                        ? "border-l-2 border-cta bg-background font-semibold text-foreground"
                                        : "border-l-2 border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                                }`}
                            >
                                {name}
                            </button>
                        ))}
                    </div>

                    {/* Rules panel */}
                    <div className="min-w-0 flex-1 px-5 py-4">
                        <div className="mb-4 flex items-center justify-between gap-2">
                            <h3 className="text-sm font-semibold text-foreground">
                                {DAY_NAMES[selectedDay]} Pricing Rules
                            </h3>
                            <button
                                onClick={onAddRule}
                                className="btn-cta-sm inline-flex items-center gap-1.5"
                            >
                                <Plus size={13} />
                                Add rule
                            </button>
                        </div>

                        {dayRules.length === 0 ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">
                                No rules for {DAY_NAMES[selectedDay]}.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {dayRules.map(({ rule, globalIndex }) => (
                                    <RuleCard
                                        key={`${rule.label}-${rule.day_of_week}-${rule.start_time}-${globalIndex}`}
                                        rule={rule}
                                        currency={currency}
                                        onEdit={() => onEditRule(globalIndex)}
                                        onDelete={() => onDeleteRule(globalIndex)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            ) : null}

            {deleteIndex !== null ? (
                <DeleteModal
                    onConfirm={onDeleteConfirmed}
                    onCancel={onDeleteCancel}
                    saving={saving}
                />
            ) : null}
        </div>
    );
}
