import type { PricingRule } from "../../types";
import { AlertToast } from "@repo/ui";
import { Plus } from "lucide-react";
import type { JSX } from "react";
import { DeleteModal } from "./DeleteModal";
import { RuleCard } from "./PricingRuleCard";
import { PAGE_SIZE } from "./pricingRulesConstants";

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
    onToastDismiss: () => void;
    onAddRule: () => void;
    onEditRule: (index: number) => void;
    onDeleteRule: (index: number) => void;
    onPageChange: (page: number) => void;
    onDeleteConfirmed: () => void;
    onDeleteCancel: () => void;
};

export default function PricingRulesView({
    rules,
    pagedRules,
    currency,
    saving,
    success,
    finalError,
    toastDismissed,
    currentPage,
    totalPages,
    deleteIndex,
    onToastDismiss,
    onAddRule,
    onEditRule,
    onDeleteRule,
    onPageChange,
    onDeleteConfirmed,
    onDeleteCancel,
}: Props): JSX.Element {
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
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            {rules.length} rule{rules.length !== 1 ? "s" : ""}
                        </p>
                        <button
                            onClick={onAddRule}
                            className="btn-cta-sm inline-flex items-center gap-1.5"
                        >
                            <Plus size={13} />
                            Add rule
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {pagedRules.map((rule, i) => {
                            const globalIndex = currentPage * PAGE_SIZE + i;
                            return (
                                <RuleCard
                                    key={`${rule.label}-${rule.day_of_week}-${rule.start_time}-${globalIndex}`}
                                    rule={rule}
                                    currency={currency}
                                    onEdit={() => onEditRule(globalIndex)}
                                    onDelete={() => onDeleteRule(globalIndex)}
                                />
                            );
                        })}
                    </div>

                    {totalPages > 1 ? (
                        <div className="flex items-center justify-between border-t border-border pt-3">
                            <p className="text-xs text-muted-foreground">
                                Page {currentPage + 1} of {totalPages}
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => onPageChange(Math.max(0, currentPage - 1))}
                                    disabled={currentPage === 0}
                                    className="btn-outline disabled:opacity-40"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() =>
                                        onPageChange(Math.min(totalPages - 1, currentPage + 1))
                                    }
                                    disabled={currentPage >= totalPages - 1}
                                    className="btn-outline disabled:opacity-40"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    ) : null}
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
