import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// ---------------------------------------------------------------------------
// Mock the entire staff api-client module
// ---------------------------------------------------------------------------

vi.mock("@repo/api-client/modules/staff", () => ({
    createStaffInvitationEndpoint: vi.fn(),
    listStaffInvitationsEndpoint: vi.fn(),
    deleteStaffInvitationEndpoint: vi.fn(),
    listStaffEndpoint: vi.fn(),
    updateStaffEndpoint: vi.fn(),
    deleteStaffEndpoint: vi.fn(),
    // other staff module exports (needed so the module resolves cleanly)
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
    createCourtEndpoint: vi.fn(),
    updateCourtEndpoint: vi.fn(),
    listCalendarReservationsEndpoint: vi.fn(),
    createCalendarReservationEndpoint: vi.fn(),
    getCalendarReservationEndpoint: vi.fn(),
    updateCalendarReservationEndpoint: vi.fn(),
    deleteCalendarReservationEndpoint: vi.fn(),
}));

import * as staffApi from "@repo/api-client/modules/staff";

import {
    useCreateStaffInvitation,
    useListStaffInvitations,
    useDeleteStaffInvitation,
    useListStaff,
    useUpdateStaff,
    useDeleteStaff,
} from "./staff.hooks";

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

const CLUB_ID = "club-1";
const STAFF_ID = "staff-1";
const INVITATION_ID = "invite-1";

const mockInvitation = {
    invitation_id: INVITATION_ID,
    club_id: CLUB_ID,
    email: "staff@example.com",
    role: "trainer" as const,
    status: "pending",
    invited_by_user_id: "user-1",
    expires_at: "2026-06-17T00:00:00Z",
    accepted_at: null,
    created_at: "2026-06-10T00:00:00Z",
};

const mockStaffMember = {
    staff_id: STAFF_ID,
    user_id: "user-2",
    full_name: "Jane Doe",
    email: "jane@example.com",
    role: "trainer" as const,
    bio: null,
    is_active: true,
};

const mockInviteResult = {
    invitation_id: INVITATION_ID,
    club_id: CLUB_ID,
    email: "staff@example.com",
    role: "trainer" as const,
    status: "pending",
    attached_existing_user: false,
    message: "Invitation sent.",
};

// ---------------------------------------------------------------------------
// useCreateStaffInvitation
// ---------------------------------------------------------------------------

describe("useCreateStaffInvitation", () => {
    it("calls createStaffInvitationEndpoint and invalidates invitations and members", async () => {
        vi.mocked(staffApi.createStaffInvitationEndpoint).mockResolvedValue(mockInviteResult);
        const { Wrapper, client } = makeWrapper();
        const invalidate = vi.spyOn(client, "invalidateQueries");
        const { result } = renderHook(() => useCreateStaffInvitation(CLUB_ID), {
            wrapper: Wrapper,
        });
        const data = { club_id: CLUB_ID, email: "staff@example.com", role: "trainer" as const };
        result.current.mutate(data);
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(staffApi.createStaffInvitationEndpoint).toHaveBeenCalledWith(data);
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["staff-invitations", CLUB_ID] })
        );
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["staff", CLUB_ID] })
        );
    });
});

// ---------------------------------------------------------------------------
// useListStaffInvitations
// ---------------------------------------------------------------------------

describe("useListStaffInvitations", () => {
    it("returns invitations for a club", async () => {
        vi.mocked(staffApi.listStaffInvitationsEndpoint).mockResolvedValue([mockInvitation]);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useListStaffInvitations(CLUB_ID), {
            wrapper: Wrapper,
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([mockInvitation]);
        expect(staffApi.listStaffInvitationsEndpoint).toHaveBeenCalledWith(CLUB_ID);
    });

    it("does not fetch when clubId is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useListStaffInvitations(""), { wrapper: Wrapper });
        expect(staffApi.listStaffInvitationsEndpoint).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// useDeleteStaffInvitation
// ---------------------------------------------------------------------------

describe("useDeleteStaffInvitation", () => {
    it("calls deleteStaffInvitationEndpoint and invalidates invitations", async () => {
        vi.mocked(staffApi.deleteStaffInvitationEndpoint).mockResolvedValue(undefined);
        const { Wrapper, client } = makeWrapper();
        const invalidate = vi.spyOn(client, "invalidateQueries");
        const { result } = renderHook(() => useDeleteStaffInvitation(CLUB_ID), {
            wrapper: Wrapper,
        });
        result.current.mutate(INVITATION_ID);
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(staffApi.deleteStaffInvitationEndpoint).toHaveBeenCalledWith(INVITATION_ID, CLUB_ID);
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["staff-invitations", CLUB_ID] })
        );
    });
});

// ---------------------------------------------------------------------------
// useListStaff
// ---------------------------------------------------------------------------

describe("useListStaff", () => {
    it("returns active staff for a club", async () => {
        vi.mocked(staffApi.listStaffEndpoint).mockResolvedValue([mockStaffMember]);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useListStaff(CLUB_ID), { wrapper: Wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([mockStaffMember]);
        expect(staffApi.listStaffEndpoint).toHaveBeenCalledWith(CLUB_ID);
    });

    it("does not fetch when clubId is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useListStaff(""), { wrapper: Wrapper });
        expect(staffApi.listStaffEndpoint).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// useUpdateStaff
// ---------------------------------------------------------------------------

describe("useUpdateStaff", () => {
    it("calls updateStaffEndpoint and invalidates members list", async () => {
        vi.mocked(staffApi.updateStaffEndpoint).mockResolvedValue(mockStaffMember);
        const { Wrapper, client } = makeWrapper();
        const invalidate = vi.spyOn(client, "invalidateQueries");
        const { result } = renderHook(() => useUpdateStaff(CLUB_ID, STAFF_ID), {
            wrapper: Wrapper,
        });
        result.current.mutate({ role: "admin" });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(staffApi.updateStaffEndpoint).toHaveBeenCalledWith(STAFF_ID, CLUB_ID, {
            role: "admin",
        });
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["staff", CLUB_ID] })
        );
    });
});

// ---------------------------------------------------------------------------
// useDeleteStaff
// ---------------------------------------------------------------------------

describe("useDeleteStaff", () => {
    it("calls deleteStaffEndpoint and invalidates members list", async () => {
        vi.mocked(staffApi.deleteStaffEndpoint).mockResolvedValue(undefined);
        const { Wrapper, client } = makeWrapper();
        const invalidate = vi.spyOn(client, "invalidateQueries");
        const { result } = renderHook(() => useDeleteStaff(CLUB_ID), { wrapper: Wrapper });
        result.current.mutate(STAFF_ID);
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(staffApi.deleteStaffEndpoint).toHaveBeenCalledWith(STAFF_ID, CLUB_ID);
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["staff", CLUB_ID] })
        );
    });
});
