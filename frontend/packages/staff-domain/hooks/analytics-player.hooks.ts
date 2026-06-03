import { useQuery } from "@tanstack/react-query";
import {
    getPlayerValueLeaderboardEndpoint,
    getMostActivePlayersEndpoint,
    getInactiveMembersEndpoint,
    getPlayerValueByGroupEndpoint,
    getActivePlayersKpiEndpoint,
    getActivePlayersTimeseriesEndpoint,
    getSignupsTimeseriesEndpoint,
} from "@repo/api-client/modules/staff";
import type {
    PlayerValueLeaderboard,
    PlayerActivityLeaderboard,
    InactiveMembersReport,
    GroupValueReport,
    ActivePlayersKpi,
    ActivePlayersTimeseries,
    SignupsTimeseries,
    PlayerValueParams,
    MostActiveParams,
    InactiveMembersParams,
    GroupValueParams,
    ActivePlayersKpiParams,
    PlayerFlowTimeseriesParams,
} from "../models";

const analyticsPlayerKeys = {
    value: (clubId: string, params?: PlayerValueParams) =>
        ["analytics-player", clubId, "value", params] as const,
    mostActive: (clubId: string, params?: MostActiveParams) =>
        ["analytics-player", clubId, "most-active", params] as const,
    inactiveMembers: (clubId: string, params?: InactiveMembersParams) =>
        ["analytics-player", clubId, "inactive-members", params] as const,
    valueByGroup: (clubId: string, params?: GroupValueParams) =>
        ["analytics-player", clubId, "value-by-group", params] as const,
    activeKpi: (clubId: string, params?: ActivePlayersKpiParams) =>
        ["analytics-player", clubId, "active-kpi", params] as const,
    activeTimeseries: (clubId: string, params?: PlayerFlowTimeseriesParams) =>
        ["analytics-player", clubId, "active-timeseries", params] as const,
    signups: (clubId: string, params?: PlayerFlowTimeseriesParams) =>
        ["analytics-player", clubId, "signups", params] as const,
};

export function usePlayerValueLeaderboard(clubId: string, params: PlayerValueParams = {}) {
    return useQuery({
        queryKey: analyticsPlayerKeys.value(clubId, params),
        queryFn: (): Promise<PlayerValueLeaderboard> =>
            getPlayerValueLeaderboardEndpoint(clubId, params),
        enabled: Boolean(clubId),
    });
}

export function useMostActivePlayers(clubId: string, params: MostActiveParams = {}) {
    return useQuery({
        queryKey: analyticsPlayerKeys.mostActive(clubId, params),
        queryFn: (): Promise<PlayerActivityLeaderboard> =>
            getMostActivePlayersEndpoint(clubId, params),
        enabled: Boolean(clubId),
    });
}

export function useInactiveMembers(clubId: string, params: InactiveMembersParams = {}) {
    return useQuery({
        queryKey: analyticsPlayerKeys.inactiveMembers(clubId, params),
        queryFn: (): Promise<InactiveMembersReport> => getInactiveMembersEndpoint(clubId, params),
        enabled: Boolean(clubId),
    });
}

export function usePlayerValueByGroup(clubId: string, params: GroupValueParams = {}) {
    return useQuery({
        queryKey: analyticsPlayerKeys.valueByGroup(clubId, params),
        queryFn: (): Promise<GroupValueReport> => getPlayerValueByGroupEndpoint(clubId, params),
        enabled: Boolean(clubId),
    });
}

export function useActivePlayersKpi(clubId: string, params: ActivePlayersKpiParams = {}) {
    return useQuery({
        queryKey: analyticsPlayerKeys.activeKpi(clubId, params),
        queryFn: (): Promise<ActivePlayersKpi> => getActivePlayersKpiEndpoint(clubId, params),
        enabled: Boolean(clubId),
    });
}

export function useActivePlayersTimeseries(
    clubId: string,
    params: PlayerFlowTimeseriesParams = {}
) {
    return useQuery({
        queryKey: analyticsPlayerKeys.activeTimeseries(clubId, params),
        queryFn: (): Promise<ActivePlayersTimeseries> =>
            getActivePlayersTimeseriesEndpoint(clubId, params),
        enabled: Boolean(clubId),
    });
}

export function useSignupsTimeseries(clubId: string, params: PlayerFlowTimeseriesParams = {}) {
    return useQuery({
        queryKey: analyticsPlayerKeys.signups(clubId, params),
        queryFn: (): Promise<SignupsTimeseries> => getSignupsTimeseriesEndpoint(clubId, params),
        enabled: Boolean(clubId),
    });
}
