import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// ---------------------------------------------------------------------------
// Mock the entire staff api-client module
// ---------------------------------------------------------------------------

vi.mock("@repo/api-client/modules/staff", () => ({
    // club endpoints — must be present so the module resolves cleanly
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
    createRecurringBookingEndpoint: vi.fn(),
    updateBookingEndpoint: vi.fn(),
    cancelBookingEndpoint: vi.fn(),
    joinBookingEndpoint: vi.fn(),
    invitePlayerEndpoint: vi.fn(),
    respondInviteEndpoint: vi.fn(),
    getCalendarViewEndpoint: vi.fn(),
    listOpenGamesEndpoint: vi.fn(),
}));

import * as staffApi from "@repo/api-client/modules/staff";

import {
    useListBookings,
    useGetBooking,
    useGetCalendarView,
    useListOpenGames,
    useCreateBooking,
    useCreateRecurringBooking,
    useUpdateBooking,
    useCancelBooking,
    useJoinBooking,
    useInvitePlayer,
    useRespondInvite,
} from "./booking.hooks";

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
const BOOKING_ID = "booking-456";
const USER_ID = "user-789";

const mockPlayer = {
    id: "bp-1",
    booking_id: BOOKING_ID,
    user_id: USER_ID,
    full_name: "Alice Smith",
    role: "organiser" as const,
    invite_status: "accepted" as const,
    payment_status: "paid" as const,
    amount_due: 20,
};

const mockBooking = {
    id: BOOKING_ID,
    club_id: CLUB_ID,
    court_id: "court-1",
    court_name: "Court 1",
    booking_type: "regular" as const,
    status: "confirmed" as const,
    is_open_game: false,
    start_datetime: "2026-04-11T10:00:00Z",
    end_datetime: "2026-04-11T11:30:00Z",
    min_skill_level: null,
    max_skill_level: null,
    max_players: null,
    slots_available: 4,
    total_price: 40,
    notes: null,
    event_name: null,
    players: [mockPlayer],
    created_at: "2026-04-01T00:00:00Z",
};

const mockOpenGame = {
    id: "og-1",
    court_id: "court-1",
    court_name: "Court 1",
    start_datetime: "2026-04-11T10:00:00Z",
    end_datetime: "2026-04-11T11:30:00Z",
    min_skill_level: 3,
    max_skill_level: 5,
    slots_available: 2,
    total_price: 20,
};

const mockCalendarView = {
    view: "day",
    date_from: "2026-04-11",
    date_to: "2026-04-11",
    days: [
        {
            date: "2026-04-11",
            courts: [
                {
                    court_id: "court-1",
                    court_name: "Court 1",
                    slots: [],
                    time_slots: [],
                },
            ],
        },
    ],
};

// ---------------------------------------------------------------------------
// useListBookings
// ---------------------------------------------------------------------------

