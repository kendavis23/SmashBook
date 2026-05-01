import { useQuery } from "@tanstack/react-query";
import { listEquipmentEndpoint } from "@repo/api-client/modules/share";
import type { EquipmentItem } from "../models";

const equipmentKeys = {
    all: (clubId: string) => ["equipment", clubId] as const,
};

export function useListEquipment(clubId: string) {
    return useQuery({
        queryKey: equipmentKeys.all(clubId),
        queryFn: (): Promise<EquipmentItem[]> => listEquipmentEndpoint(clubId),
        enabled: Boolean(clubId),
    });
}
