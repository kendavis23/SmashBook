import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// ---------------------------------------------------------------------------
// Mock the entire staff api-client module
// ---------------------------------------------------------------------------

vi.mock("@repo/api-client/modules/staff", () => ({
    // club endpoints must be present so the module resolves cleanly
    listClubsEndpoint: vi.fn(),
    createClubEndpoint: vi.fn(),
    getClubEndpoint: vi.fn(),
    updateClubEndpoint: vi.fn(),
    updateClubSettingsEndpoint: vi.fn(),
    getOperatingHoursEndpoint: vi.fn(),
    setOperatingHoursEndpoint: vi.fn(),
    getPricingRulesEndpoint: vi.fn(),
    setPricingRulesEndpoint: vi.fn(),
    stripeConnectEndpoint: vi.fn(),
    // court endpoints
    listCourtsEndpoint: vi.fn(),
    createCourtEndpoint: vi.fn(),
    getCourtEndpoint: vi.fn(),
    updateCourtEndpoint: vi.fn(),
    deleteCourtEndpoint: vi.fn(),
    getCourtAvailabilityEndpoint: vi.fn(),
    listCalendarReservationsEndpoint: vi.fn(),
    createCalendarReservationEndpoint: vi.fn(),
    updateCalendarReservationEndpoint: vi.fn(),
    deleteCalendarReservationEndpoint: vi.fn(),
}));

import * as staffApi from "@repo/api-client/modules/staff";

import {
    useListCourts,
    useCreateCourt,
    useGetCourt,
    useUpdateCourt,
    useDeleteCourt,
    useGetCourtAvailability,
    useListCalendarReservations,
    useCreateCalendarReservation,
    useUpdateCalendarReservation,
    useDeleteCalendarReservation,
} from "./court.hooks";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeWrapper() {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    return { client, Wrapper };
}

beforeEach(() => {
    vi.clearAllMocks();
});

const CLUB_ID = "club-123";
const COURT_ID = "court-456";
const RESERVATION_ID = "res-789";

const mockCourt = {
    id: COURT_ID,
    club_id: CLUB_ID,
    name: "Court 1",
    surface_type: "artificial_grass" as const,
    has_lighting: true,
    lighting_surcharge: 5,
    is_active: true,
};

const mockReservation = {
    id: RESERVATION_ID,
    club_id: CLUB_ID,
    court_id: COURT_ID,
    reservation_type: "block" as const,
    title: "Maintenance",
    start_datetime: "2026-04-08T08:00:00Z",
    end_datetime: "2026-04-08T10:00:00Z",
    anchor_skill_level: null,
    skill_range_above: null,
    skill_range_below: null,
    allowed_booking_types: null,
    is_recurring: false,
    recurrence_rule: null,
    recurrence_end_date: null,
    created_by: "user-1",
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
};

// ---------------------------------------------------------------------------
// useListCourts
// ---------------------------------------------------------------------------

describe("useListCourts", () => {
    it("returns courts for a club", async () => {
        vi.mocked(staffApi.listCourtsEndpoint).mockResolvedValue([mockCourt]);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useListCourts(CLUB_ID), { wrapper: Wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([mockCourt]);
        expect(staffApi.listCourtsEndpoint).toHaveBeenCalledWith(CLUB_ID);
    });

    it("does not fetch when clubId is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useListCourts(""), { wrapper: Wrapper });
        expect(staffApi.listCourtsEndpoint).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// useGetCourt
// ---------------------------------------------------------------------------

describe("useGetCourt", () => {
    it("fetches a single court by id", async () => {
        vi.mocked(staffApi.getCourtEndpoint).mockResolvedValue(mockCourt);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useGetCourt(CLUB_ID, COURT_ID), { wrapper: Wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(mockCourt);
        expect(staffApi.getCourtEndpoint).toHaveBeenCalledWith(CLUB_ID, COURT_ID);
    });

    it("does not fetch when clubId is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useGetCourt("", COURT_ID), { wrapper: Wrapper });
        expect(staffApi.getCourtEndpoint).not.toHaveBeenCalled();
    });

    it("does not fetch when courtId is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useGetCourt(CLUB_ID, ""), { wrapper: Wrapper });
        expect(staffApi.getCourtEndpoint).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// useCreateCourt
// ---------------------------------------------------------------------------

describe("useCreateCourt", () => {
    it("calls createCourtEndpoint and invalidates courts list", async () => {
        vi.mocked(staffApi.createCourtEndpoint).mockResolvedValue(mockCourt);
        const { Wrapper, client } = makeWrapper();
        const invalidate = vi.spyOn(client, "invalidateQueries");
        const { result } = renderHook(() => useCreateCourt(CLUB_ID), { wrapper: Wrapper });
        result.current.mutate({ club_id: CLUB_ID, name: "Court 1", surface_type: "artificial_grass" });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(staffApi.createCourtEndpoint).toHaveBeenCalledWith(CLUB_ID, {
            club_id: CLUB_ID,
            name: "Court 1",
            surface_type: "artificial_grass",
        });
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["courts", CLUB_ID] })
        );
    });
});

// ---------------------------------------------------------------------------
// useUpdateCourt
// ---------------------------------------------------------------------------

describe("useUpdateCourt", () => {
    it("calls updateCourtEndpoint and invalidates list and detail", async () => {
        vi.mocked(staffApi.updateCourtEndpoint).mockResolvedValue(mockCourt);
        const { Wrapper, client } = makeWrapper();
        const invalidate = vi.spyOn(client, "invalidateQueries");
        const { result } = renderHook(() => useUpdateCourt(CLUB_ID, COURT_ID), { wrapper: Wrapper });
        result.current.mutate({ name: "Court A" });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(staffApi.updateCourtEndpoint).toHaveBeenCalledWith(CLUB_ID, COURT_ID, { name: "Court A" });
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["courts", CLUB_ID, COURT_ID] })
        );
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["courts", CLUB_ID] })
        );
    });
});

