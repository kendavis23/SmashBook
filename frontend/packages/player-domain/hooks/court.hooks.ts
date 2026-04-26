import { useQuery } from "@tanstack/react-query";
import { listCourtsEndpoint, getCourtAvailabilityEndpoint } from "@repo/api-client/modules/share";
import type { Court, CourtAvailability, SurfaceType } from "../models";

const courtKeys = {
    all: (clubId: string) => ["courts", clubId] as const,
    availability: (courtId: string, date: string) =>
        ["courts", courtId, "availability", date] as const,
};

export interface ListCourtsFilters {
    surfaceType?: SurfaceType;
    date?: string;
    timeFrom?: string;
    timeTo?: string;
}

export function useListCourts(clubId: string, filters?: ListCourtsFilters) {
    return useQuery({
        queryKey: [...courtKeys.all(clubId), filters] as const,
        queryFn: (): Promise<Court[]> =>
            listCourtsEndpoint({
                club_id: clubId,
                surface_type: filters?.surfaceType,
                date: filters?.date,
                time_from: filters?.timeFrom,
                time_to: filters?.timeTo,
            }),
        enabled: Boolean(clubId),
    });
}

export function useGetCourtAvailability(courtId: string, date: string) {
    return useQuery({
        queryKey: courtKeys.availability(courtId, date),
        queryFn: (): Promise<CourtAvailability> => getCourtAvailabilityEndpoint(courtId, date),
        enabled: Boolean(courtId) && Boolean(date),
        gcTime: 0,
        staleTime: 0,
    });
}
