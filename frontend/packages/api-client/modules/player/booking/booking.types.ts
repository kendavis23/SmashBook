import type { InviteStatus } from "../../share/booking/booking.types";

export type { UUID, InviteStatus, BookingResponse } from "../../share/booking/booking.types";

export interface InviteRespondRequest {
    action: InviteStatus;
}
