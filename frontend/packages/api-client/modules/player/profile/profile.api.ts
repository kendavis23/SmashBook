import { fetcher } from "../../../core/fetcher";
import type {
    UserResponse,
    UserProfileUpdate,
    PlayerBookingItem,
    PlayerBookingsResponse,
} from "./profile.types";

const JSON_HEADERS = { "Content-Type": "application/json" };

export function getMyProfileEndpoint(): Promise<UserResponse> {
    return fetcher<UserResponse>("/api/v1/players/me");
}

export function updateMyProfileEndpoint(data: UserProfileUpdate): Promise<UserResponse> {
    return fetcher<UserResponse>("/api/v1/players/me", {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify(data),
    });
}

export function getMyBookingsEndpoint(params?: {
    past_from?: string;
    past_to?: string;
}): Promise<PlayerBookingsResponse> {
    const query = new URLSearchParams();
    if (params?.past_from) query.set("past_from", params.past_from);
    if (params?.past_to) query.set("past_to", params.past_to);
    const qs = query.toString();
    return fetcher<PlayerBookingsResponse>(`/api/v1/players/me/bookings${qs ? `?${qs}` : ""}`);
}

export function getMyMatchHistoryEndpoint(): Promise<PlayerBookingItem[]> {
    return fetcher<PlayerBookingItem[]>("/api/v1/players/me/match-history");
}
