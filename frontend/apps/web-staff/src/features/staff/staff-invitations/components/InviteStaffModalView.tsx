import type { FormEvent, JSX } from "react";
import { AlertToast, SelectInput } from "@repo/ui";
import { UserPlus, X } from "lucide-react";
import { STAFF_ROLE_OPTIONS, type InviteStaffFormState, type StaffRole } from "../../types";

const labelCls = "mb-1 block text-sm font-medium text-foreground";

type Props = {
    form: InviteStaffFormState;
    clubName: string | null;
    emailError: string;
    apiError: string;
    isPending: boolean;
    onFormChange: (patch: Partial<InviteStaffFormState>) => void;
    onSubmit: (event: FormEvent) => void;
    onClose: () => void;
    onDismissError: () => void;
};

export default function InviteStaffModalView({
    form,
    clubName,
    emailError,
    apiError,
    isPending,
    onFormChange,
    onSubmit,
    onClose,
    onDismissError,
}: Props): JSX.Element {
    return (
        <form onSubmit={onSubmit} noValidate className="flex h-full flex-col">
            <div className="shrink-0 border-b border-border px-6 pb-5 pt-6">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                            <UserPlus size={18} />
                        </div>
                        <div>
                            <h2
                                id="invite-staff-modal-title"
                                className="text-lg font-semibold text-foreground"
                            >
                                Register Staff
                            </h2>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                Send an invitation to join{" "}
                                {clubName ? `${clubName}.` : "your active club."}
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

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                {apiError ? (
                    <div className="mb-4">
                        <AlertToast title={apiError} variant="error" onClose={onDismissError} />
                    </div>
                ) : null}

                <div className="space-y-5">
                    <div>
                        <p className={labelCls}>Club</p>
                        <div className="flex h-10 items-center rounded-lg border border-border bg-muted/30 px-3 text-sm text-muted-foreground">
                            {clubName ?? "Active club"}
                        </div>
                    </div>

                    <div>
                        <label htmlFor="staff-invite-email" className={labelCls}>
                            Email Address <span className="text-destructive">*</span>
                        </label>
                        <input
                            id="staff-invite-email"
                            type="email"
                            autoComplete="email"
                            className={`input-base ${emailError ? "border-destructive focus:border-destructive focus:ring-destructive/20" : ""}`}
                            placeholder="e.g. alex@example.com"
                            value={form.email}
                            onChange={(event) => onFormChange({ email: event.target.value })}
                        />
                        {emailError ? (
                            <p className="mt-1 text-xs text-destructive">{emailError}</p>
                        ) : null}
                    </div>

                    <div>
                        <label className={labelCls}>
                            Role <span className="text-destructive">*</span>
                        </label>
                        <SelectInput
                            className="input-base"
                            name="role"
                            value={form.role}
                            options={STAFF_ROLE_OPTIONS}
                            onValueChange={(value) => onFormChange({ role: value as StaffRole })}
                            placeholder="Select role"
                        />
                    </div>
                </div>
            </div>

            <div className="shrink-0 flex items-center justify-end gap-3 border-t border-border px-6 py-4">
                <button type="button" onClick={onClose} className="btn-outline">
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isPending}
                    className="btn-cta flex items-center gap-2"
                >
                    <UserPlus size={14} />
                    {isPending ? "Sending..." : "Send Invitation"}
                </button>
            </div>
        </form>
    );
}
