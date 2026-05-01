import { fetcher } from "../../../core/fetcher";
import type {
    EquipmentCreate,
    EquipmentUpdate,
    EquipmentInventoryItemResponse,
} from "./equipment.types";

const JSON_HEADERS = { "Content-Type": "application/json" };

export function createEquipmentEndpoint(
    clubId: string,
    data: EquipmentCreate
): Promise<EquipmentInventoryItemResponse> {
    return fetcher<EquipmentInventoryItemResponse>(`/api/v1/equipment?club_id=${clubId}`, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(data),
    });
}

export function updateEquipmentEndpoint(
    itemId: string,
    clubId: string,
    data: EquipmentUpdate
): Promise<EquipmentInventoryItemResponse> {
    return fetcher<EquipmentInventoryItemResponse>(
        `/api/v1/equipment/${itemId}?club_id=${clubId}`,
        {
            method: "PATCH",
            headers: JSON_HEADERS,
            body: JSON.stringify(data),
        }
    );
}

export function retireEquipmentEndpoint(itemId: string, clubId: string): Promise<void> {
    return fetcher<void>(`/api/v1/equipment/${itemId}?club_id=${clubId}`, {
        method: "DELETE",
    });
}