describe("useListBookings", () => {
    it("returns bookings for a club", async () => {
        vi.mocked(staffApi.listBookingsEndpoint).mockResolvedValue([mockBooking]);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useListBookings(CLUB_ID), { wrapper: Wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([mockBooking]);
        expect(staffApi.listBookingsEndpoint).toHaveBeenCalledWith({ club_id: CLUB_ID });
    });

    it("passes filters to the endpoint", async () => {
        vi.mocked(staffApi.listBookingsEndpoint).mockResolvedValue([mockBooking]);
        const { Wrapper } = makeWrapper();
        const filters = { booking_status: "confirmed" as const, court_id: "court-1" };
        const { result } = renderHook(() => useListBookings(CLUB_ID, filters), {
            wrapper: Wrapper,
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(staffApi.listBookingsEndpoint).toHaveBeenCalledWith({
            club_id: CLUB_ID,
            booking_status: "confirmed",
            court_id: "court-1",
        });
    });

    it("does not fetch when clubId is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useListBookings(""), { wrapper: Wrapper });
        expect(staffApi.listBookingsEndpoint).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// useGetBooking
// ---------------------------------------------------------------------------

describe("useGetBooking", () => {
    it("returns a single booking by id", async () => {
        vi.mocked(staffApi.getBookingEndpoint).mockResolvedValue(mockBooking);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useGetBooking(BOOKING_ID, CLUB_ID), {
            wrapper: Wrapper,
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(mockBooking);
        expect(staffApi.getBookingEndpoint).toHaveBeenCalledWith(BOOKING_ID, CLUB_ID);
    });

    it("does not fetch when bookingId is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useGetBooking("", CLUB_ID), { wrapper: Wrapper });
        expect(staffApi.getBookingEndpoint).not.toHaveBeenCalled();
    });

    it("does not fetch when clubId is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useGetBooking(BOOKING_ID, ""), { wrapper: Wrapper });
        expect(staffApi.getBookingEndpoint).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// useGetCalendarView
// ---------------------------------------------------------------------------

describe("useGetCalendarView", () => {
    it("returns the calendar view for a club", async () => {
        vi.mocked(staffApi.getCalendarViewEndpoint).mockResolvedValue(mockCalendarView);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(
            () => useGetCalendarView(CLUB_ID, { view: "day", anchor_date: "2026-04-11" }),
            { wrapper: Wrapper }
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(mockCalendarView);
        expect(staffApi.getCalendarViewEndpoint).toHaveBeenCalledWith({
            club_id: CLUB_ID,
            view: "day",
            anchor_date: "2026-04-11",
        });
    });

    it("does not fetch when clubId is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useGetCalendarView(""), { wrapper: Wrapper });
        expect(staffApi.getCalendarViewEndpoint).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// useListOpenGames
// ---------------------------------------------------------------------------

describe("useListOpenGames", () => {
    it("returns open games for a club", async () => {
        vi.mocked(staffApi.listOpenGamesEndpoint).mockResolvedValue([mockOpenGame]);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useListOpenGames(CLUB_ID), { wrapper: Wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([mockOpenGame]);
        expect(staffApi.listOpenGamesEndpoint).toHaveBeenCalledWith({ club_id: CLUB_ID });
    });

    it("does not fetch when clubId is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useListOpenGames(""), { wrapper: Wrapper });
        expect(staffApi.listOpenGamesEndpoint).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// useCreateBooking
// ---------------------------------------------------------------------------

describe("useCreateBooking", () => {
    it("calls createBookingEndpoint and invalidates bookings list", async () => {
        vi.mocked(staffApi.createBookingEndpoint).mockResolvedValue(mockBooking);
        const { Wrapper, client } = makeWrapper();
        const invalidate = vi.spyOn(client, "invalidateQueries");
        const { result } = renderHook(() => useCreateBooking(CLUB_ID), { wrapper: Wrapper });
        result.current.mutate({
            club_id: CLUB_ID,
            court_id: "court-1",
            start_datetime: "2026-04-11T10:00:00Z",
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(staffApi.createBookingEndpoint).toHaveBeenCalledWith({
            club_id: CLUB_ID,
            court_id: "court-1",
            start_datetime: "2026-04-11T10:00:00Z",
        });
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["bookings", CLUB_ID] })
        );
    });
});

// ---------------------------------------------------------------------------
// useCreateRecurringBooking
// ---------------------------------------------------------------------------

describe("useCreateRecurringBooking", () => {
    it("calls createRecurringBookingEndpoint and invalidates bookings list", async () => {
        vi.mocked(staffApi.createRecurringBookingEndpoint).mockResolvedValue({
            created: [mockBooking],
            skipped: [],
        });
        const { Wrapper, client } = makeWrapper();
        const invalidate = vi.spyOn(client, "invalidateQueries");
        const { result } = renderHook(() => useCreateRecurringBooking(CLUB_ID), {
            wrapper: Wrapper,
        });
        result.current.mutate({
            club_id: CLUB_ID,
            court_id: "court-1",
            first_start: "2026-04-11T10:00:00Z",
            recurrence_rule: "FREQ=WEEKLY;BYDAY=MO;COUNT=4",
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(staffApi.createRecurringBookingEndpoint).toHaveBeenCalledWith({
            club_id: CLUB_ID,
            court_id: "court-1",
            first_start: "2026-04-11T10:00:00Z",
            recurrence_rule: "FREQ=WEEKLY;BYDAY=MO;COUNT=4",
        });
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["bookings", CLUB_ID] })
        );
    });

    it("returns created and skipped bookings on success", async () => {
        const skipped = [{ occurrence: "2026-04-18T10:00:00Z", reason: "conflict" }];
        vi.mocked(staffApi.createRecurringBookingEndpoint).mockResolvedValue({
            created: [mockBooking],
            skipped,
        });
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useCreateRecurringBooking(CLUB_ID), {
            wrapper: Wrapper,
        });
        result.current.mutate({
            club_id: CLUB_ID,
            court_id: "court-1",
            first_start: "2026-04-11T10:00:00Z",
            recurrence_rule: "FREQ=WEEKLY;BYDAY=MO",
            recurrence_end_date: "2026-06-30",
            skip_conflicts: true,
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual({ created: [mockBooking], skipped });
    });
});

// ---------------------------------------------------------------------------
// useUpdateBooking
// ---------------------------------------------------------------------------

describe("useUpdateBooking", () => {
    it("calls updateBookingEndpoint and invalidates detail and list", async () => {
        vi.mocked(staffApi.updateBookingEndpoint).mockResolvedValue(mockBooking);
        const { Wrapper, client } = makeWrapper();
        const invalidate = vi.spyOn(client, "invalidateQueries");
        const { result } = renderHook(() => useUpdateBooking(CLUB_ID, BOOKING_ID), {
            wrapper: Wrapper,
        });
        result.current.mutate({ notes: "Updated notes" });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(staffApi.updateBookingEndpoint).toHaveBeenCalledWith(BOOKING_ID, CLUB_ID, {
            notes: "Updated notes",
        });
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["bookings", BOOKING_ID] })
        );
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["bookings", CLUB_ID] })
        );
    });
});

// ---------------------------------------------------------------------------
// useCancelBooking
// ---------------------------------------------------------------------------

describe("useCancelBooking", () => {
    it("calls cancelBookingEndpoint and invalidates detail and list", async () => {
        vi.mocked(staffApi.cancelBookingEndpoint).mockResolvedValue(mockBooking);
        const { Wrapper, client } = makeWrapper();
        const invalidate = vi.spyOn(client, "invalidateQueries");
        const { result } = renderHook(() => useCancelBooking(CLUB_ID), { wrapper: Wrapper });
        result.current.mutate(BOOKING_ID);
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(staffApi.cancelBookingEndpoint).toHaveBeenCalledWith(BOOKING_ID, CLUB_ID);
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["bookings", BOOKING_ID] })
        );
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["bookings", CLUB_ID] })
        );
    });
});

// ---------------------------------------------------------------------------
// useJoinBooking
// ---------------------------------------------------------------------------

describe("useJoinBooking", () => {
    it("calls joinBookingEndpoint and invalidates detail and list", async () => {
        vi.mocked(staffApi.joinBookingEndpoint).mockResolvedValue(mockBooking);
        const { Wrapper, client } = makeWrapper();
        const invalidate = vi.spyOn(client, "invalidateQueries");
        const { result } = renderHook(() => useJoinBooking(CLUB_ID, BOOKING_ID), {
            wrapper: Wrapper,
        });
        result.current.mutate();
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(staffApi.joinBookingEndpoint).toHaveBeenCalledWith(BOOKING_ID, CLUB_ID);
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["bookings", BOOKING_ID] })
        );
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["bookings", CLUB_ID] })
        );
    });
});

