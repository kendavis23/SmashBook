import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// ---------------------------------------------------------------------------
// Mock the entire staff api-client module
// ---------------------------------------------------------------------------

vi.mock("@repo/api-client/modules/staff", () => ({
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
    // court endpoints must be present so the module resolves cleanly
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
    useListClubs,
    useCreateClub,
    useGetClub,
    useUpdateClub,
    useUpdateClubSettings,
    useGetOperatingHours,
    useSetOperatingHours,
    useGetPricingRules,
    useSetPricingRules,
    useStripeConnect,
} from "./club.hooks";

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

const mockClub = {
    id: CLUB_ID,
    tenant_id: "tenant-1",
    name: "Test Club",
    address: null,
    currency: "EUR",
    booking_duration_minutes: 90,
    max_advance_booking_days: 14,
    min_booking_notice_hours: 2,
    max_bookings_per_player_per_week: null,
    skill_level_min: 1,
    skill_level_max: 10,
    skill_range_allowed: 2,
    open_games_enabled: true,
    min_players_to_confirm: 2,
    auto_cancel_hours_before: null,
    cancellation_notice_hours: 24,
    cancellation_refund_pct: 100,
    reminder_hours_before: 2,
    waitlist_enabled: false,
};

// ---------------------------------------------------------------------------
// useListClubs
// ---------------------------------------------------------------------------

describe("useListClubs", () => {
    it("returns club list on success", async () => {
        vi.mocked(staffApi.listClubsEndpoint).mockResolvedValue([mockClub]);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useListClubs(), { wrapper: Wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([mockClub]);
        expect(staffApi.listClubsEndpoint).toHaveBeenCalledTimes(1);
    });

    it("surfaces error when endpoint rejects", async () => {
        vi.mocked(staffApi.listClubsEndpoint).mockRejectedValue(new Error("network error"));
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useListClubs(), { wrapper: Wrapper });
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

// ---------------------------------------------------------------------------
// useGetClub
// ---------------------------------------------------------------------------

describe("useGetClub", () => {
    it("fetches a single club by id", async () => {
        vi.mocked(staffApi.getClubEndpoint).mockResolvedValue(mockClub);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useGetClub(CLUB_ID), { wrapper: Wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(mockClub);
        expect(staffApi.getClubEndpoint).toHaveBeenCalledWith(CLUB_ID);
    });

    it("does not fetch when clubId is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useGetClub(""), { wrapper: Wrapper });
        expect(staffApi.getClubEndpoint).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// useCreateClub
// ---------------------------------------------------------------------------

describe("useCreateClub", () => {
    it("calls createClubEndpoint and invalidates clubs list", async () => {
        vi.mocked(staffApi.createClubEndpoint).mockResolvedValue(mockClub);
        const { Wrapper, client } = makeWrapper();
        const invalidate = vi.spyOn(client, "invalidateQueries");
        const { result } = renderHook(() => useCreateClub(), { wrapper: Wrapper });
        result.current.mutate({ name: "Test Club" });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(staffApi.createClubEndpoint).toHaveBeenCalledWith({ name: "Test Club" });
        expect(invalidate).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ["clubs"] }));
    });
});

// ---------------------------------------------------------------------------
// useUpdateClub
// ---------------------------------------------------------------------------

describe("useUpdateClub", () => {
    it("calls updateClubEndpoint with clubId and data", async () => {
        vi.mocked(staffApi.updateClubEndpoint).mockResolvedValue(mockClub);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useUpdateClub(CLUB_ID), { wrapper: Wrapper });
        result.current.mutate({ name: "Updated" });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(staffApi.updateClubEndpoint).toHaveBeenCalledWith(CLUB_ID, { name: "Updated" });
    });
});

// ---------------------------------------------------------------------------
// useUpdateClubSettings
// ---------------------------------------------------------------------------

describe("useUpdateClubSettings", () => {
    it("calls updateClubSettingsEndpoint with settings", async () => {
        const settings = { booking_duration_minutes: 60 };
        vi.mocked(staffApi.updateClubSettingsEndpoint).mockResolvedValue(settings as never);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useUpdateClubSettings(CLUB_ID), { wrapper: Wrapper });
        result.current.mutate(settings);
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(staffApi.updateClubSettingsEndpoint).toHaveBeenCalledWith(CLUB_ID, settings);
    });
});

// ---------------------------------------------------------------------------
// useGetOperatingHours
// ---------------------------------------------------------------------------

describe("useGetOperatingHours", () => {
    it("fetches operating hours for a club", async () => {
        const hours = [{ day_of_week: 1, open_time: "08:00", close_time: "22:00" }];
        vi.mocked(staffApi.getOperatingHoursEndpoint).mockResolvedValue(hours);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useGetOperatingHours(CLUB_ID), { wrapper: Wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(hours);
    });

    it("does not fetch when clubId is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useGetOperatingHours(""), { wrapper: Wrapper });
        expect(staffApi.getOperatingHoursEndpoint).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// useSetOperatingHours
// ---------------------------------------------------------------------------

describe("useSetOperatingHours", () => {
    it("calls setOperatingHoursEndpoint with data", async () => {
        const hours = [{ day_of_week: 1, open_time: "08:00", close_time: "22:00" }];
        vi.mocked(staffApi.setOperatingHoursEndpoint).mockResolvedValue(hours);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useSetOperatingHours(CLUB_ID), { wrapper: Wrapper });
        result.current.mutate(hours);
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(staffApi.setOperatingHoursEndpoint).toHaveBeenCalledWith(CLUB_ID, hours);
    });
});

// ---------------------------------------------------------------------------
// useGetPricingRules
// ---------------------------------------------------------------------------

describe("useGetPricingRules", () => {
    it("fetches and transforms pricing rules via toPricingRule", async () => {
        const raw = [
            {
                label: "Peak",
                day_of_week: 1,
                start_time: "18:00",
                end_time: "21:00",
                price_per_slot: 20,
                incentive_expires_at: "2026-04-08T14:30:00Z",
            },
        ];
        vi.mocked(staffApi.getPricingRulesEndpoint).mockResolvedValue(raw as never);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useGetPricingRules(CLUB_ID), { wrapper: Wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        // toPricingRule converts ISO → datetime-local
        expect(result.current.data?.[0].incentive_expires_at).toMatch(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/
        );
    });

    it("does not fetch when clubId is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useGetPricingRules(""), { wrapper: Wrapper });
        expect(staffApi.getPricingRulesEndpoint).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// useSetPricingRules
// ---------------------------------------------------------------------------

describe("useSetPricingRules", () => {
    it("calls setPricingRulesEndpoint with rules", async () => {
        const rules = [
            {
                label: "Peak",
                day_of_week: 1,
                start_time: "18:00",
                end_time: "21:00",
                price_per_slot: 20,
            },
        ];
        vi.mocked(staffApi.setPricingRulesEndpoint).mockResolvedValue(rules as never);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useSetPricingRules(CLUB_ID), { wrapper: Wrapper });
        result.current.mutate(rules);
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(staffApi.setPricingRulesEndpoint).toHaveBeenCalledWith(CLUB_ID, rules);
    });
});

// ---------------------------------------------------------------------------
// useStripeConnect
// ---------------------------------------------------------------------------

describe("useStripeConnect", () => {
    it("calls stripeConnectEndpoint with data", async () => {
        const req = {
            return_url: "https://example.com/return",
            refresh_url: "https://example.com/refresh",
        };
        vi.mocked(staffApi.stripeConnectEndpoint).mockResolvedValue({
            onboarding_url: "https://stripe.com/onboard",
        });
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useStripeConnect(CLUB_ID), { wrapper: Wrapper });
        result.current.mutate(req);
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(staffApi.stripeConnectEndpoint).toHaveBeenCalledWith(CLUB_ID, req);
    });
});
