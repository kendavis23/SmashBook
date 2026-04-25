import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
    listBookingsEndpoint,
    getBookingEndpoint,
    createBookingEndpoint,
    createRecurringBookingEndpoint,
    updateBookingEndpoint,
    cancelBookingEndpoint,
    joinBookingEndpoint,
    invitePlayerEndpoint,
    respondInviteEndpoint,
    getCalendarViewEndpoint,
    listOpenGamesEndpoint,
} from "@repo/api-client/modules/staff";
import type {
    Booking,
    BookingInput,
    BookingUpdateInput,
    BookingListFilters,
    CalendarViewFilters,
    CalendarView,
    OpenGame,
    OpenGameFilters,
    InvitePlayerInput,
    InviteRespondInput,
    RecurringBookingInput,
    RecurringBookingResult,
} from "../models";

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const bookingKeys = {
    all: (clubId: string) => ["bookings", clubId] as const,
    filtered: (clubId: string, filters: BookingListFilters) =>
        ["bookings", clubId, filters] as const,
    detail: (bookingId: string) => ["bookings", bookingId] as const,
    calendar: (clubId: string, filters: CalendarViewFilters) =>
        ["bookings-calendar", clubId, filters] as const,
    openGames: (clubId: string, filters: OpenGameFilters) =>
        ["open-games", clubId, filters] as const,
};

// ---------------------------------------------------------------------------
// useListBookings — GET /api/v1/bookings
// ---------------------------------------------------------------------------

export function useListBookings(clubId: string, filters: BookingListFilters = {}) {
    return useQuery({
        queryKey: bookingKeys.filtered(clubId, filters),
        queryFn: (): Promise<Booking[]> =>
            listBookingsEndpoint({
                club_id: clubId,
                ...filters,
            }),
        enabled: Boolean(clubId),
    });
}

// ---------------------------------------------------------------------------
// useGetBooking — GET /api/v1/bookings/:bookingId
// ---------------------------------------------------------------------------

export function useGetBooking(bookingId: string, clubId: string) {
    return useQuery({
        queryKey: bookingKeys.detail(bookingId),
        queryFn: (): Promise<Booking> => getBookingEndpoint(bookingId, clubId),
        enabled: Boolean(bookingId) && Boolean(clubId),
    });
}

// ---------------------------------------------------------------------------
// useGetCalendarView — GET /api/v1/bookings/calendar
// ---------------------------------------------------------------------------

export function useGetCalendarView(clubId: string, filters: CalendarViewFilters = {}) {
    return useQuery({
        queryKey: bookingKeys.calendar(clubId, filters),
        queryFn: (): Promise<CalendarView> =>
            getCalendarViewEndpoint({
                club_id: clubId,
                ...filters,
            }),
        enabled: Boolean(clubId),
    });
}

// ---------------------------------------------------------------------------
// useListOpenGames — GET /api/v1/bookings/open-games
// ---------------------------------------------------------------------------

export function useListOpenGames(clubId: string, filters: OpenGameFilters = {}) {
    return useQuery({
        queryKey: bookingKeys.openGames(clubId, filters),
        queryFn: (): Promise<OpenGame[]> =>
            listOpenGamesEndpoint({
                club_id: clubId,
                ...filters,
            }),
        enabled: Boolean(clubId),
    });
}

// ---------------------------------------------------------------------------
// useCreateBooking — POST /api/v1/bookings
// ---------------------------------------------------------------------------

export function useCreateBooking(clubId: string) {
    const queryClient = useQueryClient();
    return useMutation<Booking, Error, BookingInput>({
        mutationFn: (data: BookingInput) => createBookingEndpoint(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: bookingKeys.all(clubId) });
        },
    });
}

// ---------------------------------------------------------------------------
// useCreateRecurringBooking — POST /api/v1/bookings/recurring
// ---------------------------------------------------------------------------

export function useCreateRecurringBooking(clubId: string) {
    const queryClient = useQueryClient();
    return useMutation<RecurringBookingResult, Error, RecurringBookingInput>({
        mutationFn: (data: RecurringBookingInput) => createRecurringBookingEndpoint(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: bookingKeys.all(clubId) });
        },
    });
}

// ---------------------------------------------------------------------------
// useUpdateBooking — PATCH /api/v1/bookings/:bookingId
// ---------------------------------------------------------------------------

export function useUpdateBooking(clubId: string, bookingId: string) {
    const queryClient = useQueryClient();
    return useMutation<Booking, Error, BookingUpdateInput>({
        mutationFn: (data: BookingUpdateInput) => updateBookingEndpoint(bookingId, clubId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: bookingKeys.detail(bookingId) });
            queryClient.invalidateQueries({ queryKey: bookingKeys.all(clubId) });
        },
    });
}

// ---------------------------------------------------------------------------
// useCancelBooking — DELETE /api/v1/bookings/:bookingId
// ---------------------------------------------------------------------------

export function useCancelBooking(clubId: string) {
    const queryClient = useQueryClient();
    return useMutation<Booking, Error, string>({
        mutationFn: (bookingId: string) => cancelBookingEndpoint(bookingId, clubId),
        onSuccess: (_data, bookingId) => {
            queryClient.invalidateQueries({ queryKey: bookingKeys.detail(bookingId) });
            queryClient.invalidateQueries({ queryKey: bookingKeys.all(clubId) });
        },
    });
}

// ---------------------------------------------------------------------------
// useJoinBooking — POST /api/v1/bookings/:bookingId/join
// ---------------------------------------------------------------------------

export function useJoinBooking(clubId: string, bookingId: string) {
    const queryClient = useQueryClient();
    return useMutation<Booking, Error, void>({
        mutationFn: () => joinBookingEndpoint(bookingId, clubId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: bookingKeys.detail(bookingId) });
            queryClient.invalidateQueries({ queryKey: bookingKeys.all(clubId) });
        },
    });
}

// ---------------------------------------------------------------------------
// useInvitePlayer — POST /api/v1/bookings/:bookingId/invite
// ---------------------------------------------------------------------------

export function useInvitePlayer(clubId: string, bookingId: string) {
    const queryClient = useQueryClient();
    return useMutation<Booking, Error, InvitePlayerInput>({
        mutationFn: (data: InvitePlayerInput) => invitePlayerEndpoint(bookingId, clubId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: bookingKeys.detail(bookingId) });
        },
    });
}

// ---------------------------------------------------------------------------
// useRespondInvite — POST /api/v1/bookings/:bookingId/respond-invite
// ---------------------------------------------------------------------------

export function useRespondInvite(clubId: string, bookingId: string) {
    const queryClient = useQueryClient();
    return useMutation<Booking, Error, InviteRespondInput>({
        mutationFn: (data: InviteRespondInput) => respondInviteEndpoint(bookingId, clubId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: bookingKeys.detail(bookingId) });
            queryClient.invalidateQueries({ queryKey: bookingKeys.all(clubId) });
        },
    });
}
