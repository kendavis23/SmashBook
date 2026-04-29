import { fetcher } from "../../../core/fetcher";
import type { ListAvailableTrainersParams, TrainerAvailableSummary, TrainerRead } from "./trainer.types";

export function listTrainersEndpoint(
    clubId: string,
    includeInactive?: boolean
): Promise<TrainerRead[]> {
    const query = new URLSearchParams({ club_id: clubId });
    if (includeInactive !== undefined) query.set("include_inactive", String(includeInactive));
    return fetcher<TrainerRead[]>(`/api/v1/trainers?${query.toString()}`);
}

export function listAvailableTrainersEndpoint(
    params: ListAvailableTrainersParams
): Promise<TrainerAvailableSummary[]> {
    const query = new URLSearchParams({
        club_id: params.clubId,
        date: params.date,
        start_time: params.startTime,
        end_time: params.endTime,
    });
    return fetcher<TrainerAvailableSummary[]>(`/api/v1/trainers/available?${query.toString()}`);
}
