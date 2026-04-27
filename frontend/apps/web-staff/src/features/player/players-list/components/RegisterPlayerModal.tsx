import { createPortal } from "react-dom";
import { X, UserPlus } from "lucide-react";
import { AlertToast } from "@repo/ui";
import type { FormEvent, JSX } from "react";

export type RegisterPlayerFormState = {
    full_name: string;
    email: string;
    password: string;
};

type Props = {
    form: RegisterPlayerFormState;
    isPending: boolean;
    apiError: string;
    fullNameError: string;
    emailError: string;
    passwordError: string;
    onFormChange: (patch: Partial<RegisterPlayerFormState>) => void;
    onSubmit: (e: FormEvent) => void;
    onClose: () => void;
    onDismissError: () => void;
};

export function RegisterPlayerModal({
    form,
    isPending,
    apiError,
    fullNameError,
    emailError,
    passwordError,
    onFormChange,
    onSubmit,
    onClose,
    onDismissError,
}: Props): JSX.Element {
    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={onClose}
            aria-modal="true"
            role="dialog"
        >
            <div
                className="flex w-full max-w-lg flex-col rounded-2xl border border-border bg-card shadow-2xl"
                style={{ maxHeight: "90vh" }}
                onClick={(e) => e.stopPropagation()}
            >
                <form onSubmit={onSubmit} noValidate className="flex h-full flex-col">
                    {/* Sticky header */}
                    <div className="shrink-0 border-b border-border px-6 pb-5 pt-6">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                                    <UserPlus size={18} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-foreground">
                                        Register Player
                                    </h2>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        Create a new player account for this club.
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
                            <div>
                                <label
                                    htmlFor="register-full-name"
                                    className="mb-1 block text-sm font-medium text-foreground"
                                >
                                    Full name
                                </label>
                                <input
                                    id="register-full-name"
                                    type="text"
                                    value={form.full_name}
                                    onChange={(e) => onFormChange({ full_name: e.target.value })}
                                    placeholder="Jane Smith"
                                    className="input-base w-full"
                                    autoComplete="name"
                                />
                                {fullNameError ? (
                                    <p className="mt-1 text-xs text-destructive">{fullNameError}</p>
                                ) : null}
                            </div>

                            <div>
                                <label
                                    htmlFor="register-email"
                                    className="mb-1 block text-sm font-medium text-foreground"
                                >
                                    Email
                                </label>
                                <input
                                    id="register-email"
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => onFormChange({ email: e.target.value })}
                                    placeholder="jane@example.com"
                                    className="input-base w-full"
                                    autoComplete="email"
                                />
                                {emailError ? (
                                    <p className="mt-1 text-xs text-destructive">{emailError}</p>
                                ) : null}
                            </div>

                            <div>
                                <label
                                    htmlFor="register-password"
                                    className="mb-1 block text-sm font-medium text-foreground"
                                >
                                    Password
                                </label>
                                <input
                                    id="register-password"
                                    type="password"
                                    value={form.password}
                                    onChange={(e) => onFormChange({ password: e.target.value })}
                                    placeholder="At least 8 characters"
                                    className="input-base w-full"
                                    autoComplete="new-password"
                                />
                                {passwordError ? (
                                    <p className="mt-1 text-xs text-destructive">{passwordError}</p>
                                ) : null}
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
                            <UserPlus size={14} />
                            {isPending ? "Registering…" : "Register Player"}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