// ---------------------------------------------------------------------------
// useInvitePlayer
// ---------------------------------------------------------------------------

describe("useInvitePlayer", () => {
    it("calls invitePlayerEndpoint and invalidates booking detail", async () => {
        vi.mocked(staffApi.invitePlayerEndpoint).mockResolvedValue(mockBooking);
        const { Wrapper, client } = makeWrapper();
        const invalidate = vi.spyOn(client, "invalidateQueries");
        const { result } = renderHook(() => useInvitePlayer(CLUB_ID, BOOKING_ID), {
            wrapper: Wrapper,
        });
        result.current.mutate({ user_id: USER_ID });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(staffApi.invitePlayerEndpoint).toHaveBeenCalledWith(BOOKING_ID, CLUB_ID, {
            user_id: USER_ID,
        });
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["bookings", BOOKING_ID] })
        );
    });
});

// ---------------------------------------------------------------------------
// useRespondInvite
// ---------------------------------------------------------------------------

describe("useRespondInvite", () => {
    it("calls respondInviteEndpoint and invalidates detail and list", async () => {
        vi.mocked(staffApi.respondInviteEndpoint).mockResolvedValue(mockBooking);
        const { Wrapper, client } = makeWrapper();
        const invalidate = vi.spyOn(client, "invalidateQueries");
        const { result } = renderHook(() => useRespondInvite(CLUB_ID, BOOKING_ID), {
            wrapper: Wrapper,
        });
        result.current.mutate({ action: "accepted" });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(staffApi.respondInviteEndpoint).toHaveBeenCalledWith(BOOKING_ID, CLUB_ID, {
            action: "accepted",
        });
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["bookings", BOOKING_ID] })
        );
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["bookings", CLUB_ID] })
        );
    });
});
