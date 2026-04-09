import { fetcher } from "../../../core/fetcher";
import type {
    CourtCreate,
    CourtUpdate,
    CourtResponse,
    CourtAvailabilityResponse,
    CalendarReservationCreate,
    CalendarReservationUpdate,
    CalendarReservationResponse,
} from "./court.types";

const JSON_HEADERS = { "Content-Type": "application/json" };

export function listCourtsEndpoint(clubId: string): Promise<CourtResponse[]> {
    return fetcher<CourtResponse[]>(`/api/v1/clubs/${clubId}/courts`);
}
export function createCourtEndpoint(clubId: string, data: CourtCreate): Promise<CourtResponse> {
    return fetcher<CourtResponse>(`/api/v1/clubs/${clubId}/courts`, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(data),
    });
}
export function getCourtEndpoint(clubId: string, courtId: string): Promise<CourtResponse> {
    return fetcher<CourtResponse>(`/api/v1/clubs/${clubId}/courts/${courtId}`);
}
export function updateCourtEndpoint(
    clubId: string,
    courtId: string,
    data: CourtUpdate
): Promise<CourtResponse> {
    return fetcher<CourtResponse>(`/api/v1/clubs/${clubId}/courts/${courtId}`, {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify(data),
    });
}
export function deleteCourtEndpoint(clubId: string, courtId: string): Promise<void> {
    return fetcher<void>(`/api/v1/clubs/${clubId}/courts/${courtId}`, {
        method: "DELETE",
    });
}
export function getCourtAvailabilityEndpoint(
    clubId: string,
    courtId: string,
    date: string
): Promise<CourtAvailabilityResponse> {
    return fetcher<CourtAvailabilityResponse>(
        `/api/v1/clubs/${clubId}/courts/${courtId}/availability?date=${date}`
    );
}
export function listCalendarReservationsEndpoint(
    clubId: string
): Promise<CalendarReservationResponse[]> {
    return fetcher<CalendarReservationResponse[]>(`/api/v1/clubs/${clubId}/calendar-reservations`);
}
export function createCalendarReservationEndpoint(
    clubId: string,
    data: CalendarReservationCreate
): Promise<CalendarReservationResponse> {
    return fetcher<CalendarReservationResponse>(`/api/v1/clubs/${clubId}/calendar-reservations`, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(data),
    });
}
export function updateCalendarReservationEndpoint(
    clubId: string,
    reservationId: string,
    data: CalendarReservationUpdate
): Promise<CalendarReservationResponse> {
    return fetcher<CalendarReservationResponse>(
        `/api/v1/clubs/${clubId}/calendar-reservations/${reservationId}`,
        {
            method: "PATCH",
            headers: JSON_HEADERS,
            body: JSON.stringify(data),
        }
    );
}
export function deleteCalendarReservationEndpoint(
    clubId: string,
    reservationId: string
): Promise<void> {
    return fetcher<void>(`/api/v1/clubs/${clubId}/calendar-reservations/${reservationId}`, {
        method: "DELETE",
    });
}
