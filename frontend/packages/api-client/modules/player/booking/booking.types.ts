import type { InviteStatus } from "../../share/booking/booking.types";
import type { ItemType } from "../../share/equipment/equipment.types";

export type { UUID, InviteStatus, BookingResponse } from "../../share/booking/booking.types";

export interface InviteRespondRequest {
    action: InviteStatus;
}

export type { ItemType, ItemCondition } from "../../share/equipment/equipment.types";

export interface EquipmentRentalRequest {
    equipment_id: string;
    quantity: number;
}

export interface EquipmentRentalResponse {
    id: string;
    booking_id: string;
    equipment_id: string;
    equipment_name: string;
    item_type: ItemType;
    quantity: number;
    charge: number;
}
