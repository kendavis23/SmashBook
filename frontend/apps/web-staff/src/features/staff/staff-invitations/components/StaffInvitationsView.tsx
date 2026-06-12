import type { JSX } from "react";
import { AlertToast, Breadcrumb, formatUTCDate } from "@repo/ui";
import { MailPlus, Plus, RefreshCw, Trash2 } from "lucide-react";
import { STAFF_ROLE_LABELS, type StaffInvitation } from "../../types";
import DeleteStaffInvitationDialog from "./DeleteStaffInvitationDialog";
import InviteStaffModal from "./InviteStaffModal";

type Props = {
    invitations: StaffInvitation[];
    isLoading: boolean;
    error: Error | null;
    canManage: boolean;
    isRegisterOpen: boolean;
    deletingInvitation: StaffInvitation | null;
    isDeleting: boolean;
    deleteError: string;
    successMessage: string;
    onRegisterClick: () => void;
    onCloseRegister: () => void;
    onInvitationCreated: () => void;
    onDeleteClick: (invitation: StaffInvitation) => void;
    onConfirmDelete: () => void;
    onCancelDelete: () => void;
    onRefresh: () => void;
    onDismissDeleteError: () => void;
    onDismissSuccess: () => void;
};

function statusClass(status: string): string {
    switch (status.toLowerCase()) {
        case "accepted":
            return "bg-success/15 text-success";
        case "expired":
            return "bg-warning/15 text-warning";
        default:
            return "bg-info/15 text-info";
    }
}

export default function StaffInvitationsView({
    invitations,
    isLoading,
    error,
    canManage,
    isRegisterOpen,
    deletingInvitation,
    isDeleting,
    deleteError,
    successMessage,
    onRegisterClick,
    onCloseRegister,
    onInvitationCreated,
    onDeleteClick,
    onConfirmDelete,
    onCancelDelete,
    onRefresh,
    onDismissDeleteError,
    onDismissSuccess,
}: Props): JSX.Element {
    return (
        <div className="w-full space-y-5">
            <Breadcrumb
                items={[{ label: "Staff", href: "/staff" }, { label: "Staff Invitations" }]}
            />

            <section className="card-surface overflow-hidden">
                <header className="flex flex-col gap-3 border-b border-border bg-muted/10 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground shadow-xs">
                            <MailPlus size={16} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-lg font-semibold tracking-tight text-foreground">
                                    Staff Invitations
                                </h1>
                                {invitations.length > 0 ? (
                                    <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground shadow-xs">
                                        {invitations.length} total
                                    </span>
                                ) : null}
                            </div>
                            <p className="mt-0.5 text-sm text-muted-foreground">
                                Review invitations and register staff for your active club.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <button
                            type="button"
                            onClick={onRefresh}
                            className="btn-outline min-h-10 px-4"
                            aria-label="Refresh staff invitations"
                        >
                            <RefreshCw size={14} />
                            Refresh
                        </button>
                        {canManage ? (
                            <button
                                type="button"
                                onClick={onRegisterClick}
                                className="btn-cta min-h-10 px-4"
                            >
                                <Plus size={14} />
                                Register Staff
                            </button>
                        ) : null}
                    </div>
                </header>

                {isLoading ? (
                    <div className="flex items-center justify-center gap-3 py-20">
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-cta" />
                        <span className="text-sm text-muted-foreground">
                            Loading invitations...
                        </span>
                    </div>
                ) : error ? (
                    <div className="m-5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        {error.message}
                    </div>
                ) : invitations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                            <MailPlus size={24} className="text-muted-foreground/40" />
                        </div>
                        <h2 className="text-sm font-semibold text-foreground">
                            No staff invitations
                        </h2>
                        <p className="mt-1.5 max-w-xs text-xs text-muted-foreground">
                            New staff invitations will appear here.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border">
                            <thead className="bg-muted/30">
                                <tr>
                                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        Email
                                    </th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        Role
                                    </th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        Status
                                    </th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        Expires
                                    </th>
                                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border bg-card">
                                {invitations.map((invitation) => (
                                    <tr
                                        key={invitation.invitation_id}
                                        className="transition hover:bg-muted/20"
                                    >
                                        <td className="px-5 py-4 text-sm font-medium text-foreground">
                                            {invitation.email}
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="inline-flex rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                                                {STAFF_ROLE_LABELS[invitation.role]}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span
                                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusClass(invitation.status)}`}
                                            >
                                                {invitation.status}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-sm text-muted-foreground">
                                            {formatUTCDate(invitation.expires_at)}
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex justify-end">
                                                {!canManage ? (
                                                    <span className="text-xs text-muted-foreground">
                                                        View only
                                                    </span>
                                                ) : invitation.status.toLowerCase() ===
                                                  "accepted" ? (
                                                    <span className="text-xs text-muted-foreground">
                                                        —
                                                    </span>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => onDeleteClick(invitation)}
                                                        className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-destructive/30 px-3 text-sm font-medium text-destructive transition hover:bg-destructive/10"
                                                    >
                                                        <Trash2 size={13} />
                                                        Delete
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {isRegisterOpen ? (
                <InviteStaffModal onClose={onCloseRegister} onSuccess={onInvitationCreated} />
            ) : null}

            {deletingInvitation ? (
                <DeleteStaffInvitationDialog
                    invitation={deletingInvitation}
                    apiError={deleteError}
                    isPending={isDeleting}
                    onConfirm={onConfirmDelete}
                    onClose={onCancelDelete}
                    onDismissError={onDismissDeleteError}
                />
            ) : null}

            {successMessage ? (
                <AlertToast title={successMessage} variant="success" onClose={onDismissSuccess} />
            ) : null}
        </div>
    );
}
