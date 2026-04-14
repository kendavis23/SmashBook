import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
    listTrainersEndpoint,
    getTrainerAvailabilityEndpoint,
    setTrainerAvailabilityEndpoint,
    updateTrainerAvailabilityEndpoint,
    deleteTrainerAvailabilityEndpoint,
    getTrainerBookingsEndpoint,
} from "@repo/api-client/modules/staff";
import type {
    Trainer,
    TrainerAvailability,
    TrainerAvailabilityInput,
    TrainerAvailabilityUpdateInput,
    TrainerBookingItem,
} from "../models";

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const trainerKeys = {
    all: (clubId: string) => ["trainers", clubId] as const,
    detail: (trainerId: string) => ["trainers", "detail", trainerId] as const,
    availability: (trainerId: string) => ["trainers", trainerId, "availability"] as const,
    bookings: (trainerId: string) => ["trainers", trainerId, "bookings"] as const,
};

// ---------------------------------------------------------------------------
// useListTrainers — GET /api/v1/trainers?club_id=:clubId
// ---------------------------------------------------------------------------

export function useListTrainers(clubId: string, includeInactive?: boolean) {
    return useQuery({
        queryKey: trainerKeys.all(clubId),
        queryFn: (): Promise<Trainer[]> => listTrainersEndpoint(clubId, includeInactive),
        enabled: Boolean(clubId),
    });
}

// ---------------------------------------------------------------------------
// useGetTrainerAvailability — GET /api/v1/trainers/:trainerId/availability
// ---------------------------------------------------------------------------

export function useGetTrainerAvailability(trainerId: string) {
    return useQuery({
        queryKey: trainerKeys.availability(trainerId),
        queryFn: (): Promise<TrainerAvailability[]> => getTrainerAvailabilityEndpoint(trainerId),
        enabled: Boolean(trainerId),
    });
}

// ---------------------------------------------------------------------------
// useSetTrainerAvailability — POST /api/v1/trainers/:trainerId/availability
// ---------------------------------------------------------------------------

export function useSetTrainerAvailability(trainerId: string) {
    const queryClient = useQueryClient();
    return useMutation<TrainerAvailability, Error, TrainerAvailabilityInput>({
        mutationFn: (data: TrainerAvailabilityInput) =>
            setTrainerAvailabilityEndpoint(trainerId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: trainerKeys.availability(trainerId) });
        },
    });
}

// ---------------------------------------------------------------------------
// useUpdateTrainerAvailability — PUT /api/v1/trainers/:trainerId/availability/:availabilityId
// ---------------------------------------------------------------------------

export function useUpdateTrainerAvailability(trainerId: string, availabilityId: string) {
    const queryClient = useQueryClient();
    return useMutation<TrainerAvailability, Error, TrainerAvailabilityUpdateInput>({
        mutationFn: (data: TrainerAvailabilityUpdateInput) =>
            updateTrainerAvailabilityEndpoint(trainerId, availabilityId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: trainerKeys.availability(trainerId) });
        },
    });
}

// ---------------------------------------------------------------------------
// useDeleteTrainerAvailability — DELETE /api/v1/trainers/:trainerId/availability/:availabilityId
// ---------------------------------------------------------------------------

export function useDeleteTrainerAvailability(trainerId: string) {
    const queryClient = useQueryClient();
    return useMutation<void, Error, string>({
        mutationFn: (availabilityId: string) =>
            deleteTrainerAvailabilityEndpoint(trainerId, availabilityId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: trainerKeys.availability(trainerId) });
        },
    });
}

// ---------------------------------------------------------------------------
// useGetTrainerBookings — GET /api/v1/trainers/:trainerId/bookings
// ---------------------------------------------------------------------------

export function useGetTrainerBookings(trainerId: string, upcomingOnly?: boolean) {
    return useQuery({
        queryKey: trainerKeys.bookings(trainerId),
        queryFn: (): Promise<TrainerBookingItem[]> =>
            getTrainerBookingsEndpoint(trainerId, upcomingOnly),
        enabled: Boolean(trainerId),
    });
}
