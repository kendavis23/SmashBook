export type UUID = string;

export type ItemType = "racket" | "ball" | "shoes" | "clothing" | "accessories" | "other";

export type ItemCondition = "new" | "good" | "fair" | "poor";

export interface EquipmentItem {
    id: UUID;
    item_type: ItemType;
    name: string;
    rental_price: number;
    quantity_total: number;
    quantity_available: number;
    condition: ItemCondition;
    notes: string | null;
}
