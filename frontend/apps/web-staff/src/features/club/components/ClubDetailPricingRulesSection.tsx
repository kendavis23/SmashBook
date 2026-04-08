import { useGetPricingRules, useSetPricingRules } from "../hooks";
import type { PricingRule } from "../types";
import { AlertToast } from "@repo/ui";
import { Plus } from "lucide-react";
import { type FormEvent, type JSX, useEffect, useState } from "react";
import { DeleteModal } from "./DeleteModal";
import { RuleCard } from "./PricingRuleCard";
import { RuleForm } from "./PricingRuleForm";
import { EMPTY_RULE, PAGE_SIZE, type FormState } from "./pricingRulesConstants";

export default function PricingRulesTable({
    clubId,
    currency = "GBP",
}: {
    clubId: string;
    currency?: string;
}): JSX.Element {
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<FormState>({ ...EMPTY_RULE });
    const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(0);
    const [toastDismissed, setToastDismissed] = useState(false);

    const { data: rules = [], isLoading, error } = useGetPricingRules(clubId);

    const {
        mutate: saveRules,
        isPending: saving,
        isSuccess: success,
        error: saveError,
    } = useSetPricingRules(clubId);

    useEffect(() => { setToastDismissed(false); }, [error, saveError, success]);

    function openAddForm(): void {
        setForm({ ...EMPTY_RULE });
        setShowForm(true);
    }

    function openEditForm(index: number): void {
        const rule = rules[index];
        if (!rule) return;
        setForm({ ...rule, _editIndex: index });
        setShowForm(true);
    }

    function closeForm(): void {
        setShowForm(false);
        setForm({ ...EMPTY_RULE });
    }

    function handleFormChange(field: keyof PricingRule, value: unknown): void {
        setForm((prev) => ({
            ...prev,
            [field]: value === "" ? undefined : value,
        }));
    }

    function handleFormSubmit(e: FormEvent): void {
        e.preventDefault();
        const { _editIndex, ...rule } = form;
        const updated =
            _editIndex !== undefined
                ? rules.map((r: PricingRule, i: number) => (i === _editIndex ? rule : r))
                : [...rules, rule];
        saveRules(updated, { onSuccess: closeForm });
    }

    function handleDeleteConfirmed(): void {
        if (deleteIndex === null) return;
        const updated = rules.filter((_: PricingRule, i: number) => i !== deleteIndex);
        saveRules(updated);
        setDeleteIndex(null);
    }

    // Pagination
    const totalPages = Math.ceil(rules.length / PAGE_SIZE);
    const pagedRules = rules.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

    if (isLoading) {
        return (
            <section className="rounded-xl border border-border bg-card px-6 py-12 shadow-sm">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-cta" />
                    Loading pricing rules...
                </div>
            </section>
        );
    }

    const finalError = error || saveError;

    // ---- Inline form view (replaces list entirely) --------------------------
    if (showForm) {
        return (
            <div className="space-y-4">
                {finalError && !toastDismissed ? (
                    <AlertToast title={(finalError as Error).message} variant="error" onClose={() => setToastDismissed(true)} />
                ) : null}
                <RuleForm
                    form={form}
                    currency={currency}
                    saving={saving}
                    onChange={handleFormChange}
                    onSubmit={handleFormSubmit}
                    onCancel={closeForm}
                />
            </div>
        );
    }

    // ---- List view ----------------------------------------------------------
    return (
        <div className="space-y-4">
            {finalError && !toastDismissed ? <AlertToast title={(finalError as Error).message} variant="error" onClose={() => setToastDismissed(true)} /> : null}
            {success && !toastDismissed ? <AlertToast title="Changes saved." variant="success" onClose={() => setToastDismissed(true)} /> : null}

            {/* Empty state */}
            {rules.length === 0 ? (
                <section className="rounded-xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center">
                    <h3 className="text-lg font-semibold text-foreground">No pricing set yet</h3>
                    <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                        Create your first pricing rule to set a base rate for a day and time range.
                        You can always add surge or quiet-hour adjustments later.
                    </p>
                    <button
                        onClick={openAddForm}
                        className="btn-cta mt-6 inline-flex items-center gap-2"
                    >
                        <Plus size={14} />
                        Add rule
                    </button>
                </section>
            ) : null}

            {/* Rules grid */}
            {rules.length > 0 ? (
                <div className="space-y-3">
                    {/* Top bar */}
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            {rules.length} rule{rules.length !== 1 ? "s" : ""}
                        </p>
                        <button
                            onClick={openAddForm}
                            className="btn-cta-sm inline-flex items-center gap-1.5"
                        >
                            <Plus size={13} />
                            Add rule
                        </button>
                    </div>

                    {/* 2-column grid */}
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {pagedRules.map((rule, i) => {
                            const globalIndex = currentPage * PAGE_SIZE + i;
                            return (
                                <RuleCard
                                    key={`${rule.label}-${rule.day_of_week}-${rule.start_time}-${globalIndex}`}
                                    rule={rule}
                                    currency={currency}
                                    onEdit={() => openEditForm(globalIndex)}
                                    onDelete={() => setDeleteIndex(globalIndex)}
                                />
                            );
                        })}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 ? (
                        <div className="flex items-center justify-between border-t border-border pt-3">
                            <p className="text-xs text-muted-foreground">
                                Page {currentPage + 1} of {totalPages}
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                                    disabled={currentPage === 0}
                                    className="btn-outline disabled:opacity-40"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() =>
                                        setCurrentPage((p) => Math.min(totalPages - 1, p + 1))
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

            {/* Delete confirmation — portaled to document.body */}
            {deleteIndex !== null ? (
                <DeleteModal
                    onConfirm={handleDeleteConfirmed}
                    onCancel={() => setDeleteIndex(null)}
                    saving={saving}
                />
            ) : null}
        </div>
    );
}
