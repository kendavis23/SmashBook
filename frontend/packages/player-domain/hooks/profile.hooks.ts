import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    getMyProfileEndpoint,
    updateMyProfileEndpoint,
    getMyBookingsEndpoint,
    getMyMatchHistoryEndpoint,
} from "@repo/api-client/modules/player";
import type {
    UserProfile,
    UserProfileUpdateInput,
    PlayerBookingItem,
    PlayerBookings,
} from "../models";

const profileKeys = {
    me: () => ["player", "profile"] as const,
    bookings: () => ["player", "bookings"] as const,
    matchHistory: () => ["player", "match-history"] as const,
};

export function useMyProfile() {
    return useQuery({
        queryKey: profileKeys.me(),
        queryFn: (): Promise<UserProfile> => getMyProfileEndpoint(),
    });
}

export function useUpdateMyProfile() {
    const queryClient = useQueryClient();
    return useMutation<UserProfile, Error, UserProfileUpdateInput>({
        mutationFn: (data: UserProfileUpdateInput) => updateMyProfileEndpoint(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: profileKeys.me() });
        },
    });
}

export function useMyBookings() {
    return useQuery({
        queryKey: profileKeys.bookings(),
        queryFn: (): Promise<PlayerBookings> => getMyBookingsEndpoint(),
    });
}

export function useMyMatchHistory() {
    return useQuery({
        queryKey: profileKeys.matchHistory(),
        queryFn: (): Promise<PlayerBookingItem[]> => getMyMatchHistoryEndpoint(),
    });
}
