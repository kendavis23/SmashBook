import { useCallback, useState } from "react";
import type { JSX } from "react";
import { useDeleteStaffInvitation, useListStaffInvitations } from "../../hooks";
import { canManageStaff, useClubAccess } from "../../store";
import type { StaffInvitation } from "../../types";
import StaffInvitationsView from "./StaffInvitationsView";

export default function StaffInvitationsContainer(): JSX.Element {
    const { clubId, role } = useClubAccess();
    const canManage = canManageStaff(role);
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);
    const [deletingInvitation, setDeletingInvitation] = useState<StaffInvitation | null>(null);
    const [successMessage, setSuccessMessage] = useState("");

    const { data = [], isLoading, error, refetch } = useListStaffInvitations(clubId ?? "");
    const deleteInvitation = useDeleteStaffInvitation(clubId ?? "");
    const deleteError = (deleteInvitation.error as Error | null)?.message ?? "";

    const handleConfirmDelete = useCallback((): void => {
        if (!canManage || !deletingInvitation) return;

        deleteInvitation.mutate(deletingInvitation.invitation_id, {
            onSuccess: () => {
                setDeletingInvitation(null);
                setSuccessMessage("Staff invitation deleted.");
            },
        });
    }, [canManage, deleteInvitation, deletingInvitation]);

    const handleCancelDelete = useCallback((): void => {
        setDeletingInvitation(null);
        deleteInvitation.reset();
    }, [deleteInvitation]);

    return (
        <StaffInvitationsView
            invitations={data as StaffInvitation[]}
            isLoading={isLoading}
            error={error as Error | null}
            canManage={canManage}
            isRegisterOpen={isRegisterOpen}
            deletingInvitation={deletingInvitation}
            isDeleting={deleteInvitation.isPending}
            deleteError={deleteError}
            successMessage={successMessage}
            onRegisterClick={() => setIsRegisterOpen(true)}
            onCloseRegister={() => setIsRegisterOpen(false)}
            onInvitationCreated={() => {
                setIsRegisterOpen(false);
                setSuccessMessage("Staff invitation sent.");
            }}
            onDeleteClick={(invitation) => {
                deleteInvitation.reset();
                setDeletingInvitation(invitation);
            }}
            onConfirmDelete={handleConfirmDelete}
            onCancelDelete={handleCancelDelete}
            onRefresh={() => void refetch()}
            onDismissDeleteError={() => deleteInvitation.reset()}
            onDismissSuccess={() => setSuccessMessage("")}
        />
    );
}
