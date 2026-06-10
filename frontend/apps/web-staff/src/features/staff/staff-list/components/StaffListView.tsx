import type { FormEvent, JSX } from "react";
import { useMemo, useState } from "react";
import { AlertToast, Breadcrumb } from "@repo/ui";
import { RefreshCw, Search, Users } from "lucide-react";
import type { StaffFormState, StaffMember } from "../../types";
import StaffEditDialog from "./StaffEditDialog";
import StaffTable from "./StaffTable";

type Props = {
    members: StaffMember[];
    isLoading: boolean;
    error: Error | null;
    canManage: boolean;
    editingMember: StaffMember | null;
    form: StaffFormState;
    apiError: string;
    isMutating: boolean;
    successMessage: string;
    deactivatingMemberName: string;
    onEditClick: (member: StaffMember) => void;
    onDeleteClick: (member: StaffMember) => void;
    onConfirmDeactivate: () => void;
    onCancelDeactivate: () => void;
    onRefresh: () => void;
    onFormChange: (patch: Partial<StaffFormState>) => void;
    onSubmit: (e: FormEvent) => void;
    onCloseDialog: () => void;
    onDismissError: () => void;
    onDismissSuccess: () => void;
};

export default function StaffListView({
    members,
    isLoading,
    error,
    canManage,
    editingMember,
    form,
    apiError,
    isMutating,
    successMessage,
    deactivatingMemberName,
    onEditClick,
    onDeleteClick,
    onConfirmDeactivate,
    onCancelDeactivate,
    onRefresh,
    onFormChange,
    onSubmit,
    onCloseDialog,
    onDismissError,
    onDismissSuccess,
}: Props): JSX.Element {
    const [nameSearch, setNameSearch] = useState("");
    const normalizedSearch = nameSearch.trim().toLocaleLowerCase();
    const filteredMembers = useMemo(
        () =>
            normalizedSearch
                ? members.filter((member) =>
                      member.full_name.toLocaleLowerCase().includes(normalizedSearch)
                  )
                : members,
        [members, normalizedSearch]
    );

    return (
        <div className="w-full space-y-5">
            <Breadcrumb items={[{ label: "Staff" }]} />

            <section className="card-surface overflow-hidden">
                <header className="flex flex-col gap-3 border-b border-border bg-muted/10 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground shadow-xs">
                            <Users size={16} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-lg font-semibold tracking-tight text-foreground">
                                    Staff
                                </h1>
                                {members.length > 0 ? (
                                    <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground shadow-xs">
                                        {members.length} active
                                    </span>
                                ) : null}
                            </div>
                            <p className="mt-0.5 text-sm text-muted-foreground">
                                Manage active staff members at this club.
                            </p>
                        </div>
                    </div>

                    <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto lg:justify-end">
                        <div className="relative min-w-0 sm:w-72">
                            <Search
                                size={17}
                                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                            />
                            <input
                                type="search"
                                value={nameSearch}
                                onChange={(event) => setNameSearch(event.target.value)}
                                placeholder="Search staff name"
                                aria-label="Search staff by name"
                                className="input-base min-h-10 w-full pl-10"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={onRefresh}
                            className="btn-outline min-h-10 px-4"
                            aria-label="Refresh staff"
                        >
                            <RefreshCw size={14} />
                            Refresh
                        </button>
                    </div>
                </header>

                <StaffTable
                    members={filteredMembers}
                    isLoading={isLoading}
                    error={error}
                    canManage={canManage}
                    hasNameFilter={normalizedSearch.length > 0}
                    onEdit={onEditClick}
                    onDelete={onDeleteClick}
                />
            </section>

            {editingMember ? (
                <StaffEditDialog
                    form={form}
                    apiError={apiError}
                    isPending={isMutating}
                    onFormChange={onFormChange}
                    onSubmit={onSubmit}
                    onClose={onCloseDialog}
                    onDismissError={onDismissError}
                />
            ) : null}

            {deactivatingMemberName ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 py-6 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl">
                        <h2 className="text-lg font-semibold text-foreground">
                            Deactivate Staff Member
                        </h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Deactivate {deactivatingMemberName}? They will lose access to this
                            club&apos;s portal.
                        </p>
                        {apiError ? (
                            <div className="mt-4">
                                <AlertToast
                                    title={apiError}
                                    variant="error"
                                    onClose={onDismissError}
                                />
                            </div>
                        ) : null}
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={onCancelDeactivate}
                                className="btn-outline"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={onConfirmDeactivate}
                                disabled={isMutating}
                                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-destructive px-4 text-sm font-semibold text-destructive-foreground transition hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isMutating ? "Deactivating…" : "Deactivate"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {successMessage ? (
                <AlertToast title={successMessage} variant="success" onClose={onDismissSuccess} />
            ) : null}
        </div>
    );
}
