import { fetcher } from "../../../core/fetcher";
import type {
    ClubCreate,
    ClubUpdate,
    ClubResponse,
    ClubSettingsUpdate,
    ClubSettingsResponse,
    OperatingHoursEntry,
    PricingRuleEntry,
    StripeConnectRequest,
    StripeConnectResponse,
} from "./club.types";

const JSON_HEADERS = { "Content-Type": "application/json" };

export function listClubsEndpoint(): Promise<ClubResponse[]> {
    return fetcher<ClubResponse[]>("/api/v1/clubs");
}
export function createClubEndpoint(data: ClubCreate): Promise<ClubResponse> {
    return fetcher<ClubResponse>("/api/v1/clubs", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(data),
    });
}
export function getClubEndpoint(clubId: string): Promise<ClubResponse> {
    return fetcher<ClubResponse>(`/api/v1/clubs/${clubId}`);
}
export function updateClubEndpoint(clubId: string, data: ClubUpdate): Promise<ClubResponse> {
    return fetcher<ClubResponse>(`/api/v1/clubs/${clubId}`, {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify(data),
    });
}
export function updateClubSettingsEndpoint(
    clubId: string,
    data: ClubSettingsUpdate
): Promise<ClubSettingsResponse> {
    return fetcher<ClubSettingsResponse>(`/api/v1/clubs/${clubId}/settings`, {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify(data),
    });
}
export function getOperatingHoursEndpoint(clubId: string): Promise<OperatingHoursEntry[]> {
    return fetcher<OperatingHoursEntry[]>(`/api/v1/clubs/${clubId}/operating-hours`);
}
export function setOperatingHoursEndpoint(
    clubId: string,
    data: OperatingHoursEntry[]
): Promise<OperatingHoursEntry[]> {
    return fetcher<OperatingHoursEntry[]>(`/api/v1/clubs/${clubId}/operating-hours`, {
        method: "PUT",
        headers: JSON_HEADERS,
        body: JSON.stringify(data),
    });
}
export function getPricingRulesEndpoint(clubId: string): Promise<PricingRuleEntry[]> {
    return fetcher<PricingRuleEntry[]>(`/api/v1/clubs/${clubId}/pricing-rules`);
}
export function setPricingRulesEndpoint(
    clubId: string,
    data: PricingRuleEntry[]
): Promise<PricingRuleEntry[]> {
    return fetcher<PricingRuleEntry[]>(`/api/v1/clubs/${clubId}/pricing-rules`, {
        method: "PUT",
        headers: JSON_HEADERS,
        body: JSON.stringify(data),
    });
}
export function stripeConnectEndpoint(
    clubId: string,
    data: StripeConnectRequest
): Promise<StripeConnectResponse> {
    return fetcher<StripeConnectResponse>(`/api/v1/clubs/${clubId}/stripe-connect`, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(data),
    });
}
