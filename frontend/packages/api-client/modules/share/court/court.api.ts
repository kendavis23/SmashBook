import { fetcher } from "../../../core/fetcher";
import type { CourtListParams, CourtResponse, CourtAvailabilityResponse } from "./court.types";

export function listCourtsEndpoint(params: CourtListParams): Promise<CourtResponse[]> {
    const query = new URLSearchParams();
    if (params.club_id) query.set("club_id", params.club_id);
    if (params.surface_type) query.set("surface_type", params.surface_type);
    if (params.date) query.set("date", params.date);
    if (params.time_from) query.set("time_from", params.time_from);
    if (params.time_to) query.set("time_to", params.time_to);
    const qs = query.toString();
    return fetcher<CourtResponse[]>(`/api/v1/courts${qs ? `?${qs}` : ""}`);
}

export function getCourtAvailabilityEndpoint(
    courtId: string,
    date: string
): Promise<CourtAvailabilityResponse> {
    return fetcher<CourtAvailabilityResponse>(
        `/api/v1/courts/${courtId}/availability?date=${date}`
    );
}
