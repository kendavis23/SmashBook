import { fetcher } from "../../../core/fetcher";
import type { TrainerRead } from "./trainer.types";

export function listTrainersEndpoint(
    clubId: string,
    includeInactive?: boolean
): Promise<TrainerRead[]> {
    const query = new URLSearchParams({ club_id: clubId });
    if (includeInactive !== undefined) query.set("include_inactive", String(includeInactive));
    return fetcher<TrainerRead[]>(`/api/v1/trainers?${query.toString()}`);
}
