import { fetcher } from "../../../core/fetcher";
import type {
    CourtCreate,
    CourtUpdate,
    CourtResponse,
    CalendarReservationCreate,
    CalendarReservationUpdate,
    CalendarReservationResponse,
    CalendarReservationListParams,
} from "./court.types";

export { listCourtsEndpoint, getCourtAvailabilityEndpoint } from "../../share/court/court.api";

const JSON_HEADERS = { "Content-Type": "application/json" };

export function createCourtEndpoint(data: CourtCreate): Promise<CourtResponse> {
    return fetcher<CourtResponse>("/api/v1/courts", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(data),
    });
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
