import { fetcher } from "../../../core/fetcher";
import type {
    BookingCreate,
    BookingUpdate,
    BookingResponse,
    BookingListParams,
    CalendarViewParams,
    CalendarResponse,
    OpenGameListParams,
    OpenGameSummary,
    InvitePlayerRequest,
    InviteRespondRequest,
    RecurringBookingCreate,
    RecurringBookingResponse,
} from "./booking.types";

const JSON_HEADERS = { "Content-Type": "application/json" };

export function listBookingsEndpoint(params: BookingListParams): Promise<BookingResponse[]> {
    const query = new URLSearchParams({ club_id: params.club_id });
    if (params.date_from) query.set("date_from", params.date_from);
    if (params.date_to) query.set("date_to", params.date_to);
    if (params.booking_type) query.set("booking_type", params.booking_type);
    if (params.booking_status) query.set("booking_status", params.booking_status);
    if (params.court_id) query.set("court_id", params.court_id);
    if (params.player_search) query.set("player_search", params.player_search);
    return fetcher<BookingResponse[]>(`/api/v1/bookings?${query.toString()}`);
}

export function getCalendarViewEndpoint(params: CalendarViewParams): Promise<CalendarResponse> {
    const query = new URLSearchParams({ club_id: params.club_id });
    if (params.view) query.set("view", params.view);
    if (params.anchor_date) query.set("anchor_date", params.anchor_date);
    if (params.court_id) query.set("court_id", params.court_id);
    return fetcher<CalendarResponse>(`/api/v1/bookings/calendar?${query.toString()}`);
}

export function listOpenGamesEndpoint(params: OpenGameListParams): Promise<OpenGameSummary[]> {
    const query = new URLSearchParams({ club_id: params.club_id });
    if (params.date) query.set("date", params.date);
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

export function updateBookingEndpoint(
    bookingId: string,
    clubId: string,
    data: BookingUpdate
): Promise<BookingResponse> {
    return fetcher<BookingResponse>(`/api/v1/bookings/${bookingId}?club_id=${clubId}`, {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify(data),
    });
}

export function cancelBookingEndpoint(bookingId: string, clubId: string): Promise<BookingResponse> {
    return fetcher<BookingResponse>(`/api/v1/bookings/${bookingId}?club_id=${clubId}`, {
        method: "DELETE",
    });
}

export function joinBookingEndpoint(bookingId: string, clubId: string): Promise<BookingResponse> {
    return fetcher<BookingResponse>(`/api/v1/bookings/${bookingId}/join?club_id=${clubId}`, {
        method: "POST",
    });
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

export function createRecurringBookingEndpoint(
    data: RecurringBookingCreate
): Promise<RecurringBookingResponse> {
    return fetcher<RecurringBookingResponse>("/api/v1/bookings/recurring", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(data),
    });
}

export function respondInviteEndpoint(
    bookingId: string,
    clubId: string,
    data: InviteRespondRequest
): Promise<BookingResponse> {
    return fetcher<BookingResponse>(
        `/api/v1/bookings/${bookingId}/respond-invite?club_id=${clubId}`,
        {
            method: "POST",
            headers: JSON_HEADERS,
            body: JSON.stringify(data),
        }
    );
}
