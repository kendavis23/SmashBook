import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("@repo/api-client/modules/share", () => ({
    listOpenGamesEndpoint: vi.fn(),
    createBookingEndpoint: vi.fn(),
    getBookingEndpoint: vi.fn(),
    cancelBookingEndpoint: vi.fn(),
    invitePlayerEndpoint: vi.fn(),
}));

vi.mock("@repo/api-client/modules/player", () => ({
    joinBookingEndpoint: vi.fn(),
    respondInviteEndpoint: vi.fn(),
    addEquipmentRentalEndpoint: vi.fn(),
}));

import * as shareApi from "@repo/api-client/modules/share";
import * as playerApi from "@repo/api-client/modules/player";

import {
    useListOpenGames,
    useGetBooking,
    useCreateBooking,
    useCancelBooking,
    useInvitePlayer,
    useJoinBooking,
    useRespondInvite,
    useAddEquipmentRental,
} from "./booking.hooks";

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

describe("useListOpenGames", () => {
    it("returns open games for a club", async () => {
        vi.mocked(shareApi.listOpenGamesEndpoint).mockResolvedValue([mockOpenGame]);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useListOpenGames(CLUB_ID), { wrapper: Wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([mockOpenGame]);
        expect(shareApi.listOpenGamesEndpoint).toHaveBeenCalledWith({ club_id: CLUB_ID });
    });

    it("does not fetch when clubId is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useListOpenGames(""), { wrapper: Wrapper });
        expect(shareApi.listOpenGamesEndpoint).not.toHaveBeenCalled();
    });
});

describe("useGetBooking", () => {
    it("returns a single booking by id", async () => {
        vi.mocked(shareApi.getBookingEndpoint).mockResolvedValue(mockBooking);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useGetBooking(BOOKING_ID, CLUB_ID), {
            wrapper: Wrapper,
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(mockBooking);
        expect(shareApi.getBookingEndpoint).toHaveBeenCalledWith(BOOKING_ID, CLUB_ID);
    });

    it("does not fetch when bookingId is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useGetBooking("", CLUB_ID), { wrapper: Wrapper });
        expect(shareApi.getBookingEndpoint).not.toHaveBeenCalled();
    });

    it("does not fetch when clubId is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useGetBooking(BOOKING_ID, ""), { wrapper: Wrapper });
        expect(shareApi.getBookingEndpoint).not.toHaveBeenCalled();
    });
});

describe("useCreateBooking", () => {
    it("calls createBookingEndpoint and invalidates bookings list", async () => {
        vi.mocked(shareApi.createBookingEndpoint).mockResolvedValue(mockBooking);
        const { Wrapper, client } = makeWrapper();
        const invalidate = vi.spyOn(client, "invalidateQueries");
        const { result } = renderHook(() => useCreateBooking(CLUB_ID), { wrapper: Wrapper });
        result.current.mutate({
            club_id: CLUB_ID,
            court_id: "court-1",
            start_datetime: "2026-04-11T10:00:00Z",
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(shareApi.createBookingEndpoint).toHaveBeenCalledWith({
            club_id: CLUB_ID,
            court_id: "court-1",
            start_datetime: "2026-04-11T10:00:00Z",
        });
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["bookings", CLUB_ID] })
        );
    });
});

describe("useCancelBooking", () => {
    it("calls cancelBookingEndpoint and invalidates detail and list", async () => {
        vi.mocked(shareApi.cancelBookingEndpoint).mockResolvedValue(mockBooking);
        const { Wrapper, client } = makeWrapper();
        const invalidate = vi.spyOn(client, "invalidateQueries");
        const { result } = renderHook(() => useCancelBooking(CLUB_ID), { wrapper: Wrapper });
        result.current.mutate(BOOKING_ID);
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(shareApi.cancelBookingEndpoint).toHaveBeenCalledWith(BOOKING_ID, CLUB_ID);
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["bookings", BOOKING_ID] })
        );
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["bookings", CLUB_ID] })
        );
    });
});

describe("useInvitePlayer", () => {
    it("calls invitePlayerEndpoint and invalidates booking detail", async () => {
        vi.mocked(shareApi.invitePlayerEndpoint).mockResolvedValue(mockBooking);
        const { Wrapper, client } = makeWrapper();
        const invalidate = vi.spyOn(client, "invalidateQueries");
        const { result } = renderHook(() => useInvitePlayer(CLUB_ID, BOOKING_ID), {
            wrapper: Wrapper,
        });
        result.current.mutate({ user_id: USER_ID });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(shareApi.invitePlayerEndpoint).toHaveBeenCalledWith(BOOKING_ID, CLUB_ID, {
            user_id: USER_ID,
        });
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["bookings", BOOKING_ID] })
        );
    });
});

describe("useJoinBooking", () => {
    it("calls joinBookingEndpoint and invalidates detail and list", async () => {
        vi.mocked(playerApi.joinBookingEndpoint).mockResolvedValue(mockBooking);
        const { Wrapper, client } = makeWrapper();
        const invalidate = vi.spyOn(client, "invalidateQueries");
        const { result } = renderHook(() => useJoinBooking(CLUB_ID, BOOKING_ID), {
            wrapper: Wrapper,
        });
        result.current.mutate();
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(playerApi.joinBookingEndpoint).toHaveBeenCalledWith(BOOKING_ID, CLUB_ID);
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["bookings", BOOKING_ID] })
        );
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["bookings", CLUB_ID] })
        );
    });
});

describe("useRespondInvite", () => {
    it("calls respondInviteEndpoint and invalidates detail and list", async () => {
        vi.mocked(playerApi.respondInviteEndpoint).mockResolvedValue(mockBooking);
        const { Wrapper, client } = makeWrapper();
        const invalidate = vi.spyOn(client, "invalidateQueries");
        const { result } = renderHook(() => useRespondInvite(CLUB_ID, BOOKING_ID), {
            wrapper: Wrapper,
        });
        result.current.mutate({ action: "accepted" });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(playerApi.respondInviteEndpoint).toHaveBeenCalledWith(BOOKING_ID, CLUB_ID, {
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

describe("useAddEquipmentRental", () => {
    it("calls addEquipmentRentalEndpoint and invalidates booking detail", async () => {
        const mockRental = {
            id: "rental-1",
            booking_id: BOOKING_ID,
            equipment_id: "equip-1",
            equipment_name: "Racket",
            item_type: "racket" as const,
            quantity: 2,
            charge: 10,
        };
        vi.mocked(playerApi.addEquipmentRentalEndpoint).mockResolvedValue(mockRental);
        const { Wrapper, client } = makeWrapper();
        const invalidate = vi.spyOn(client, "invalidateQueries");
        const { result } = renderHook(() => useAddEquipmentRental(CLUB_ID, BOOKING_ID), {
            wrapper: Wrapper,
        });
        result.current.mutate({ equipment_id: "equip-1", quantity: 2 });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(playerApi.addEquipmentRentalEndpoint).toHaveBeenCalledWith(
            BOOKING_ID,
            CLUB_ID,
            { equipment_id: "equip-1", quantity: 2 }
        );
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["bookings", BOOKING_ID] })
        );
    });
});
