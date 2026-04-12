import { fetcher } from "../../../core/fetcher";
import type {
    TrainerRead,
    TrainerAvailabilityRead,
    TrainerAvailabilityCreate,
    TrainerAvailabilityUpdate,
    TrainerBookingItem,
} from "./trainer.types";

const JSON_HEADERS = { "Content-Type": "application/json" };

export function listTrainersEndpoint(
    clubId: string,
    includeInactive?: boolean
): Promise<TrainerRead[]> {
    const query = new URLSearchParams({ club_id: clubId });
    if (includeInactive !== undefined) query.set("include_inactive", String(includeInactive));
    return fetcher<TrainerRead[]>(`/api/v1/trainers?${query.toString()}`);
}

export function getTrainerAvailabilityEndpoint(
    trainerId: string
): Promise<TrainerAvailabilityRead[]> {
    return fetcher<TrainerAvailabilityRead[]>(`/api/v1/trainers/${trainerId}/availability`);
}

export function setTrainerAvailabilityEndpoint(
    trainerId: string,
    data: TrainerAvailabilityCreate
): Promise<TrainerAvailabilityRead> {
    return fetcher<TrainerAvailabilityRead>(`/api/v1/trainers/${trainerId}/availability`, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(data),
    });
}

export function updateTrainerAvailabilityEndpoint(
    trainerId: string,
    availabilityId: string,
    data: TrainerAvailabilityUpdate
): Promise<TrainerAvailabilityRead> {
    return fetcher<TrainerAvailabilityRead>(
        `/api/v1/trainers/${trainerId}/availability/${availabilityId}`,
        {
            method: "PUT",
            headers: JSON_HEADERS,
            body: JSON.stringify(data),
        }
    );
}

export function deleteTrainerAvailabilityEndpoint(
    trainerId: string,
    availabilityId: string
): Promise<void> {
    return fetcher<void>(`/api/v1/trainers/${trainerId}/availability/${availabilityId}`, {
        method: "DELETE",
    });
}

export function getTrainerBookingsEndpoint(
    trainerId: string,
    upcomingOnly?: boolean
): Promise<TrainerBookingItem[]> {
    const query = new URLSearchParams();
    if (upcomingOnly !== undefined) query.set("upcoming_only", String(upcomingOnly));
    const qs = query.toString();
    return fetcher<TrainerBookingItem[]>(
        `/api/v1/trainers/${trainerId}/bookings${qs ? `?${qs}` : ""}`
    );
}
