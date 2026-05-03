import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
    listOpenGamesEndpoint,
    createBookingEndpoint,
    getBookingEndpoint,
    cancelBookingEndpoint,
    invitePlayerEndpoint,
} from "@repo/api-client/modules/share";
import {
    joinBookingEndpoint,
    respondInviteEndpoint,
    addEquipmentRentalEndpoint,
} from "@repo/api-client/modules/player";
import type {
    Booking,
    BookingInput,
    OpenGame,
    OpenGameFilters,
    InvitePlayerInput,
    InviteRespondInput,
    EquipmentRentalInput,
    EquipmentRental,
} from "../models";

const bookingKeys = {
    all: (clubId: string) => ["bookings", clubId] as const,
    detail: (bookingId: string) => ["bookings", bookingId] as const,
    openGames: (clubId: string, filters: OpenGameFilters) =>
        ["open-games", clubId, filters] as const,
};

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

export function useGetBooking(bookingId: string, clubId: string) {
    return useQuery({
        queryKey: bookingKeys.detail(bookingId),
        queryFn: (): Promise<Booking> => getBookingEndpoint(bookingId, clubId),
        enabled: Boolean(bookingId) && Boolean(clubId),
    });
}

export function useCreateBooking(clubId: string) {
    const queryClient = useQueryClient();
    return useMutation<Booking, Error, BookingInput>({
        mutationFn: (data: BookingInput) => createBookingEndpoint(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: bookingKeys.all(clubId) });
        },
    });
}

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

export function useInvitePlayer(clubId: string, bookingId: string) {
    const queryClient = useQueryClient();
    return useMutation<Booking, Error, InvitePlayerInput>({
        mutationFn: (data: InvitePlayerInput) => invitePlayerEndpoint(bookingId, clubId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: bookingKeys.detail(bookingId) });
        },
    });
}

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

export function useAddEquipmentRental(clubId: string, bookingId: string) {
    const queryClient = useQueryClient();
    return useMutation<EquipmentRental, Error, EquipmentRentalInput>({
        mutationFn: (data: EquipmentRentalInput) =>
            addEquipmentRentalEndpoint(bookingId, clubId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: bookingKeys.detail(bookingId) });
        },
    });
}
