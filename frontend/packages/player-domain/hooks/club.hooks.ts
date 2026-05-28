import { useQuery } from "@tanstack/react-query";
import { getClubAvailabilityEndpoint } from "@repo/api-client/modules/player";
import type { ClubAvailability, ClubAvailabilityParams } from "../models";

const clubKeys = {
    availability: (clubId: string, params: ClubAvailabilityParams) =>
        ["club", clubId, "availability", params] as const,
};

export function useGetClubAvailability(clubId: string, params: ClubAvailabilityParams) {
    return useQuery({
        queryKey: clubKeys.availability(clubId, params),
        queryFn: (): Promise<ClubAvailability> => getClubAvailabilityEndpoint(clubId, params),
        enabled: Boolean(clubId) && Boolean(params.start_date),
    });
}
