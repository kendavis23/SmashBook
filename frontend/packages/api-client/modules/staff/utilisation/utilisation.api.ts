import { fetcher } from "../../../core/fetcher";
import type {
    ClubDailyUtilisation,
    ClubCourtsUtilisation,
    ClubUtilisationHeatmap,
    UtilisationDateRangeParams,
} from "./utilisation.types";

function buildDateQuery(params: UtilisationDateRangeParams): string {
    const query = new URLSearchParams();
    if (params.date_from) query.set("date_from", params.date_from);
    if (params.date_to) query.set("date_to", params.date_to);
    const qs = query.toString();
    return qs ? `?${qs}` : "";
}

export function getClubDailyUtilisationEndpoint(
    clubId: string,
    params: UtilisationDateRangeParams = {}
): Promise<ClubDailyUtilisation> {
    return fetcher<ClubDailyUtilisation>(
        `/api/v1/analytics/utilisation/clubs/${clubId}/daily${buildDateQuery(params)}`
    );
}

export function getClubCourtsUtilisationEndpoint(
    clubId: string,
    params: UtilisationDateRangeParams = {}
): Promise<ClubCourtsUtilisation> {
    return fetcher<ClubCourtsUtilisation>(
        `/api/v1/analytics/utilisation/clubs/${clubId}/courts${buildDateQuery(params)}`
    );
}

export function getClubUtilisationHeatmapEndpoint(
    clubId: string,
    params: UtilisationDateRangeParams = {}
): Promise<ClubUtilisationHeatmap> {
    return fetcher<ClubUtilisationHeatmap>(
        `/api/v1/analytics/utilisation/clubs/${clubId}/heatmap${buildDateQuery(params)}`
    );
}
