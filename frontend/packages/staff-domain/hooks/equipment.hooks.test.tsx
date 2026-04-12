import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// ---------------------------------------------------------------------------
// Mock the entire staff api-client module
// ---------------------------------------------------------------------------

vi.mock("@repo/api-client/modules/staff", () => ({
    // club endpoints
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
    updateCourtEndpoint: vi.fn(),
    getCourtAvailabilityEndpoint: vi.fn(),
    listCalendarReservationsEndpoint: vi.fn(),
    createCalendarReservationEndpoint: vi.fn(),
    getCalendarReservationEndpoint: vi.fn(),
    updateCalendarReservationEndpoint: vi.fn(),
    deleteCalendarReservationEndpoint: vi.fn(),
    // booking endpoints
    listBookingsEndpoint: vi.fn(),
    getBookingEndpoint: vi.fn(),
    createBookingEndpoint: vi.fn(),
    updateBookingEndpoint: vi.fn(),
    cancelBookingEndpoint: vi.fn(),
    joinBookingEndpoint: vi.fn(),
    invitePlayerEndpoint: vi.fn(),
    respondInviteEndpoint: vi.fn(),
    getCalendarViewEndpoint: vi.fn(),
    listOpenGamesEndpoint: vi.fn(),
    // membership endpoints
    createMembershipPlanEndpoint: vi.fn(),
    listMembershipPlansEndpoint: vi.fn(),
    getMembershipPlanEndpoint: vi.fn(),
    updateMembershipPlanEndpoint: vi.fn(),
    // equipment endpoints
    listEquipmentEndpoint: vi.fn(),
    createEquipmentEndpoint: vi.fn(),
    updateEquipmentEndpoint: vi.fn(),
    retireEquipmentEndpoint: vi.fn(),
}));

import * as staffApi from "@repo/api-client/modules/staff";

import {
    useListEquipment,
    useCreateEquipment,
    useUpdateEquipment,
    useRetireEquipment,
} from "./equipment.hooks";

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

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const CLUB_ID = "club-123";
const ITEM_ID = "item-456";

const mockItem = {
    id: ITEM_ID,
    item_type: "racket" as const,
    name: "Head Graphene 360",
    rental_price: 5.0,
    quantity_total: 10,
    quantity_available: 8,
    condition: "good" as const,
    notes: null,
};

// ---------------------------------------------------------------------------
// useListEquipment
// ---------------------------------------------------------------------------

describe("useListEquipment", () => {
    it("returns equipment items for a club", async () => {
        vi.mocked(staffApi.listEquipmentEndpoint).mockResolvedValue([mockItem]);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useListEquipment(CLUB_ID), { wrapper: Wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([mockItem]);
        expect(staffApi.listEquipmentEndpoint).toHaveBeenCalledWith(CLUB_ID);
    });

    it("does not fetch when clubId is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useListEquipment(""), { wrapper: Wrapper });
        expect(staffApi.listEquipmentEndpoint).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// useCreateEquipment
// ---------------------------------------------------------------------------

describe("useCreateEquipment", () => {
    it("calls createEquipmentEndpoint and invalidates list", async () => {
        vi.mocked(staffApi.createEquipmentEndpoint).mockResolvedValue(mockItem);
        const { Wrapper, client } = makeWrapper();
        const invalidate = vi.spyOn(client, "invalidateQueries");
        const { result } = renderHook(() => useCreateEquipment(CLUB_ID), { wrapper: Wrapper });
        result.current.mutate({
            item_type: "racket",
            name: "Head Graphene 360",
            quantity_total: 10,
            rental_price: 5.0,
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(staffApi.createEquipmentEndpoint).toHaveBeenCalledWith(CLUB_ID, {
            item_type: "racket",
            name: "Head Graphene 360",
            quantity_total: 10,
            rental_price: 5.0,
        });
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["equipment", CLUB_ID] })
        );
    });
});

// ---------------------------------------------------------------------------
// useUpdateEquipment
// ---------------------------------------------------------------------------

describe("useUpdateEquipment", () => {
    it("calls updateEquipmentEndpoint and invalidates detail and list", async () => {
        vi.mocked(staffApi.updateEquipmentEndpoint).mockResolvedValue(mockItem);
        const { Wrapper, client } = makeWrapper();
        const invalidate = vi.spyOn(client, "invalidateQueries");
        const { result } = renderHook(() => useUpdateEquipment(CLUB_ID, ITEM_ID), {
            wrapper: Wrapper,
        });
        result.current.mutate({ name: "Updated Racket", rental_price: 6.0 });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(staffApi.updateEquipmentEndpoint).toHaveBeenCalledWith(ITEM_ID, CLUB_ID, {
            name: "Updated Racket",
            rental_price: 6.0,
        });
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["equipment", CLUB_ID, ITEM_ID] })
        );
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["equipment", CLUB_ID] })
        );
    });
});

// ---------------------------------------------------------------------------
// useRetireEquipment
// ---------------------------------------------------------------------------

describe("useRetireEquipment", () => {
    it("calls retireEquipmentEndpoint and invalidates list", async () => {
        vi.mocked(staffApi.retireEquipmentEndpoint).mockResolvedValue(undefined);
        const { Wrapper, client } = makeWrapper();
        const invalidate = vi.spyOn(client, "invalidateQueries");
        const { result } = renderHook(() => useRetireEquipment(CLUB_ID), { wrapper: Wrapper });
        result.current.mutate(ITEM_ID);
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(staffApi.retireEquipmentEndpoint).toHaveBeenCalledWith(ITEM_ID, CLUB_ID);
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["equipment", CLUB_ID] })
        );
    });
});
