import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
    listEquipmentEndpoint,
    createEquipmentEndpoint,
    updateEquipmentEndpoint,
    retireEquipmentEndpoint,
} from "@repo/api-client/modules/staff";
import type { EquipmentItem, EquipmentInput, EquipmentUpdateInput } from "../models";

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const equipmentKeys = {
    all: (clubId: string) => ["equipment", clubId] as const,
    detail: (clubId: string, itemId: string) => ["equipment", clubId, itemId] as const,
};

// ---------------------------------------------------------------------------
// useListEquipment — GET /api/v1/equipment?club_id=:clubId
// ---------------------------------------------------------------------------

export function useListEquipment(clubId: string) {
    return useQuery({
        queryKey: equipmentKeys.all(clubId),
        queryFn: (): Promise<EquipmentItem[]> => listEquipmentEndpoint(clubId),
        enabled: Boolean(clubId),
    });
}

// ---------------------------------------------------------------------------
// useCreateEquipment — POST /api/v1/equipment?club_id=:clubId
// ---------------------------------------------------------------------------

export function useCreateEquipment(clubId: string) {
    const queryClient = useQueryClient();
    return useMutation<EquipmentItem, Error, EquipmentInput>({
        mutationFn: (data: EquipmentInput) => createEquipmentEndpoint(clubId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: equipmentKeys.all(clubId) });
        },
    });
}

// ---------------------------------------------------------------------------
// useUpdateEquipment — PATCH /api/v1/equipment/:itemId?club_id=:clubId
// ---------------------------------------------------------------------------

export function useUpdateEquipment(clubId: string, itemId: string) {
    const queryClient = useQueryClient();
    return useMutation<EquipmentItem, Error, EquipmentUpdateInput>({
        mutationFn: (data: EquipmentUpdateInput) => updateEquipmentEndpoint(itemId, clubId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: equipmentKeys.detail(clubId, itemId) });
            queryClient.invalidateQueries({ queryKey: equipmentKeys.all(clubId) });
        },
    });
}

// ---------------------------------------------------------------------------
// useRetireEquipment — DELETE /api/v1/equipment/:itemId?club_id=:clubId
// ---------------------------------------------------------------------------

export function useRetireEquipment(clubId: string) {
    const queryClient = useQueryClient();
    return useMutation<void, Error, string>({
        mutationFn: (itemId: string) => retireEquipmentEndpoint(itemId, clubId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: equipmentKeys.all(clubId) });
        },
    });
}
