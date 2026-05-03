type UUID = string;

export type ItemType = "racket" | "ball_tube" | "other";

export type ItemCondition = "good" | "fair" | "damaged" | "retired";

export interface EquipmentInventoryItemResponse {
    id: UUID;
    item_type: ItemType;
    name: string;
    rental_price: number;
    quantity_total: number;
    quantity_available: number;
    condition: ItemCondition;
    notes: string | null;
}
