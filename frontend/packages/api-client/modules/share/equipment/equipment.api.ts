import { fetcher } from "../../../core/fetcher";
import type { EquipmentInventoryItemResponse } from "./equipment.types";

export function listEquipmentEndpoint(clubId: string): Promise<EquipmentInventoryItemResponse[]> {
    return fetcher<EquipmentInventoryItemResponse[]>(`/api/v1/equipment?club_id=${clubId}`);
}
