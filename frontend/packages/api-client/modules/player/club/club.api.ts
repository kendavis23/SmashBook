import { fetcher } from "../../../core/fetcher";
import type { ClubAvailabilityResponse, GetClubAvailabilityParams } from "./club.types";

export function getClubAvailabilityEndpoint(
    clubId: string,
    params: GetClubAvailabilityParams
): Promise<ClubAvailabilityResponse> {
    const query = new URLSearchParams({ start_date: params.start_date });
    if (params.end_date) query.set("end_date", params.end_date);
    if (params.surface) query.set("surface", params.surface);
    if (params.from_time) query.set("from_time", params.from_time);
    if (params.to_time) query.set("to_time", params.to_time);
    if (params.skill_level != null) query.set("skill_level", String(params.skill_level));
    return fetcher<ClubAvailabilityResponse>(
        `/api/v1/clubs/${clubId}/availability?${query.toString()}`
    );
}
