import { fetcher } from "../../../core/fetcher";
import type {
    PlayerValueLeaderboard,
    PlayerActivityLeaderboard,
    InactiveMembersReport,
    GroupValueReport,
    GroupDimension,
    PlayerSort,
    ActivePlayersKpi,
    ActivePlayersTimeseries,
    SignupsTimeseries,
    FlowGranularity,
} from "./analytics-player.types";

const BASE = "/api/v1/analytics/players";

// ── Workstream B — per-player value ──────────────────────────────────────────

export function getPlayerValueLeaderboardEndpoint(
    clubId: string,
    params?: {
        members_only?: boolean;
        sort?: PlayerSort;
        limit?: number;
        offset?: number;
    }
): Promise<PlayerValueLeaderboard> {
    const qs = new URLSearchParams();
    if (params?.members_only !== undefined) qs.set("members_only", String(params.members_only));
    if (params?.sort) qs.set("sort", params.sort);
    if (params?.limit !== undefined) qs.set("limit", String(params.limit));
    if (params?.offset !== undefined) qs.set("offset", String(params.offset));
    const query = qs.toString();
    return fetcher<PlayerValueLeaderboard>(
        `${BASE}/clubs/${clubId}/value${query ? `?${query}` : ""}`
    );
}

export function getMostActivePlayersEndpoint(
    clubId: string,
    params?: {
        window_days?: 30 | 90;
        limit?: number;
        offset?: number;
    }
): Promise<PlayerActivityLeaderboard> {
    const qs = new URLSearchParams();
    if (params?.window_days !== undefined) qs.set("window_days", String(params.window_days));
    if (params?.limit !== undefined) qs.set("limit", String(params.limit));
    if (params?.offset !== undefined) qs.set("offset", String(params.offset));
    const query = qs.toString();
    return fetcher<PlayerActivityLeaderboard>(
        `${BASE}/clubs/${clubId}/most-active${query ? `?${query}` : ""}`
    );
}

export function getInactiveMembersEndpoint(
    clubId: string,
    params?: {
        inactive_days?: number;
        limit?: number;
        offset?: number;
    }
): Promise<InactiveMembersReport> {
    const qs = new URLSearchParams();
    if (params?.inactive_days !== undefined) qs.set("inactive_days", String(params.inactive_days));
    if (params?.limit !== undefined) qs.set("limit", String(params.limit));
    if (params?.offset !== undefined) qs.set("offset", String(params.offset));
    const query = qs.toString();
    return fetcher<InactiveMembersReport>(
        `${BASE}/clubs/${clubId}/inactive-members${query ? `?${query}` : ""}`
    );
}

export function getPlayerValueByGroupEndpoint(
    clubId: string,
    params?: {
        dimension?: GroupDimension;
        inactive_days?: number;
    }
): Promise<GroupValueReport> {
    const qs = new URLSearchParams();
    if (params?.dimension) qs.set("dimension", params.dimension);
    if (params?.inactive_days !== undefined) qs.set("inactive_days", String(params.inactive_days));
    const query = qs.toString();
    return fetcher<GroupValueReport>(
        `${BASE}/clubs/${clubId}/value/by-group${query ? `?${query}` : ""}`
    );
}

// ── Workstream A — club-level player flow ────────────────────────────────────

export function getActivePlayersKpiEndpoint(
    clubId: string,
    params?: {
        window_days?: number;
        as_of?: string;
    }
): Promise<ActivePlayersKpi> {
    const qs = new URLSearchParams();
    if (params?.window_days !== undefined) qs.set("window_days", String(params.window_days));
    if (params?.as_of) qs.set("as_of", params.as_of);
    const query = qs.toString();
    return fetcher<ActivePlayersKpi>(`${BASE}/clubs/${clubId}/active${query ? `?${query}` : ""}`);
}

export function getActivePlayersTimeseriesEndpoint(
    clubId: string,
    params?: {
        granularity?: FlowGranularity;
        date_from?: string;
        date_to?: string;
    }
): Promise<ActivePlayersTimeseries> {
    const qs = new URLSearchParams();
    if (params?.granularity) qs.set("granularity", params.granularity);
    if (params?.date_from) qs.set("date_from", params.date_from);
    if (params?.date_to) qs.set("date_to", params.date_to);
    const query = qs.toString();
    return fetcher<ActivePlayersTimeseries>(
        `${BASE}/clubs/${clubId}/active/timeseries${query ? `?${query}` : ""}`
    );
}

export function getSignupsTimeseriesEndpoint(
    clubId: string,
    params?: {
        granularity?: FlowGranularity;
        date_from?: string;
        date_to?: string;
    }
): Promise<SignupsTimeseries> {
    const qs = new URLSearchParams();
    if (params?.granularity) qs.set("granularity", params.granularity);
    if (params?.date_from) qs.set("date_from", params.date_from);
    if (params?.date_to) qs.set("date_to", params.date_to);
    const query = qs.toString();
    return fetcher<SignupsTimeseries>(`${BASE}/clubs/${clubId}/signups${query ? `?${query}` : ""}`);
}
