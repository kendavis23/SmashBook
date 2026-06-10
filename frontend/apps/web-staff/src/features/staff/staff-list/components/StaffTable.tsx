import type { JSX } from "react";
import { Edit3, Trash2, Users } from "lucide-react";
import { STAFF_ROLE_LABELS, type StaffMember } from "../../types";

type Props = {
    members: StaffMember[];
    isLoading: boolean;
    error: Error | null;
    canManage: boolean;
    hasNameFilter: boolean;
    onEdit: (member: StaffMember) => void;
    onDelete: (member: StaffMember) => void;
};

export default function StaffTable({
    members,
    isLoading,
    error,
    canManage,
    hasNameFilter,
    onEdit,
    onDelete,
}: Props): JSX.Element {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center gap-3 py-20">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-cta" />
                <span className="text-sm text-muted-foreground">Loading staff...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="m-5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error.message}
            </div>
        );
    }

    if (members.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                    <Users size={24} className="text-muted-foreground/40" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">
                    {hasNameFilter ? "No matching staff" : "No active staff"}
                </h3>
                <p className="mt-1.5 max-w-xs text-xs text-muted-foreground">
                    {hasNameFilter
                        ? "Try searching with a different staff name."
                        : "Active staff members will appear here."}
                </p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/30">
                    <tr>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Member
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Role
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Bio
                        </th>
                        <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                    {members.map((member) => (
                        <tr key={member.staff_id} className="transition hover:bg-muted/20">
                            <td className="px-5 py-4">
                                <div className="font-medium text-foreground">
                                    {member.full_name}
                                </div>
                                <div className="mt-0.5 text-xs text-muted-foreground">
                                    {member.email}
                                </div>
                            </td>
                            <td className="px-5 py-4">
                                <span className="inline-flex rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                                    {STAFF_ROLE_LABELS[member.role]}
                                </span>
                            </td>
                            <td className="max-w-xs px-5 py-4 text-sm text-muted-foreground">
                                {member.bio ?? <span className="italic opacity-50">—</span>}
                            </td>
                            <td className="px-5 py-4">
                                <div className="flex justify-end gap-2">
                                    {canManage ? (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => onEdit(member)}
                                                className="btn-outline min-h-9 px-3"
                                            >
                                                <Edit3 size={13} />
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onDelete(member)}
                                                className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-destructive/30 px-3 text-sm font-medium text-destructive transition hover:bg-destructive/10"
                                            >
                                                <Trash2 size={13} />
                                                Deactivate
                                            </button>
                                        </>
                                    ) : (
                                        <span className="text-xs text-muted-foreground">
                                            View only
                                        </span>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
