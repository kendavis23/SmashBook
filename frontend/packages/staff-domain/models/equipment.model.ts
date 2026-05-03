export type UUID = string;

export type ItemType = "racket" | "ball_tube" | "other";

export type ItemCondition = "good" | "fair" | "damaged" | "retired";

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

export interface EquipmentInput {
    item_type: ItemType;
    name: string;
    quantity_total: number;
    rental_price: number;
    condition?: ItemCondition;
    notes?: string | null;
}

export interface EquipmentUpdateInput {
    name?: string;
    rental_price?: number;
    condition?: ItemCondition;
    notes?: string | null;
    quantity_total?: number;
}
