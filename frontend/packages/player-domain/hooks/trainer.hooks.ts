import { useQuery } from "@tanstack/react-query";
import { listTrainersEndpoint } from "@repo/api-client/modules/share";
import type { Trainer } from "../models";

const trainerKeys = {
    all: (clubId: string) => ["trainers", clubId] as const,
};

export function useListTrainers(clubId: string, includeInactive?: boolean) {
    return useQuery({
        queryKey: trainerKeys.all(clubId),
        queryFn: (): Promise<Trainer[]> => listTrainersEndpoint(clubId, includeInactive),
        enabled: Boolean(clubId),
    });
}
