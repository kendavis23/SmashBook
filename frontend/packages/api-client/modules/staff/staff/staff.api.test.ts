import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    createStaffInvitationEndpoint,
    listStaffInvitationsEndpoint,
    deleteStaffInvitationEndpoint,
    listStaffEndpoint,
    updateStaffEndpoint,
    deleteStaffEndpoint,
} from "./staff.api";

vi.mock("../../../core/fetcher", () => ({ fetcher: vi.fn() }));

import { fetcher } from "../../../core/fetcher";
const mockFetcher = vi.mocked(fetcher);

beforeEach(() => {
    mockFetcher.mockReset();
});

const CLUB_ID = "club-1";
const STAFF_ID = "staff-1";
const INVITATION_ID = "invite-1";

describe("createStaffInvitationEndpoint", () => {
    it("calls POST /api/v1/staff/invitations with body", async () => {
        mockFetcher.mockResolvedValue({});
        const data = { club_id: CLUB_ID, email: "staff@example.com", role: "trainer" as const };
        await createStaffInvitationEndpoint(data);
        expect(mockFetcher).toHaveBeenCalledWith("/api/v1/staff/invitations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
    });
});

describe("listStaffInvitationsEndpoint", () => {
    it("calls GET /api/v1/staff/invitations?club_id=", async () => {
        mockFetcher.mockResolvedValue([]);
        await listStaffInvitationsEndpoint(CLUB_ID);
        expect(mockFetcher).toHaveBeenCalledWith(`/api/v1/staff/invitations?club_id=${CLUB_ID}`);
    });
});

describe("deleteStaffInvitationEndpoint", () => {
    it("calls DELETE /api/v1/staff/invitations/:id?club_id=", async () => {
        mockFetcher.mockResolvedValue(undefined);
        await deleteStaffInvitationEndpoint(INVITATION_ID, CLUB_ID);
        expect(mockFetcher).toHaveBeenCalledWith(
            `/api/v1/staff/invitations/${INVITATION_ID}?club_id=${CLUB_ID}`,
            { method: "DELETE" }
        );
    });
});

describe("listStaffEndpoint", () => {
    it("calls GET /api/v1/staff?club_id=", async () => {
        mockFetcher.mockResolvedValue([]);
        await listStaffEndpoint(CLUB_ID);
        expect(mockFetcher).toHaveBeenCalledWith(`/api/v1/staff?club_id=${CLUB_ID}`);
    });
});

describe("updateStaffEndpoint", () => {
    it("calls PATCH /api/v1/staff/:id?club_id= with body", async () => {
        mockFetcher.mockResolvedValue({});
        const data = { role: "admin" as const };
        await updateStaffEndpoint(STAFF_ID, CLUB_ID, data);
        expect(mockFetcher).toHaveBeenCalledWith(`/api/v1/staff/${STAFF_ID}?club_id=${CLUB_ID}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
    });
});

describe("deleteStaffEndpoint", () => {
    it("calls DELETE /api/v1/staff/:id?club_id=", async () => {
        mockFetcher.mockResolvedValue(undefined);
        await deleteStaffEndpoint(STAFF_ID, CLUB_ID);
        expect(mockFetcher).toHaveBeenCalledWith(`/api/v1/staff/${STAFF_ID}?club_id=${CLUB_ID}`, {
            method: "DELETE",
        });
    });
});
