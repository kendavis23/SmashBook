import type { FormEvent, JSX } from "react";
import { AlertToast, SelectInput } from "@repo/ui";
import { UserCog, X } from "lucide-react";
import { createPortal } from "react-dom";
import { STAFF_ROLE_OPTIONS, type StaffFormState, type StaffRole } from "../../types";

type Props = {
    form: StaffFormState;
    apiError: string;
    isPending: boolean;
    onFormChange: (patch: Partial<StaffFormState>) => void;
    onSubmit: (e: FormEvent) => void;
    onClose: () => void;
    onDismissError: () => void;
};

export default function StaffEditDialog({
    form,
    apiError,
    isPending,
    onFormChange,
    onSubmit,
    onClose,
    onDismissError,
}: Props): JSX.Element {
    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className="flex w-full max-w-lg flex-col rounded-2xl border border-border bg-card shadow-2xl"
                style={{ maxHeight: "90vh" }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="edit-staff-dialog-title"
            >
                <form onSubmit={onSubmit} noValidate className="flex h-full flex-col">
                    {/* Sticky header */}
                    <div className="shrink-0 border-b border-border px-6 pb-5 pt-6">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                                    <UserCog size={18} />
                                </div>
                                <div>
                                    <h2
                                        id="edit-staff-dialog-title"
                                        className="text-lg font-semibold text-foreground"
                                    >
                                        Edit Staff Member
                                    </h2>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        Update role and bio for this staff member.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Close modal"
                                className="shrink-0 rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Scrollable body */}
                    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                        {apiError ? (
                            <div className="mb-4">
                                <AlertToast
                                    title={apiError}
                                    variant="error"
                                    onClose={onDismissError}
                                />
                            </div>
                        ) : null}

                        <div className="space-y-4">
                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-medium text-foreground">Role</label>
                                <SelectInput
                                    className="input-base"
                                    name="role"
                                    value={form.role}
                                    options={STAFF_ROLE_OPTIONS}
                                    onValueChange={(v) => onFormChange({ role: v as StaffRole })}
                                    placeholder="Select role"
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label
                                    htmlFor="staff-bio"
                                    className="text-sm font-medium text-foreground"
                                >
                                    Bio{" "}
                                    <span className="text-xs font-normal text-muted-foreground">
                                        (optional)
                                    </span>
                                </label>
                                <textarea
                                    id="staff-bio"
                                    rows={3}
                                    value={form.bio}
                                    onChange={(e) => onFormChange({ bio: e.target.value })}
                                    placeholder="Short description shown to players…"
                                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta-ring/30"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Sticky footer */}
                    <div className="shrink-0 flex items-center justify-end gap-3 border-t border-border px-6 py-4">
                        <button type="button" onClick={onClose} className="btn-outline">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isPending}
                            className="btn-cta flex items-center gap-2"
                        >
                            <UserCog size={14} />
                            {isPending ? "Saving…" : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
