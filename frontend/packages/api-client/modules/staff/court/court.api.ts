import { fetcher } from "../../../core/fetcher";
import type {
    CourtCreate,
    CourtUpdate,
    CourtResponse,
    CourtAvailabilityResponse,
    CourtListParams,
    CalendarReservationCreate,
    CalendarReservationUpdate,
    CalendarReservationResponse,
    CalendarReservationListParams,
} from "./court.types";

const JSON_HEADERS = { "Content-Type": "application/json" };

export function listCourtsEndpoint(params: CourtListParams): Promise<CourtResponse[]> {
    const query = new URLSearchParams();
    if (params.club_id) query.set("club_id", params.club_id);
    if (params.surface_type) query.set("surface_type", params.surface_type);
    if (params.date) query.set("date", params.date);
    if (params.time_from) query.set("time_from", params.time_from);
    if (params.time_to) query.set("time_to", params.time_to);
    const qs = query.toString();
    return fetcher<CourtResponse[]>(`/api/v1/courts${qs ? `?${qs}` : ""}`);
}

export function createCourtEndpoint(data: CourtCreate): Promise<CourtResponse> {
    return fetcher<CourtResponse>("/api/v1/courts", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(data),
    });
}

export function getCourtAvailabilityEndpoint(
    courtId: string,
    date: string
): Promise<CourtAvailabilityResponse> {
    return fetcher<CourtAvailabilityResponse>(
        `/api/v1/courts/${courtId}/availability?date=${date}`
    );
}

export function updateCourtEndpoint(courtId: string, data: CourtUpdate): Promise<CourtResponse> {
    return fetcher<CourtResponse>(`/api/v1/courts/${courtId}`, {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify(data),
    });
}

export function listCalendarReservationsEndpoint(
    params: CalendarReservationListParams
): Promise<CalendarReservationResponse[]> {
    const query = new URLSearchParams({ club_id: params.club_id });
    if (params.reservation_type) query.set("reservation_type", params.reservation_type);
    if (params.court_id) query.set("court_id", params.court_id);
    if (params.from_dt) query.set("from_dt", params.from_dt);
    if (params.to_dt) query.set("to_dt", params.to_dt);
    return fetcher<CalendarReservationResponse[]>(
        `/api/v1/calendar-reservations?${query.toString()}`
    );
}

export function createCalendarReservationEndpoint(
    data: CalendarReservationCreate
): Promise<CalendarReservationResponse> {
    return fetcher<CalendarReservationResponse>("/api/v1/calendar-reservations", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(data),
    });
}

export function getCalendarReservationEndpoint(
    reservationId: string
): Promise<CalendarReservationResponse> {
    return fetcher<CalendarReservationResponse>(`/api/v1/calendar-reservations/${reservationId}`);
}

export function updateCalendarReservationEndpoint(
    reservationId: string,
    data: CalendarReservationUpdate
): Promise<CalendarReservationResponse> {
    return fetcher<CalendarReservationResponse>(`/api/v1/calendar-reservations/${reservationId}`, {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify(data),
    });
}

export function deleteCalendarReservationEndpoint(reservationId: string): Promise<void> {
    return fetcher<void>(`/api/v1/calendar-reservations/${reservationId}`, {
        method: "DELETE",
    });
}
