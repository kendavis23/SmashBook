import type { UUID } from "../common";
import type { ItemType, ItemCondition } from "../../share/equipment/equipment.types";

export type { UUID };
export type {
    ItemType,
    ItemCondition,
    EquipmentInventoryItemResponse,
} from "../../share/equipment/equipment.types";

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
