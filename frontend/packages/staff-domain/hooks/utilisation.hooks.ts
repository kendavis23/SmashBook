import { useQuery } from "@tanstack/react-query";
import {
    getClubDailyUtilisationEndpoint,
    getClubCourtsUtilisationEndpoint,
    getClubUtilisationHeatmapEndpoint,
} from "@repo/api-client/modules/staff";
import type {
    ClubDailyUtilisation,
    ClubCourtsUtilisation,
    ClubUtilisationHeatmap,
    UtilisationDateRange,
} from "../models";

const utilisationKeys = {
    daily: (clubId: string, range?: UtilisationDateRange) =>
        ["utilisation", clubId, "daily", range] as const,
    courts: (clubId: string, range?: UtilisationDateRange) =>
        ["utilisation", clubId, "courts", range] as const,
    heatmap: (clubId: string, range?: UtilisationDateRange) =>
        ["utilisation", clubId, "heatmap", range] as const,
};

export function useClubDailyUtilisation(clubId: string, range: UtilisationDateRange = {}) {
    return useQuery({
        queryKey: utilisationKeys.daily(clubId, range),
        queryFn: (): Promise<ClubDailyUtilisation> =>
            getClubDailyUtilisationEndpoint(clubId, {
                date_from: range.dateFrom,
                date_to: range.dateTo,
            }),
        enabled: Boolean(clubId),
    });
}

export function useClubCourtsUtilisation(clubId: string, range: UtilisationDateRange = {}) {
    return useQuery({
        queryKey: utilisationKeys.courts(clubId, range),
        queryFn: (): Promise<ClubCourtsUtilisation> =>
            getClubCourtsUtilisationEndpoint(clubId, {
                date_from: range.dateFrom,
                date_to: range.dateTo,
            }),
        enabled: Boolean(clubId),
    });
}

export function useClubUtilisationHeatmap(clubId: string, range: UtilisationDateRange = {}) {
    return useQuery({
        queryKey: utilisationKeys.heatmap(clubId, range),
        queryFn: (): Promise<ClubUtilisationHeatmap> =>
            getClubUtilisationHeatmapEndpoint(clubId, {
                date_from: range.dateFrom,
                date_to: range.dateTo,
            }),
        enabled: Boolean(clubId),
    });
}
