import type { UUID } from "../common";
export type { UUID };

export type ItemType = "racket" | "ball" | "shoes" | "clothing" | "accessories" | "other";

export type ItemCondition = "new" | "good" | "fair" | "poor";

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

export interface EquipmentCreate {
    item_type: ItemType;
    name: string;
    quantity_total: number;
    rental_price: number;
    condition?: ItemCondition;
    notes?: string | null;
}

export interface EquipmentUpdate {
    name?: string;
    rental_price?: number;
    condition?: ItemCondition;
    notes?: string | null;
    quantity_total?: number;
}
