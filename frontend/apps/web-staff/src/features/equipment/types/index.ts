import type { ItemCondition, ItemType } from "@repo/staff-domain/models";

export type {
    EquipmentItem,
    EquipmentInput,
    EquipmentUpdateInput,
    ItemCondition,
    ItemType,
} from "@repo/staff-domain/models";

export type EquipmentDialogMode = "create" | "edit";

export type EquipmentFormState = {
    itemType: ItemType;
    name: string;
    quantityTotal: string;
    rentalPrice: string;
    condition: ItemCondition;
    notes: string;
};

export type EquipmentFilters = {
    itemType: "" | ItemType;
    condition: "" | ItemCondition;
};

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
    racket: "Racket",
    ball_tube: "Ball Tube",
    other: "Other",
};

export const ITEM_CONDITION_LABELS: Record<ItemCondition, string> = {
    good: "Good",
    fair: "Fair",
    damaged: "damaged",
    retired: "retired",
};

export const ITEM_TYPE_OPTIONS: { value: ItemType; label: string }[] = [
    { value: "racket", label: ITEM_TYPE_LABELS.racket },
    { value: "ball_tube", label: ITEM_TYPE_LABELS.ball_tube },
    { value: "other", label: ITEM_TYPE_LABELS.other },
];

export const ITEM_CONDITION_OPTIONS: { value: ItemCondition; label: string }[] = [
    { value: "good", label: ITEM_CONDITION_LABELS.good },
    { value: "fair", label: ITEM_CONDITION_LABELS.fair },
    { value: "damaged", label: ITEM_CONDITION_LABELS.damaged },
    { value: "retired", label: ITEM_CONDITION_LABELS.retired },
];

export const ITEM_TYPE_FILTER_OPTIONS: { value: string; label: string }[] = [
    { value: "all", label: "All types" },
    ...ITEM_TYPE_OPTIONS,
];

export const ITEM_CONDITION_FILTER_OPTIONS: { value: string; label: string }[] = [
    { value: "all", label: "All conditions" },
    ...ITEM_CONDITION_OPTIONS,
];
