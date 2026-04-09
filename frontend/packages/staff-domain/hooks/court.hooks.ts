import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
    listCourtsEndpoint,
    createCourtEndpoint,
    getCourtEndpoint,
    updateCourtEndpoint,
    deleteCourtEndpoint,
    getCourtAvailabilityEndpoint,
    listCalendarReservationsEndpoint,
    createCalendarReservationEndpoint,
    updateCalendarReservationEndpoint,
    deleteCalendarReservationEndpoint,
} from "@repo/api-client/modules/staff";
import type {
    Court,
    CourtInput,
    CourtUpdateInput,
    CourtAvailability,
    CalendarReservationInput,
    CalendarReservationUpdateInput,
    CalendarReservation,
} from "../models";

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const courtKeys = {
    all: (clubId: string) => ["courts", clubId] as const,
    detail: (clubId: string, courtId: string) => ["courts", clubId, courtId] as const,
    availability: (clubId: string, courtId: string, date: string) =>
        ["courts", clubId, courtId, "availability", date] as const,
    calendarReservations: (clubId: string) => ["calendar-reservations", clubId] as const,
};

// ---------------------------------------------------------------------------
// useListCourts — GET /api/v1/clubs/:clubId/courts
// ---------------------------------------------------------------------------

export function useListCourts(clubId: string) {
    return useQuery({
        queryKey: courtKeys.all(clubId),
        queryFn: async (): Promise<Court[]> => listCourtsEndpoint(clubId),
        enabled: Boolean(clubId),
    });
}

// ---------------------------------------------------------------------------
// useCreateCourt — POST /api/v1/clubs/:clubId/courts
// ---------------------------------------------------------------------------

export function useCreateCourt(clubId: string) {
    const queryClient = useQueryClient();
    return useMutation<Court, Error, CourtInput>({
        mutationFn: (data: CourtInput) => createCourtEndpoint(clubId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: courtKeys.all(clubId) });
        },
    });
}

// ---------------------------------------------------------------------------
// useGetCourt — GET /api/v1/clubs/:clubId/courts/:courtId
// ---------------------------------------------------------------------------

export function useGetCourt(clubId: string, courtId: string) {
    return useQuery({
        queryKey: courtKeys.detail(clubId, courtId),
        queryFn: async (): Promise<Court> => getCourtEndpoint(clubId, courtId),
        enabled: Boolean(clubId) && Boolean(courtId),
    });
}

// ---------------------------------------------------------------------------
// useUpdateCourt — PATCH /api/v1/clubs/:clubId/courts/:courtId
// ---------------------------------------------------------------------------

export function useUpdateCourt(clubId: string, courtId: string) {
    const queryClient = useQueryClient();
    return useMutation<Court, Error, CourtUpdateInput>({
        mutationFn: (data: CourtUpdateInput) => updateCourtEndpoint(clubId, courtId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: courtKeys.detail(clubId, courtId) });
            queryClient.invalidateQueries({ queryKey: courtKeys.all(clubId) });
        },
    });
}

// ---------------------------------------------------------------------------
// useDeleteCourt — DELETE /api/v1/clubs/:clubId/courts/:courtId
// ---------------------------------------------------------------------------

export function useDeleteCourt(clubId: string) {
    const queryClient = useQueryClient();
    return useMutation<void, Error, string>({
        mutationFn: (courtId: string) => deleteCourtEndpoint(clubId, courtId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: courtKeys.all(clubId) });
        },
    });
}

// ---------------------------------------------------------------------------
// useGetCourtAvailability — GET /api/v1/clubs/:clubId/courts/:courtId/availability
// ---------------------------------------------------------------------------

export function useGetCourtAvailability(clubId: string, courtId: string, date: string) {
    return useQuery({
        queryKey: courtKeys.availability(clubId, courtId, date),
        queryFn: async (): Promise<CourtAvailability> =>
            getCourtAvailabilityEndpoint(clubId, courtId, date),
        enabled: Boolean(clubId) && Boolean(courtId) && Boolean(date),
    });
}

// ---------------------------------------------------------------------------
// useListCalendarReservations — GET /api/v1/clubs/:clubId/calendar-reservations
// ---------------------------------------------------------------------------

export function useListCalendarReservations(clubId: string) {
    return useQuery({
        queryKey: courtKeys.calendarReservations(clubId),
        queryFn: async (): Promise<CalendarReservation[]> =>
            listCalendarReservationsEndpoint(clubId),
        enabled: Boolean(clubId),
    });
}

// ---------------------------------------------------------------------------
// useCreateCalendarReservation — POST /api/v1/clubs/:clubId/calendar-reservations
// ---------------------------------------------------------------------------

export function useCreateCalendarReservation(clubId: string) {
    const queryClient = useQueryClient();
    return useMutation<CalendarReservation, Error, CalendarReservationInput>({
        mutationFn: (data: CalendarReservationInput) =>
            createCalendarReservationEndpoint(clubId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: courtKeys.calendarReservations(clubId) });
        },
    });
}

// ---------------------------------------------------------------------------
// useUpdateCalendarReservation — PATCH /api/v1/clubs/:clubId/calendar-reservations/:reservationId
// ---------------------------------------------------------------------------

export function useUpdateCalendarReservation(clubId: string, reservationId: string) {
    const queryClient = useQueryClient();
    return useMutation<CalendarReservation, Error, CalendarReservationUpdateInput>({
        mutationFn: (data: CalendarReservationUpdateInput) =>
            updateCalendarReservationEndpoint(clubId, reservationId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: courtKeys.calendarReservations(clubId) });
        },
    });
}

// ---------------------------------------------------------------------------
// useDeleteCalendarReservation — DELETE /api/v1/clubs/:clubId/calendar-reservations/:reservationId
// ---------------------------------------------------------------------------

export function useDeleteCalendarReservation(clubId: string) {
    const queryClient = useQueryClient();
    return useMutation<void, Error, string>({
        mutationFn: (reservationId: string) =>
            deleteCalendarReservationEndpoint(clubId, reservationId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: courtKeys.calendarReservations(clubId) });
        },
    });
}
