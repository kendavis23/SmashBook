import type { JSX } from "react";
import { createPortal } from "react-dom";
import { AlertToast } from "@repo/ui";
import type { StaffInvitation } from "../../types";

type Props = {
    invitation: StaffInvitation;
    apiError: string;
    isPending: boolean;
    onConfirm: () => void;
    onClose: () => void;
    onDismissError: () => void;
};

export default function DeleteStaffInvitationDialog({
    invitation,
    apiError,
    isPending,
    onConfirm,
    onClose,
    onDismissError,
}: Props): JSX.Element {
    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div
                className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="delete-staff-invitation-title"
            >
                <h2
                    id="delete-staff-invitation-title"
                    className="text-lg font-semibold text-foreground"
                >
                    Delete Staff Invitation
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                    Delete the invitation for {invitation.email}? They will no longer be able to use
                    this invitation.
                </p>

                {apiError ? (
                    <div className="mt-4">
                        <AlertToast title={apiError} variant="error" onClose={onDismissError} />
                    </div>
                ) : null}

                <div className="mt-6 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="btn-outline">
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isPending}
                        className="inline-flex min-h-10 items-center rounded-lg bg-destructive px-4 text-sm font-semibold text-destructive-foreground transition hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isPending ? "Deleting..." : "Delete Invitation"}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
