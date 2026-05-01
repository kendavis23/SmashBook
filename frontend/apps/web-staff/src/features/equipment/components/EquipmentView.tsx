import type { FormEvent, JSX } from "react";
import { AlertToast, Breadcrumb, SelectInput } from "@repo/ui";
import { Package, Plus, RefreshCw, Search, ShieldCheck } from "lucide-react";
import {
    ITEM_CONDITION_FILTER_OPTIONS,
    ITEM_TYPE_FILTER_OPTIONS,
    type EquipmentDialogMode,
    type EquipmentFilters,
    type EquipmentFormState,
    type EquipmentItem,
} from "../types";
import EquipmentFormDialog from "./EquipmentFormDialog";
import EquipmentTable from "./EquipmentTable";

type Props = {
    equipment: EquipmentItem[];
    totalEquipmentCount: number;
    isLoading: boolean;
    error: Error | null;
    canManage: boolean;
    filters: EquipmentFilters;
    hasActiveFilters: boolean;
    dialogMode: EquipmentDialogMode | null;
    form: EquipmentFormState;
    nameError: string;
    quantityError: string;
    priceError: string;
    apiError: string;
    isMutating: boolean;
    successMessage: string;
    deletingItemName: string;
    onCreateClick: () => void;
    onEditClick: (item: EquipmentItem) => void;
    onDeleteClick: (item: EquipmentItem) => void;
    onConfirmDelete: () => void;
    onCancelDelete: () => void;
    onRefresh: () => void;
    onFiltersChange: (filters: EquipmentFilters) => void;
    onSearch: () => void;
    onFormChange: (patch: Partial<EquipmentFormState>) => void;
    onSubmit: (event: FormEvent) => void;
    onCloseDialog: () => void;
    onDismissError: () => void;
    onDismissSuccess: () => void;
};

export default function EquipmentView({
    equipment,
    totalEquipmentCount,
    isLoading,
    error,
    canManage,
    filters,
    hasActiveFilters,
    dialogMode,
    form,
    nameError,
    quantityError,
    priceError,
    apiError,
    isMutating,
    successMessage,
    deletingItemName,
    onCreateClick,
    onEditClick,
    onDeleteClick,
    onConfirmDelete,
    onCancelDelete,
    onRefresh,
    onFiltersChange,
    onSearch,
    onFormChange,
    onSubmit,
    onCloseDialog,
    onDismissError,
    onDismissSuccess,
}: Props): JSX.Element {
    return (
        <div className="w-full space-y-5">
            <Breadcrumb items={[{ label: "Equipment" }]} />

            <section className="card-surface overflow-hidden">
                <header className="flex flex-col gap-3 border-b border-border bg-muted/10 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground shadow-xs">
                            <Package size={16} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-lg font-semibold tracking-tight text-foreground">
                                    Equipment
                                </h1>
                                {totalEquipmentCount > 0 ? (
                                    <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground shadow-xs">
                                        {totalEquipmentCount} total
                                    </span>
                                ) : null}
                            </div>
                            <p className="mt-0.5 text-sm text-muted-foreground">
                                Manage rental inventory, quantities, prices, and condition.
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <button
                            type="button"
                            onClick={onRefresh}
                            className="btn-outline min-h-10 px-4"
                            aria-label="Refresh equipment"
                        >
                            <RefreshCw size={14} />
                            Refresh
                        </button>
                        {canManage ? (
                            <button
                                type="button"
                                onClick={onCreateClick}
                                className="btn-cta min-h-10 px-4"
                            >
                                <Plus size={14} />
                                Add Equipment
                            </button>
                        ) : null}
                    </div>
                </header>

                <div className="border-b border-border bg-muted/20 px-5 py-4 sm:px-6">
                    <div className="mb-3 flex items-center gap-2">
                        <Search size={13} className="text-muted-foreground" />
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Filters
                        </span>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-medium text-muted-foreground">
                                Type
                            </span>
                            <SelectInput
                                value={filters.itemType === "" ? "all" : filters.itemType}
                                options={ITEM_TYPE_FILTER_OPTIONS}
                                onValueChange={(value) =>
                                    onFiltersChange({
                                        ...filters,
                                        itemType:
                                            value === "all"
                                                ? ""
                                                : (value as EquipmentFilters["itemType"]),
                                    })
                                }
                                placeholder="Filter by type"
                                startIcon={<Package size={13} />}
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-medium text-muted-foreground">
                                Condition
                            </span>
                            <SelectInput
                                value={filters.condition === "" ? "all" : filters.condition}
                                options={ITEM_CONDITION_FILTER_OPTIONS}
                                onValueChange={(value) =>
                                    onFiltersChange({
                                        ...filters,
                                        condition:
                                            value === "all"
                                                ? ""
                                                : (value as EquipmentFilters["condition"]),
                                    })
                                }
                                placeholder="Filter by condition"
                                startIcon={<ShieldCheck size={13} />}
                            />
                        </div>

                        <div className="flex flex-col justify-end">
                            <button
                                type="button"
                                onClick={onSearch}
                                className="btn-cta h-[38px] w-full whitespace-nowrap px-5 lg:w-auto"
                                aria-label="Apply filters"
                            >
                                <Search size={14} />
                                Search
                            </button>
                        </div>
                    </div>
                </div>

                <EquipmentTable
                    items={equipment}
                    isLoading={isLoading}
                    error={error}
                    canManage={canManage}
                    hasActiveFilters={hasActiveFilters}
                    onEdit={onEditClick}
                    onDelete={onDeleteClick}
                />
            </section>

            {dialogMode ? (
                <EquipmentFormDialog
                    mode={dialogMode}
                    form={form}
                    nameError={nameError}
                    quantityError={quantityError}
                    priceError={priceError}
                    apiError={apiError}
                    isPending={isMutating}
                    onFormChange={onFormChange}
                    onSubmit={onSubmit}
                    onClose={onCloseDialog}
                    onDismissError={onDismissError}
                />
            ) : null}

            {deletingItemName ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 py-6 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl">
                        <h2 className="text-lg font-semibold text-foreground">
                            Delete Equipment
                        </h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Delete {deletingItemName}? This removes it from the active inventory.
                        </p>
                        {apiError ? (
                            <div className="mt-4">
                                <AlertToast
                                    title={apiError}
                                    variant="error"
                                    onClose={onDismissError}
                                />
                            </div>
                        ) : null}
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={onCancelDelete}
                                className="btn-outline"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={onConfirmDelete}
                                disabled={isMutating}
                                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-destructive px-4 text-sm font-semibold text-destructive-foreground transition hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isMutating ? "Deleting..." : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {successMessage ? (
                <AlertToast title={successMessage} variant="success" onClose={onDismissSuccess} />
            ) : null}
        </div>
    );
}