// ---------------------------------------------------------------------------
// useDeleteCourt
// ---------------------------------------------------------------------------

describe("useDeleteCourt", () => {
    it("calls deleteCourtEndpoint and invalidates courts list", async () => {
        vi.mocked(staffApi.deleteCourtEndpoint).mockResolvedValue(undefined);
        const { Wrapper, client } = makeWrapper();
        const invalidate = vi.spyOn(client, "invalidateQueries");
        const { result } = renderHook(() => useDeleteCourt(CLUB_ID), { wrapper: Wrapper });
        result.current.mutate(COURT_ID);
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(staffApi.deleteCourtEndpoint).toHaveBeenCalledWith(CLUB_ID, COURT_ID);
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["courts", CLUB_ID] })
        );
    });
});

// ---------------------------------------------------------------------------
// useGetCourtAvailability
// ---------------------------------------------------------------------------

describe("useGetCourtAvailability", () => {
    it("fetches availability for a court on a date", async () => {
        const mockAvailability = { court_id: COURT_ID, date: "2026-04-08", slots: [] };
        vi.mocked(staffApi.getCourtAvailabilityEndpoint).mockResolvedValue(mockAvailability);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(
            () => useGetCourtAvailability(CLUB_ID, COURT_ID, "2026-04-08"),
            { wrapper: Wrapper }
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(mockAvailability);
        expect(staffApi.getCourtAvailabilityEndpoint).toHaveBeenCalledWith(
            CLUB_ID,
            COURT_ID,
            "2026-04-08"
        );
    });

    it("does not fetch when date is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useGetCourtAvailability(CLUB_ID, COURT_ID, ""), { wrapper: Wrapper });
        expect(staffApi.getCourtAvailabilityEndpoint).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// useListCalendarReservations
// ---------------------------------------------------------------------------

describe("useListCalendarReservations", () => {
    it("returns reservations for a club", async () => {
        vi.mocked(staffApi.listCalendarReservationsEndpoint).mockResolvedValue([mockReservation]);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useListCalendarReservations(CLUB_ID), {
            wrapper: Wrapper,
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([mockReservation]);
        expect(staffApi.listCalendarReservationsEndpoint).toHaveBeenCalledWith(CLUB_ID);
    });

    it("does not fetch when clubId is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useListCalendarReservations(""), { wrapper: Wrapper });
        expect(staffApi.listCalendarReservationsEndpoint).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// useCreateCalendarReservation
// ---------------------------------------------------------------------------

describe("useCreateCalendarReservation", () => {
    it("calls createCalendarReservationEndpoint and invalidates list", async () => {
        vi.mocked(staffApi.createCalendarReservationEndpoint).mockResolvedValue(mockReservation);
        const { Wrapper, client } = makeWrapper();
        const invalidate = vi.spyOn(client, "invalidateQueries");
        const { result } = renderHook(() => useCreateCalendarReservation(CLUB_ID), {
            wrapper: Wrapper,
        });
        const data = {
            club_id: CLUB_ID,
            reservation_type: "block" as const,
            title: "Maintenance",
            start_datetime: "2026-04-08T08:00:00Z",
            end_datetime: "2026-04-08T10:00:00Z",
        };
        result.current.mutate(data);
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(staffApi.createCalendarReservationEndpoint).toHaveBeenCalledWith(CLUB_ID, data);
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["calendar-reservations", CLUB_ID] })
        );
    });
});

// ---------------------------------------------------------------------------
// useUpdateCalendarReservation
// ---------------------------------------------------------------------------

describe("useUpdateCalendarReservation", () => {
    it("calls updateCalendarReservationEndpoint and invalidates list", async () => {
        vi.mocked(staffApi.updateCalendarReservationEndpoint).mockResolvedValue(mockReservation);
        const { Wrapper, client } = makeWrapper();
        const invalidate = vi.spyOn(client, "invalidateQueries");
        const { result } = renderHook(
            () => useUpdateCalendarReservation(CLUB_ID, RESERVATION_ID),
            { wrapper: Wrapper }
        );
        result.current.mutate({ title: "Updated" });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(staffApi.updateCalendarReservationEndpoint).toHaveBeenCalledWith(
            CLUB_ID,
            RESERVATION_ID,
            { title: "Updated" }
        );
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["calendar-reservations", CLUB_ID] })
        );
    });
});

// ---------------------------------------------------------------------------
// useDeleteCalendarReservation
// ---------------------------------------------------------------------------

describe("useDeleteCalendarReservation", () => {
    it("calls deleteCalendarReservationEndpoint and invalidates list", async () => {
        vi.mocked(staffApi.deleteCalendarReservationEndpoint).mockResolvedValue(undefined);
        const { Wrapper, client } = makeWrapper();
        const invalidate = vi.spyOn(client, "invalidateQueries");
        const { result } = renderHook(() => useDeleteCalendarReservation(CLUB_ID), {
            wrapper: Wrapper,
        });
        result.current.mutate(RESERVATION_ID);
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(staffApi.deleteCalendarReservationEndpoint).toHaveBeenCalledWith(
            CLUB_ID,
            RESERVATION_ID
        );
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["calendar-reservations", CLUB_ID] })
        );
    });
});
