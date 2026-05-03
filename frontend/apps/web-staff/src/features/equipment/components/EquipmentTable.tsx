import type { JSX } from "react";
import { formatCurrency } from "@repo/ui";
import { Edit3, Package, Trash2 } from "lucide-react";
import {
    ITEM_CONDITION_LABELS,
    ITEM_TYPE_LABELS,
    type EquipmentItem,
    type ItemCondition,
} from "../types";

type Props = {
    items: EquipmentItem[];
    isLoading: boolean;
    error: Error | null;
    canManage: boolean;
    hasActiveFilters: boolean;
    onEdit: (item: EquipmentItem) => void;
    onDelete: (item: EquipmentItem) => void;
};

function getConditionClass(condition: ItemCondition): string {
    if (condition === "new" || condition === "good") {
        return "bg-success/15 text-success";
    }

    if (condition === "fair") {
        return "bg-warning/15 text-warning";
    }

    return "bg-destructive/10 text-destructive";
}

export default function EquipmentTable({
    items,
    isLoading,
    error,
    canManage,
    hasActiveFilters,
    onEdit,
    onDelete,
}: Props): JSX.Element {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center gap-3 py-20">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-cta" />
                <span className="text-sm text-muted-foreground">Loading equipment...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="m-5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error.message}
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                    <Package size={24} className="text-muted-foreground/40" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">No equipment yet</h3>
                <p className="mt-1.5 max-w-xs text-xs text-muted-foreground">
                    {hasActiveFilters
                        ? "No equipment matches the selected type and condition."
                        : "Add rental gear to track quantities, prices, and condition."}
                </p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/30">
                    <tr>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Item
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Quantity
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Rental Price
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Condition
                        </th>
                        <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                    {items.map((item) => (
                        <tr key={item.id} className="transition hover:bg-muted/20">
                            <td className="px-5 py-4">
                                <div className="font-medium text-foreground">{item.name}</div>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                    <span>{ITEM_TYPE_LABELS[item.item_type]}</span>
                                    {item.notes ? (
                                        <>
                                            <span aria-hidden="true">/</span>
                                            <span className="max-w-sm truncate">{item.notes}</span>
                                        </>
                                    ) : null}
                                </div>
                            </td>
                            <td className="px-5 py-4">
                                <div className="text-sm font-medium text-foreground">
                                    {item.quantity_available} available
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground">
                                    {item.quantity_total} total
                                </div>
                            </td>
                            <td className="px-5 py-4 text-sm text-foreground">
                                {formatCurrency(item.rental_price)}
                            </td>
                            <td className="px-5 py-4">
                                <span
                                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getConditionClass(item.condition)}`}
                                >
                                    {ITEM_CONDITION_LABELS[item.condition]}
                                </span>
                            </td>
                            <td className="px-5 py-4">
                                <div className="flex justify-end gap-2">
                                    {canManage ? (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => onEdit(item)}
                                                disabled={item.condition === "retired"}
                                                className="btn-outline min-h-9 px-3 disabled:cursor-not-allowed disabled:opacity-40"
                                            >
                                                <Edit3 size={13} />
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onDelete(item)}
                                                disabled={item.condition === "retired"}
                                                className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-destructive/30 px-3 text-sm font-medium text-destructive transition hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-40"
                                            >
                                                <Trash2 size={13} />
                                                Delete
                                            </button>
                                        </>
                                    ) : (
                                        <span className="text-xs text-muted-foreground">
                                            View only
                                        </span>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
