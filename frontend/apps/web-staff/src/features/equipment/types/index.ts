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
    ball: "Ball",
    shoes: "Shoes",
    clothing: "Clothing",
    accessories: "Accessories",
    other: "Other",
};

export const ITEM_CONDITION_LABELS: Record<ItemCondition, string> = {
    new: "New",
    good: "Good",
    fair: "Fair",
    poor: "Poor",
};

export const ITEM_TYPE_OPTIONS: { value: ItemType; label: string }[] = [
    { value: "racket", label: ITEM_TYPE_LABELS.racket },
    { value: "ball", label: ITEM_TYPE_LABELS.ball },
    { value: "shoes", label: ITEM_TYPE_LABELS.shoes },
    { value: "clothing", label: ITEM_TYPE_LABELS.clothing },
    { value: "accessories", label: ITEM_TYPE_LABELS.accessories },
    { value: "other", label: ITEM_TYPE_LABELS.other },
];

export const ITEM_CONDITION_OPTIONS: { value: ItemCondition; label: string }[] = [
    { value: "new", label: ITEM_CONDITION_LABELS.new },
    { value: "good", label: ITEM_CONDITION_LABELS.good },
    { value: "fair", label: ITEM_CONDITION_LABELS.fair },
    { value: "poor", label: ITEM_CONDITION_LABELS.poor },
];

export const ITEM_TYPE_FILTER_OPTIONS: { value: string; label: string }[] = [
    { value: "all", label: "All types" },
    ...ITEM_TYPE_OPTIONS,
];

export const ITEM_CONDITION_FILTER_OPTIONS: { value: string; label: string }[] = [
    { value: "all", label: "All conditions" },
    ...ITEM_CONDITION_OPTIONS,
];
