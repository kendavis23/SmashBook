import { fetcher } from "../../../core/fetcher";
import type {
    BookingCreate,
    BookingResponse,
    OpenGameListParams,
    OpenGameSummary,
    InvitePlayerRequest,
    PriceQuoteParams,
    PriceQuoteResponse,
} from "./booking.types";

const JSON_HEADERS = { "Content-Type": "application/json" };

export function listOpenGamesEndpoint(params: OpenGameListParams): Promise<OpenGameSummary[]> {
    const query = new URLSearchParams({ club_id: params.club_id });
    if (params.date) query.set("date", params.date);
    if (params.player_skill_level !== undefined)
        query.set("player_skill_level", String(params.player_skill_level));
    if (params.min_skill !== undefined) query.set("min_skill", String(params.min_skill));
    if (params.max_skill !== undefined) query.set("max_skill", String(params.max_skill));
    return fetcher<OpenGameSummary[]>(`/api/v1/bookings/open-games?${query.toString()}`);
}

export function createBookingEndpoint(data: BookingCreate): Promise<BookingResponse> {
    return fetcher<BookingResponse>("/api/v1/bookings", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(data),
    });
}

export function getBookingEndpoint(bookingId: string, clubId: string): Promise<BookingResponse> {
    return fetcher<BookingResponse>(`/api/v1/bookings/${bookingId}?club_id=${clubId}`);
}

export function cancelBookingEndpoint(bookingId: string, clubId: string): Promise<BookingResponse> {
    return fetcher<BookingResponse>(`/api/v1/bookings/${bookingId}?club_id=${clubId}`, {
        method: "DELETE",
    });
}

export function getPriceQuoteEndpoint(params: PriceQuoteParams): Promise<PriceQuoteResponse> {
    const query = new URLSearchParams({
        club_id: params.club_id,
        start_datetime: params.start_datetime,
    });
    if (params.booking_type) query.set("booking_type", params.booking_type);
    if (params.max_players !== undefined) query.set("max_players", String(params.max_players));
    if (params.for_user_id) query.set("for_user_id", params.for_user_id);
    return fetcher<PriceQuoteResponse>(`/api/v1/bookings/price-quote?${query.toString()}`);
}

export function invitePlayerEndpoint(
    bookingId: string,
    clubId: string,
    data: InvitePlayerRequest
): Promise<BookingResponse> {
    return fetcher<BookingResponse>(`/api/v1/bookings/${bookingId}/invite?club_id=${clubId}`, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(data),
    });
}
