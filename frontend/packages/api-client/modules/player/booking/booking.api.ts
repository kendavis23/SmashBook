import { fetcher } from "../../../core/fetcher";
import type { BookingResponse, InviteRespondRequest } from "./booking.types";

const JSON_HEADERS = { "Content-Type": "application/json" };

export function joinBookingEndpoint(bookingId: string, clubId: string): Promise<BookingResponse> {
    return fetcher<BookingResponse>(`/api/v1/bookings/${bookingId}/join?club_id=${clubId}`, {
        method: "POST",
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
