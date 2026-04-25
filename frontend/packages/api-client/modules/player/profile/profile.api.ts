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

export function getMyBookingsEndpoint(): Promise<PlayerBookingsResponse> {
    return fetcher<PlayerBookingsResponse>("/api/v1/players/me/bookings");
}

export function getMyMatchHistoryEndpoint(): Promise<PlayerBookingItem[]> {
    return fetcher<PlayerBookingItem[]>("/api/v1/players/me/match-history");
}
