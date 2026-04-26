import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

import {
    useListTrainers,
    useGetTrainerAvailability,
    useSetTrainerAvailability,
    useUpdateTrainerAvailability,
    useDeleteTrainerAvailability,
    useGetTrainerBookings,
} from "./trainer.hooks";

vi.mock("@repo/api-client/modules/share", () => ({
    listTrainersEndpoint: vi.fn(),
}));
vi.mock("@repo/api-client/modules/staff", () => ({
    getTrainerAvailabilityEndpoint: vi.fn(),
    setTrainerAvailabilityEndpoint: vi.fn(),
    updateTrainerAvailabilityEndpoint: vi.fn(),
    deleteTrainerAvailabilityEndpoint: vi.fn(),
    getTrainerBookingsEndpoint: vi.fn(),
}));
import * as shareApi from "@repo/api-client/modules/share";
import * as staffApi from "@repo/api-client/modules/staff";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CLUB_ID = "club-1";
const TRAINER_ID = "trainer-1";
const AVAILABILITY_ID = "avail-1";

function makeWrapper() {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    return { client, Wrapper };
}

const mockTrainer = {
    id: TRAINER_ID,
    user_id: "user-1",
    club_id: CLUB_ID,
    bio: "Experienced padel trainer",
    is_active: true,
    availability: [],
};

const mockAvailability = {
    id: AVAILABILITY_ID,
    staff_profile_id: "profile-1",
    day_of_week: 1,
    start_time: "09:00",
    end_time: "17:00",
    set_by_user_id: "user-1",
    effective_from: "2026-01-01",
    effective_until: null,
    notes: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
};

const mockBooking = {
    booking_id: "booking-1",
    club_id: CLUB_ID,
    court_id: "court-1",
    court_name: "Court A",
    booking_type: "lesson_individual" as const,
    status: "confirmed" as const,
    start_datetime: "2026-04-12T10:00:00Z",
    end_datetime: "2026-04-12T11:00:00Z",
    participants: [],
};

// ---------------------------------------------------------------------------
// useListTrainers
// ---------------------------------------------------------------------------

describe("useListTrainers", () => {
    beforeEach(() => vi.clearAllMocks());

    it("returns trainers for a club", async () => {
        vi.mocked(shareApi.listTrainersEndpoint).mockResolvedValue([mockTrainer]);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useListTrainers(CLUB_ID), { wrapper: Wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([mockTrainer]);
    });

    it("does not fetch when clubId is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useListTrainers(""), { wrapper: Wrapper });
        expect(shareApi.listTrainersEndpoint).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// useGetTrainerAvailability
// ---------------------------------------------------------------------------

describe("useGetTrainerAvailability", () => {
    beforeEach(() => vi.clearAllMocks());

    it("returns availability for a trainer", async () => {
        vi.mocked(staffApi.getTrainerAvailabilityEndpoint).mockResolvedValue([mockAvailability]);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useGetTrainerAvailability(TRAINER_ID), {
            wrapper: Wrapper,
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([mockAvailability]);
    });

    it("does not fetch when trainerId is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useGetTrainerAvailability(""), { wrapper: Wrapper });
        expect(staffApi.getTrainerAvailabilityEndpoint).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// useSetTrainerAvailability
// ---------------------------------------------------------------------------

describe("useSetTrainerAvailability", () => {
    beforeEach(() => vi.clearAllMocks());

    it("calls endpoint and invalidates availability", async () => {
        vi.mocked(staffApi.setTrainerAvailabilityEndpoint).mockResolvedValue(mockAvailability);
        const { Wrapper, client } = makeWrapper();
        const invalidate = vi.spyOn(client, "invalidateQueries");
        const { result } = renderHook(() => useSetTrainerAvailability(TRAINER_ID), {
            wrapper: Wrapper,
        });
        result.current.mutate({
            club_id: CLUB_ID,
            day_of_week: 1,
            start_time: "09:00",
            end_time: "17:00",
            effective_from: "2026-01-01",
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["trainers", TRAINER_ID, "availability"] })
        );
    });
});

// ---------------------------------------------------------------------------
// useUpdateTrainerAvailability
// ---------------------------------------------------------------------------

describe("useUpdateTrainerAvailability", () => {
    beforeEach(() => vi.clearAllMocks());

    it("calls endpoint and invalidates availability", async () => {
        vi.mocked(staffApi.updateTrainerAvailabilityEndpoint).mockResolvedValue(mockAvailability);
        const { Wrapper, client } = makeWrapper();
        const invalidate = vi.spyOn(client, "invalidateQueries");
        const { result } = renderHook(
            () => useUpdateTrainerAvailability(TRAINER_ID, AVAILABILITY_ID),
            { wrapper: Wrapper }
        );
        result.current.mutate({ start_time: "10:00" });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["trainers", TRAINER_ID, "availability"] })
        );
    });
});

// ---------------------------------------------------------------------------
// useDeleteTrainerAvailability
// ---------------------------------------------------------------------------

describe("useDeleteTrainerAvailability", () => {
    beforeEach(() => vi.clearAllMocks());

    it("calls endpoint and invalidates availability", async () => {
        vi.mocked(staffApi.deleteTrainerAvailabilityEndpoint).mockResolvedValue(undefined);
        const { Wrapper, client } = makeWrapper();
        const invalidate = vi.spyOn(client, "invalidateQueries");
        const { result } = renderHook(() => useDeleteTrainerAvailability(TRAINER_ID), {
            wrapper: Wrapper,
        });
        result.current.mutate(AVAILABILITY_ID);
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["trainers", TRAINER_ID, "availability"] })
        );
    });
});

// ---------------------------------------------------------------------------
// useGetTrainerBookings
// ---------------------------------------------------------------------------

describe("useGetTrainerBookings", () => {
    beforeEach(() => vi.clearAllMocks());

    it("returns bookings for a trainer", async () => {
        vi.mocked(staffApi.getTrainerBookingsEndpoint).mockResolvedValue([mockBooking]);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useGetTrainerBookings(TRAINER_ID), {
            wrapper: Wrapper,
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([mockBooking]);
    });

    it("does not fetch when trainerId is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useGetTrainerBookings(""), { wrapper: Wrapper });
        expect(staffApi.getTrainerBookingsEndpoint).not.toHaveBeenCalled();
    });
});
