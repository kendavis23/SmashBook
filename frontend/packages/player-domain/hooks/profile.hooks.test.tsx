import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import {
    useMyProfile,
    useUpdateMyProfile,
    useMyBookings,
    useMyMatchHistory,
} from "./profile.hooks";

vi.mock("@repo/api-client/modules/player", () => ({
    getMyProfileEndpoint: vi.fn(),
    updateMyProfileEndpoint: vi.fn(),
    getMyBookingsEndpoint: vi.fn(),
    getMyMatchHistoryEndpoint: vi.fn(),
}));

import * as playerApi from "@repo/api-client/modules/player";

function makeWrapper() {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    return { client, Wrapper };
}

const mockProfile = {
    id: "user-1",
    email: "player@test.com",
    full_name: "Test Player",
    phone: "+1234567890",
    photo_url: null,
    skill_level: 3,
    preferred_notification_channel: "email" as const,
    is_active: true,
};

const mockBookings = {
    upcoming: [
        {
            booking_id: "booking-1",
            club_id: "club-1",
            court_id: "court-1",
            court_name: "Court 1",
            booking_type: "regular" as const,
            status: "confirmed" as const,
            start_datetime: "2026-05-01T10:00:00Z",
            end_datetime: "2026-05-01T11:00:00Z",
            role: "organiser" as const,
            invite_status: "accepted" as const,
            payment_status: "paid" as const,
            amount_due: 20,
        },
    ],
    past: [],
};

const mockMatchHistory = [
    {
        booking_id: "booking-2",
        club_id: "club-1",
        court_id: "court-2",
        court_name: "Court 2",
        booking_type: "regular" as const,
        status: "completed" as const,
        start_datetime: "2026-04-01T10:00:00Z",
        end_datetime: "2026-04-01T11:00:00Z",
        role: "player" as const,
        invite_status: "accepted" as const,
        payment_status: "paid" as const,
        amount_due: 20,
    },
];

beforeEach(() => {
    vi.clearAllMocks();
});

describe("useMyProfile", () => {
    it("returns the player profile", async () => {
        vi.mocked(playerApi.getMyProfileEndpoint).mockResolvedValue(mockProfile);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useMyProfile(), { wrapper: Wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(mockProfile);
    });

    it("calls getMyProfileEndpoint once", async () => {
        vi.mocked(playerApi.getMyProfileEndpoint).mockResolvedValue(mockProfile);
        const { Wrapper } = makeWrapper();
        renderHook(() => useMyProfile(), { wrapper: Wrapper });
        await waitFor(() => expect(playerApi.getMyProfileEndpoint).toHaveBeenCalledTimes(1));
    });
});

describe("useUpdateMyProfile", () => {
    it("calls endpoint and invalidates profile cache", async () => {
        vi.mocked(playerApi.updateMyProfileEndpoint).mockResolvedValue(mockProfile);
        const { Wrapper, client } = makeWrapper();
        const invalidate = vi.spyOn(client, "invalidateQueries");
        const { result } = renderHook(() => useUpdateMyProfile(), { wrapper: Wrapper });
        result.current.mutate({ full_name: "New Name" });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(playerApi.updateMyProfileEndpoint).toHaveBeenCalledWith({ full_name: "New Name" });
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["player", "profile"] })
        );
    });
});

describe("useMyBookings", () => {
    it("returns upcoming and past bookings with no params", async () => {
        vi.mocked(playerApi.getMyBookingsEndpoint).mockResolvedValue(mockBookings);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useMyBookings(), { wrapper: Wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(mockBookings);
        expect(playerApi.getMyBookingsEndpoint).toHaveBeenCalledWith(undefined);
    });

    it("forwards past_from and past_to to the endpoint", async () => {
        vi.mocked(playerApi.getMyBookingsEndpoint).mockResolvedValue(mockBookings);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(
            () => useMyBookings({ past_from: "2026-04-01", past_to: "2026-04-30" }),
            { wrapper: Wrapper }
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(playerApi.getMyBookingsEndpoint).toHaveBeenCalledWith({
            past_from: "2026-04-01",
            past_to: "2026-04-30",
        });
    });
});

describe("useMyMatchHistory", () => {
    it("returns match history items", async () => {
        vi.mocked(playerApi.getMyMatchHistoryEndpoint).mockResolvedValue(mockMatchHistory);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useMyMatchHistory(), { wrapper: Wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(mockMatchHistory);
    });
});
