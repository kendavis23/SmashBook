import type { FormEvent, JSX } from "react";
import { useCallback, useState } from "react";
import { useSearch } from "@tanstack/react-router";
import { useListStaff, useUpdateStaff, useDeleteStaff } from "../../hooks";
import { canManageStaff, useClubAccess } from "../../store";
import type { StaffFormState, StaffMember } from "../../types";
import StaffListView from "./StaffListView";

function createFormFromMember(member: StaffMember): StaffFormState {
    return {
        role: member.role,
        bio: member.bio ?? "",
    };
}

export default function StaffListContainer(): JSX.Element {
    const search = useSearch({ strict: false }) as { invited?: boolean };
    const { clubId, role } = useClubAccess();
    const canManage = canManageStaff(role);

    const { data = [], isLoading, error, refetch } = useListStaff(clubId ?? "");
    const members = data as StaffMember[];

    const [editingMember, setEditingMember] = useState<StaffMember | null>(null);
    const [deactivatingMember, setDeactivatingMember] = useState<StaffMember | null>(null);
    const [form, setForm] = useState<StaffFormState>({ role: "trainer", bio: "" });
    const [successMessage, setSuccessMessage] = useState(
        search.invited ? "Staff invitation sent." : ""
    );

    const updateStaff = useUpdateStaff(clubId ?? "", editingMember?.staff_id ?? "");
    const deleteStaff = useDeleteStaff(clubId ?? "");

    const apiError =
        (updateStaff.error as Error | null)?.message ??
        (deleteStaff.error as Error | null)?.message ??
        "";
    const isMutating = updateStaff.isPending || deleteStaff.isPending;

    const handleEditClick = useCallback(
        (member: StaffMember): void => {
            updateStaff.reset();
            setEditingMember(member);
            setForm(createFormFromMember(member));
        },
        [updateStaff]
    );

    const handleCloseDialog = useCallback((): void => {
        setEditingMember(null);
        updateStaff.reset();
    }, [updateStaff]);

    const handleFormChange = useCallback((patch: Partial<StaffFormState>): void => {
        setForm((prev) => ({ ...prev, ...patch }));
    }, []);

    const handleSubmit = useCallback(
        (e: FormEvent): void => {
            e.preventDefault();
            if (!canManage || !editingMember) return;

            updateStaff.mutate(
                {
                    role: form.role,
                    bio: form.bio.trim() || null,
                },
                {
                    onSuccess: () => {
                        setSuccessMessage("Staff member updated.");
                        setEditingMember(null);
                    },
                }
            );
        },
        [canManage, editingMember, form, updateStaff]
    );

    const handleDeleteClick = useCallback(
        (member: StaffMember): void => {
            deleteStaff.reset();
            setDeactivatingMember(member);
        },
        [deleteStaff]
    );

    const handleConfirmDeactivate = useCallback((): void => {
        if (!canManage || !deactivatingMember) return;

        deleteStaff.mutate(deactivatingMember.staff_id, {
            onSuccess: () => {
                setSuccessMessage("Staff member deactivated.");
                setDeactivatingMember(null);
            },
        });
    }, [canManage, deactivatingMember, deleteStaff]);

    const handleRefresh = useCallback((): void => {
        void refetch();
    }, [refetch]);

    const handleDismissError = useCallback((): void => {
        updateStaff.reset();
        deleteStaff.reset();
    }, [updateStaff, deleteStaff]);

    return (
        <StaffListView
            members={members}
            isLoading={isLoading}
            error={error as Error | null}
            canManage={canManage}
            editingMember={editingMember}
            form={form}
            apiError={apiError}
            isMutating={isMutating}
            successMessage={successMessage}
            deactivatingMemberName={deactivatingMember?.full_name ?? ""}
            onEditClick={handleEditClick}
            onDeleteClick={handleDeleteClick}
            onConfirmDeactivate={handleConfirmDeactivate}
            onCancelDeactivate={() => setDeactivatingMember(null)}
            onRefresh={handleRefresh}
            onFormChange={handleFormChange}
            onSubmit={handleSubmit}
            onCloseDialog={handleCloseDialog}
            onDismissError={handleDismissError}
            onDismissSuccess={() => setSuccessMessage("")}
        />
    );
}
