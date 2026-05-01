import type { FormEvent, JSX } from "react";
import { AlertToast, NumberInput, SelectInput } from "@repo/ui";
import { Package, Save, X } from "lucide-react";
import {
    ITEM_CONDITION_OPTIONS,
    ITEM_TYPE_OPTIONS,
    type EquipmentDialogMode,
    type EquipmentFormState,
    type ItemCondition,
    type ItemType,
} from "../types";

const fieldCls =
    "input-base w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground " +
    "placeholder:text-muted-foreground transition focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta-ring/30";

const labelCls = "mb-1 block text-sm font-medium text-foreground";

type Props = {
    mode: EquipmentDialogMode;
    form: EquipmentFormState;
    nameError: string;
    quantityError: string;
    priceError: string;
    apiError: string;
    isPending: boolean;
    onFormChange: (patch: Partial<EquipmentFormState>) => void;
    onSubmit: (event: FormEvent) => void;
    onClose: () => void;
    onDismissError: () => void;
};

export default function EquipmentFormDialog({
    mode,
    form,
    nameError,
    quantityError,
    priceError,
    apiError,
    isPending,
    onFormChange,
    onSubmit,
    onClose,
    onDismissError,
}: Props): JSX.Element {
    const title = mode === "create" ? "Add Equipment" : "Edit Equipment";
    const submitLabel = mode === "create" ? "Create Equipment" : "Save Changes";
    const pendingLabel = mode === "create" ? "Creating..." : "Saving...";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 py-6 backdrop-blur-sm">
            <div className="flex h-[min(42rem,calc(100vh-3rem))] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-border bg-card shadow-xl">
                <form onSubmit={onSubmit} noValidate className="flex h-full flex-col">
                    <div className="shrink-0 border-b border-border px-6 pb-5 pt-6">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                                    <Package size={18} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-foreground">
                                        {title}
                                    </h2>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        Track inventory quantity, rental price, and condition.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Close modal"
                                className="shrink-0 rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                        {apiError ? (
                            <div className="mb-4">
                                <AlertToast
                                    title={apiError}
                                    variant="error"
                                    onClose={onDismissError}
                                />
                            </div>
                        ) : null}

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <label htmlFor="equipment-name" className={labelCls}>
                                    Name <span className="text-destructive">*</span>
                                </label>
                                <input
                                    id="equipment-name"
                                    type="text"
                                    className={`${fieldCls} ${nameError ? "border-destructive focus:border-destructive focus:ring-destructive/20" : ""}`}
                                    placeholder="e.g. Pro racket"
                                    value={form.name}
                                    onChange={(event) =>
                                        onFormChange({ name: event.target.value })
                                    }
                                />
                                {nameError ? (
                                    <p className="mt-1 text-xs text-destructive">{nameError}</p>
                                ) : null}
                            </div>

                            <div>
                                <label htmlFor="equipment-type" className={labelCls}>
                                    Type
                                </label>
                                <SelectInput
                                    name="equipment-type"
                                    value={form.itemType}
                                    options={ITEM_TYPE_OPTIONS}
                                    onValueChange={(value) =>
                                        onFormChange({ itemType: value as ItemType })
                                    }
                                    placeholder="Select type"
                                    disabled={mode === "edit"}
                                />
                            </div>

                            <div>
                                <label htmlFor="equipment-condition" className={labelCls}>
                                    Condition
                                </label>
                                <SelectInput
                                    name="equipment-condition"
                                    value={form.condition}
                                    options={ITEM_CONDITION_OPTIONS}
                                    onValueChange={(value) =>
                                        onFormChange({ condition: value as ItemCondition })
                                    }
                                    placeholder="Select condition"
                                />
                            </div>

                            <div>
                                <label htmlFor="equipment-quantity" className={labelCls}>
                                    Total Quantity <span className="text-destructive">*</span>
                                </label>
                                <NumberInput
                                    id="equipment-quantity"
                                    min="0"
                                    step="1"
                                    className={`${fieldCls} ${quantityError ? "border-destructive focus:border-destructive focus:ring-destructive/20" : ""}`}
                                    value={form.quantityTotal}
                                    onChange={(event) =>
                                        onFormChange({ quantityTotal: event.target.value })
                                    }
                                />
                                {quantityError ? (
                                    <p className="mt-1 text-xs text-destructive">{quantityError}</p>
                                ) : null}
                            </div>

                            <div>
                                <label htmlFor="equipment-price" className={labelCls}>
                                    Rental Price <span className="text-destructive">*</span>
                                </label>
                                <NumberInput
                                    id="equipment-price"
                                    min="0"
                                    step="0.01"
                                    className={`${fieldCls} ${priceError ? "border-destructive focus:border-destructive focus:ring-destructive/20" : ""}`}
                                    value={form.rentalPrice}
                                    onChange={(event) =>
                                        onFormChange({ rentalPrice: event.target.value })
                                    }
                                />
                                {priceError ? (
                                    <p className="mt-1 text-xs text-destructive">{priceError}</p>
                                ) : null}
                            </div>

                            <div className="sm:col-span-2">
                                <label htmlFor="equipment-notes" className={labelCls}>
                                    Notes
                                </label>
                                <textarea
                                    id="equipment-notes"
                                    className={`${fieldCls} min-h-24 resize-y`}
                                    placeholder="Optional handling or rental notes"
                                    value={form.notes}
                                    onChange={(event) =>
                                        onFormChange({ notes: event.target.value })
                                    }
                                />
                            </div>
                        </div>
                    </div>

                    <div className="shrink-0 flex items-center justify-end gap-3 border-t border-border px-6 py-4">
                        <button type="button" onClick={onClose} className="btn-outline">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isPending}
                            className="btn-cta flex items-center gap-2"
                        >
                            <Save size={14} />
                            {isPending ? pendingLabel : submitLabel}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
