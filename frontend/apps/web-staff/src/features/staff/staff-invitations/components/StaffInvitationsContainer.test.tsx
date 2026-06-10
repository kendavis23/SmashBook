import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StaffInvitation } from "../../types";
import StaffInvitationsContainer from "./StaffInvitationsContainer";

const mockRefetch = vi.fn();
const mockDeleteMutate = vi.fn();
const mockDeleteReset = vi.fn();

const invitation: StaffInvitation = {
    invitation_id: "invitation-1",
    club_id: "club-1",
    email: "alex@example.com",
    role: "trainer",
    status: "pending",
    invited_by_user_id: "user-1",
    expires_at: "2026-07-01T00:00:00Z",
    accepted_at: null,
    created_at: "2026-06-01T00:00:00Z",
};

vi.mock("../../hooks", () => ({
    useListStaffInvitations: vi.fn(() => ({
        data: [invitation],
        isLoading: false,
        error: null,
        refetch: mockRefetch,
    })),
    useDeleteStaffInvitation: vi.fn(() => ({
        mutate: mockDeleteMutate,
        reset: mockDeleteReset,
        isPending: false,
        error: null,
    })),
}));

vi.mock("../../store", () => ({
    canManageStaff: vi.fn(() => true),
    useClubAccess: vi.fn(() => ({
        clubId: "club-1",
        role: "admin",
        isOwner: false,
    })),
}));

vi.mock("./StaffInvitationsView", () => ({
    default: ({
        invitations,
        deletingInvitation,
        successMessage,
        onDeleteClick,
        onConfirmDelete,
    }: {
        invitations: StaffInvitation[];
        deletingInvitation: StaffInvitation | null;
        successMessage: string;
        onDeleteClick: (value: StaffInvitation) => void;
        onConfirmDelete: () => void;
    }) => (
        <div>
            <span>{invitations[0]?.email}</span>
            <span>{successMessage}</span>
            <button
                type="button"
                onClick={() => {
                    const firstInvitation = invitations[0];
                    if (firstInvitation) onDeleteClick(firstInvitation);
                }}
            >
                Select invitation
            </button>
            {deletingInvitation ? (
                <button type="button" onClick={onConfirmDelete}>
                    Confirm delete
                </button>
            ) : null}
        </div>
    ),
}));

describe("StaffInvitationsContainer", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockDeleteMutate.mockImplementation(
            (_invitationId: string, options: { onSuccess: () => void }) => {
                options.onSuccess();
            }
        );
    });

    it("passes listed invitations to the page view", () => {
        render(<StaffInvitationsContainer />);

        expect(screen.getByText("alex@example.com")).toBeInTheDocument();
    });

    it("deletes the selected invitation and shows success feedback", () => {
        render(<StaffInvitationsContainer />);

        fireEvent.click(screen.getByRole("button", { name: "Select invitation" }));
        fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));

        expect(mockDeleteMutate).toHaveBeenCalledWith(
            "invitation-1",
            expect.objectContaining({ onSuccess: expect.any(Function) })
        );
        expect(screen.getByText("Staff invitation deleted.")).toBeInTheDocument();
    });
});
