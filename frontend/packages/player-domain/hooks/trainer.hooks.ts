import { useQuery } from "@tanstack/react-query";
import {
    listTrainersEndpoint,
    listAvailableTrainersEndpoint,
} from "@repo/api-client/modules/share";
import type { Trainer, TrainerAvailableSummary, ListAvailableTrainersParams } from "../models";

const trainerKeys = {
    all: (clubId: string) => ["trainers", clubId] as const,
    available: (params: ListAvailableTrainersParams) =>
        [
            "trainers",
            "available",
            params.clubId,
            params.date,
            params.startTime,
            params.endTime,
        ] as const,
};

export function useListTrainers(clubId: string, includeInactive?: boolean) {
    return useQuery({
        queryKey: trainerKeys.all(clubId),
        queryFn: (): Promise<Trainer[]> => listTrainersEndpoint(clubId, includeInactive),
        enabled: Boolean(clubId),
    });
}

// ---------------------------------------------------------------------------
// useListAvailableTrainers — GET /api/v1/trainers/available
// ---------------------------------------------------------------------------

export function useListAvailableTrainers(params: ListAvailableTrainersParams) {
    return useQuery({
        queryKey: trainerKeys.available(params),
        queryFn: (): Promise<TrainerAvailableSummary[]> => listAvailableTrainersEndpoint(params),
        enabled: Boolean(params.clubId && params.date && params.startTime && params.endTime),
    });
}
