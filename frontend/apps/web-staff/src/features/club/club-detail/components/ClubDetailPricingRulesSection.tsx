import { useGetPricingRules, useSetPricingRules } from "../../hooks";
import type { PricingRule } from "../../types";
import { AlertToast } from "@repo/ui";
import { type FormEvent, type JSX, useEffect, useState } from "react";
import { RuleForm } from "./PricingRuleForm";
import PricingRulesView from "./PricingRulesView";
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

    useEffect(() => {
        setToastDismissed(false);
    }, [error, saveError, success]);

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

    const totalPages = Math.ceil(rules.length / PAGE_SIZE);
    const pagedRules = rules.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
    const finalError = error || saveError;

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

    if (showForm) {
        return (
            <div className="space-y-4">
                {finalError && !toastDismissed ? (
                    <AlertToast
                        title={(finalError as Error).message}
                        variant="error"
                        onClose={() => setToastDismissed(true)}
                    />
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

    return (
        <PricingRulesView
            rules={rules}
            pagedRules={pagedRules}
            currency={currency}
            saving={saving}
            success={success}
            finalError={finalError as Error | null}
            toastDismissed={toastDismissed}
            currentPage={currentPage}
            totalPages={totalPages}
            deleteIndex={deleteIndex}
            onToastDismiss={() => setToastDismissed(true)}
            onAddRule={openAddForm}
            onEditRule={openEditForm}
            onDeleteRule={setDeleteIndex}
            onPageChange={setCurrentPage}
            onDeleteConfirmed={handleDeleteConfirmed}
            onDeleteCancel={() => setDeleteIndex(null)}
        />
    );
}
