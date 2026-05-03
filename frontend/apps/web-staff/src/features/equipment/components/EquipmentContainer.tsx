import type { FormEvent, JSX } from "react";
import { useCallback, useMemo, useState } from "react";
import {
    useCreateEquipment,
    useListEquipment,
    useRetireEquipment,
    useUpdateEquipment,
} from "../hooks";
import { canManageEquipment, useClubAccess } from "../store";
import type {
    EquipmentDialogMode,
    EquipmentFilters,
    EquipmentFormState,
    EquipmentInput,
    EquipmentItem,
    EquipmentUpdateInput,
} from "../types";
import EquipmentView from "./EquipmentView";

function createDefaultForm(): EquipmentFormState {
    return {
        itemType: "racket",
        name: "",
        quantityTotal: "",
        rentalPrice: "",
        condition: "good",
        notes: "",
    };
}

function createFormFromItem(item: EquipmentItem): EquipmentFormState {
    return {
        itemType: item.item_type,
        name: item.name,
        quantityTotal: String(item.quantity_total),
        rentalPrice: String(item.rental_price),
        condition: item.condition,
        notes: item.notes ?? "",
    };
}

function createDefaultFilters(): EquipmentFilters {
    return {
        itemType: "",
        condition: "",
    };
}

export default function EquipmentContainer(): JSX.Element {
    const { clubId, role } = useClubAccess();
    const canManage = canManageEquipment(role);
    const { data = [], isLoading, error, refetch } = useListEquipment(clubId ?? "");

    const [dialogMode, setDialogMode] = useState<EquipmentDialogMode | null>(null);
    const [editingItem, setEditingItem] = useState<EquipmentItem | null>(null);
    const [deletingItem, setDeletingItem] = useState<EquipmentItem | null>(null);
    const [form, setForm] = useState<EquipmentFormState>(createDefaultForm);
    const [nameError, setNameError] = useState("");
    const [quantityError, setQuantityError] = useState("");
    const [priceError, setPriceError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [filters, setFilters] = useState<EquipmentFilters>(createDefaultFilters);
    const [appliedFilters, setAppliedFilters] = useState<EquipmentFilters>(createDefaultFilters);

    const createEquipment = useCreateEquipment(clubId ?? "");
    const updateEquipment = useUpdateEquipment(clubId ?? "", editingItem?.id ?? "");
    const retireEquipment = useRetireEquipment(clubId ?? "");

    const activeMutation =
        dialogMode === "create" ? createEquipment : dialogMode === "edit" ? updateEquipment : null;
    const apiError =
        (activeMutation?.error as Error | null)?.message ??
        (retireEquipment.error as Error | null)?.message ??
        "";
    const isMutating =
        createEquipment.isPending || updateEquipment.isPending || retireEquipment.isPending;
    const equipment = data as EquipmentItem[];
    const filteredEquipment = useMemo(
        () =>
            equipment.filter((item) => {
                if (appliedFilters.itemType && item.item_type !== appliedFilters.itemType) {
                    return false;
                }

                if (appliedFilters.condition && item.condition !== appliedFilters.condition) {
                    return false;
                }

                return true;
            }),
        [appliedFilters.condition, appliedFilters.itemType, equipment]
    );
    const hasActiveFilters = Boolean(appliedFilters.itemType || appliedFilters.condition);

    const resetValidation = useCallback((): void => {
        setNameError("");
        setQuantityError("");
        setPriceError("");
    }, []);

    const handleCreateClick = useCallback((): void => {
        resetValidation();
        createEquipment.reset();
        setEditingItem(null);
        setForm(createDefaultForm());
        setDialogMode("create");
    }, [createEquipment, resetValidation]);

    const handleEditClick = useCallback(
        (item: EquipmentItem): void => {
            resetValidation();
            updateEquipment.reset();
            setEditingItem(item);
            setForm(createFormFromItem(item));
            setDialogMode("edit");
        },
        [resetValidation, updateEquipment]
    );

    const handleCloseDialog = useCallback((): void => {
        setDialogMode(null);
        setEditingItem(null);
        resetValidation();
        createEquipment.reset();
        updateEquipment.reset();
    }, [createEquipment, resetValidation, updateEquipment]);

    const handleFormChange = useCallback((patch: Partial<EquipmentFormState>): void => {
        setForm((prev) => ({ ...prev, ...patch }));
        if (patch.name !== undefined) setNameError("");
        if (patch.quantityTotal !== undefined) setQuantityError("");
        if (patch.rentalPrice !== undefined) setPriceError("");
    }, []);

    const validate = useCallback((): boolean => {
        let valid = true;
        const quantity = Number(form.quantityTotal);
        const price = Number(form.rentalPrice);

        if (!form.name.trim()) {
            setNameError("Equipment name is required.");
            valid = false;
        }

        if (!Number.isInteger(quantity) || quantity < 0) {
            setQuantityError("Quantity must be a whole number of 0 or more.");
            valid = false;
        }

        if (!Number.isFinite(price) || price < 0) {
            setPriceError("Rental price must be 0 or more.");
            valid = false;
        }

        return valid;
    }, [form]);

    const handleSubmit = useCallback(
        (event: FormEvent): void => {
            event.preventDefault();
            if (!canManage || !clubId || !dialogMode || !validate()) return;

            const notes = form.notes.trim() ? form.notes.trim() : null;
            const basePayload = {
                name: form.name.trim(),
                quantity_total: Number(form.quantityTotal),
                rental_price: Number(form.rentalPrice),
                condition: form.condition,
                notes,
            };

            if (dialogMode === "create") {
                const payload: EquipmentInput = {
                    ...basePayload,
                    item_type: form.itemType,
                };

                createEquipment.mutate(payload, {
                    onSuccess: () => {
                        setSuccessMessage("Equipment created.");
                        handleCloseDialog();
                    },
                });
                return;
            }

            if (!editingItem) return;

            const payload: EquipmentUpdateInput = basePayload;
            updateEquipment.mutate(payload, {
                onSuccess: () => {
                    setSuccessMessage("Equipment updated.");
                    handleCloseDialog();
                },
            });
        },
        [
            canManage,
            clubId,
            createEquipment,
            dialogMode,
            editingItem,
            form,
            handleCloseDialog,
            updateEquipment,
            validate,
        ]
    );

    const handleDeleteClick = useCallback(
        (item: EquipmentItem): void => {
            retireEquipment.reset();
            setDeletingItem(item);
        },
        [retireEquipment]
    );

    const handleConfirmDelete = useCallback((): void => {
        if (!canManage || !deletingItem) return;

        retireEquipment.mutate(deletingItem.id, {
            onSuccess: () => {
                setSuccessMessage("Equipment deleted.");
                setDeletingItem(null);
            },
        });
    }, [canManage, deletingItem, retireEquipment]);

    const handleRefresh = useCallback((): void => {
        void refetch();
    }, [refetch]);

    const handleSearch = useCallback((): void => {
        setAppliedFilters(filters);
    }, [filters]);

    const handleDismissError = useCallback((): void => {
        createEquipment.reset();
        updateEquipment.reset();
        retireEquipment.reset();
    }, [createEquipment, retireEquipment, updateEquipment]);

    return (
        <EquipmentView
            equipment={filteredEquipment}
            totalEquipmentCount={equipment.length}
            isLoading={isLoading}
            error={error as Error | null}
            canManage={canManage}
            filters={filters}
            hasActiveFilters={hasActiveFilters}
            dialogMode={dialogMode}
            form={form}
            nameError={nameError}
            quantityError={quantityError}
            priceError={priceError}
            apiError={apiError}
            isMutating={isMutating}
            successMessage={successMessage}
            deletingItemName={deletingItem?.name ?? ""}
            onCreateClick={handleCreateClick}
            onEditClick={handleEditClick}
            onDeleteClick={handleDeleteClick}
            onConfirmDelete={handleConfirmDelete}
            onCancelDelete={() => setDeletingItem(null)}
            onRefresh={handleRefresh}
            onFiltersChange={setFilters}
            onSearch={handleSearch}
            onFormChange={handleFormChange}
            onSubmit={handleSubmit}
            onCloseDialog={handleCloseDialog}
            onDismissError={handleDismissError}
            onDismissSuccess={() => setSuccessMessage("")}
        />
    );
}
