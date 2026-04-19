import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
    listCourtsEndpoint,
    createCourtEndpoint,
    updateCourtEndpoint,
    getCourtAvailabilityEndpoint,
    listCalendarReservationsEndpoint,
    createCalendarReservationEndpoint,
    getCalendarReservationEndpoint,
    updateCalendarReservationEndpoint,
    deleteCalendarReservationEndpoint,
} from "@repo/api-client/modules/staff";
import type {
    Court,
    CourtInput,
    CourtUpdateInput,
    CourtAvailability,
    SurfaceType,
    CalendarReservationInput,
    CalendarReservationUpdateInput,
    CalendarReservation,
    CalendarReservationType,
} from "../models";
// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const courtKeys = {
    all: (clubId: string) => ["courts", clubId] as const,
    detail: (courtId: string) => ["courts", courtId] as const,
    availability: (courtId: string, date: string) =>
        ["courts", courtId, "availability", date] as const,
    calendarReservations: (clubId: string, filters?: Record<string, string>) =>
        ["calendar-reservations", clubId, filters] as const,
    calendarReservationDetail: (reservationId: string) =>
        ["calendar-reservations", reservationId] as const,
};

// ---------------------------------------------------------------------------
// useListCourts — GET /api/v1/courts?club_id=...
// ---------------------------------------------------------------------------

export interface ListCourtsFilters {
    surfaceType?: string;
    date?: string;
    timeFrom?: string;
    timeTo?: string;
}

export function useListCourts(clubId: string, filters?: ListCourtsFilters) {
    return useQuery({
        queryKey: [...courtKeys.all(clubId), filters] as const,
        queryFn: (): Promise<Court[]> =>
            listCourtsEndpoint({
                club_id: clubId,
                surface_type: filters?.surfaceType as SurfaceType | undefined,
                date: filters?.date,
                time_from: filters?.timeFrom,
                time_to: filters?.timeTo,
            }),
        enabled: Boolean(clubId),
    });
}

// ---------------------------------------------------------------------------
// useCreateCourt — POST /api/v1/courts
// ---------------------------------------------------------------------------

export function useCreateCourt(clubId: string) {
    const queryClient = useQueryClient();
    return useMutation<Court, Error, CourtInput>({
        mutationFn: (data: CourtInput) => createCourtEndpoint(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: courtKeys.all(clubId) });
        },
    });
}

// ---------------------------------------------------------------------------
// useUpdateCourt — PATCH /api/v1/courts/:courtId
// ---------------------------------------------------------------------------

export function useUpdateCourt(clubId: string, courtId: string) {
    const queryClient = useQueryClient();
    return useMutation<Court, Error, CourtUpdateInput>({
        mutationFn: (data: CourtUpdateInput) => updateCourtEndpoint(courtId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: courtKeys.detail(courtId) });
            queryClient.invalidateQueries({ queryKey: courtKeys.all(clubId) });
        },
    });
}

// ---------------------------------------------------------------------------
// useGetCourtAvailability — GET /api/v1/courts/:courtId/availability?date=...
// ---------------------------------------------------------------------------

export function useGetCourtAvailability(courtId: string, date: string) {
    return useQuery({
        queryKey: courtKeys.availability(courtId, date),
        queryFn: (): Promise<CourtAvailability> => getCourtAvailabilityEndpoint(courtId, date),
        enabled: Boolean(courtId) && Boolean(date),
        gcTime: 0,
        staleTime: 0,
    });
}

// ---------------------------------------------------------------------------
// useListCalendarReservations — GET /api/v1/calendar-reservations?club_id=...
// ---------------------------------------------------------------------------

export interface CalendarReservationFilters {
    reservationType?: string;
    courtId?: string;
    fromDt?: string;
    toDt?: string;
}

export function useListCalendarReservations(clubId: string, filters?: CalendarReservationFilters) {
    return useQuery({
        queryKey: courtKeys.calendarReservations(clubId, filters as Record<string, string>),
        queryFn: (): Promise<CalendarReservation[]> =>
            listCalendarReservationsEndpoint({
                club_id: clubId,
                reservation_type: (filters?.reservationType || undefined) as
                    | CalendarReservationType
                    | undefined,
                court_id: filters?.courtId || undefined,
                from_dt: filters?.fromDt || undefined,
                to_dt: filters?.toDt || undefined,
            }),
        enabled: Boolean(clubId),
    });
}

// ---------------------------------------------------------------------------
// useCreateCalendarReservation — POST /api/v1/calendar-reservations
// ---------------------------------------------------------------------------

export function useCreateCalendarReservation(clubId: string) {
    const queryClient = useQueryClient();
    return useMutation<CalendarReservation, Error, CalendarReservationInput>({
        mutationFn: (data: CalendarReservationInput) => createCalendarReservationEndpoint(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: courtKeys.calendarReservations(clubId) });
        },
    });
}

// ---------------------------------------------------------------------------
// useGetCalendarReservation — GET /api/v1/calendar-reservations/:reservationId
// ---------------------------------------------------------------------------

export function useGetCalendarReservation(reservationId: string) {
    return useQuery({
        queryKey: courtKeys.calendarReservationDetail(reservationId),
        queryFn: (): Promise<CalendarReservation> => getCalendarReservationEndpoint(reservationId),
        enabled: Boolean(reservationId),
    });
}

// ---------------------------------------------------------------------------
// useUpdateCalendarReservation — PATCH /api/v1/calendar-reservations/:reservationId
// ---------------------------------------------------------------------------

export function useUpdateCalendarReservation(clubId: string, reservationId: string) {
    const queryClient = useQueryClient();
    return useMutation<CalendarReservation, Error, CalendarReservationUpdateInput>({
        mutationFn: (data: CalendarReservationUpdateInput) =>
            updateCalendarReservationEndpoint(reservationId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: courtKeys.calendarReservations(clubId) });
            queryClient.invalidateQueries({
                queryKey: courtKeys.calendarReservationDetail(reservationId),
            });
        },
    });
}

// ---------------------------------------------------------------------------
// useDeleteCalendarReservation — DELETE /api/v1/calendar-reservations/:reservationId
// ---------------------------------------------------------------------------

export function useDeleteCalendarReservation(clubId: string) {
    const queryClient = useQueryClient();
    return useMutation<void, Error, string>({
        mutationFn: (reservationId: string) => deleteCalendarReservationEndpoint(reservationId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: courtKeys.calendarReservations(clubId) });
        },
    });
}
