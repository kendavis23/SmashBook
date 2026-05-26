import type { FormEvent, JSX } from "react";
import { Breadcrumb, AlertToast } from "@repo/ui";
import { UserPlus } from "lucide-react";

const fieldCls =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground " +
    "placeholder:text-muted-foreground transition focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta-ring/30";

const labelCls = "mb-1 block text-sm font-medium text-foreground";

export type RegisterPlayerFormState = {
    fullName: string;
    email: string;
};

type Props = {
    form: RegisterPlayerFormState;
    clubName: string | null;
    fullNameError: string;
    emailError: string;
    apiError: string;
    isPending: boolean;
    onFormChange: (patch: Partial<RegisterPlayerFormState>) => void;
    onSubmit: (e: FormEvent) => void;
    onCancel: () => void;
    onDismissError: () => void;
};

export default function RegisterPlayerView({
    form,
    clubName,
    fullNameError,
    emailError,
    apiError,
    isPending,
    onFormChange,
    onSubmit,
    onCancel,
    onDismissError,
}: Props): JSX.Element {
    return (
        <div className="w-full space-y-5">
            <Breadcrumb
                items={[{ label: "Players", href: "/players" }, { label: "Register Player" }]}
            />

            <section className="card-surface overflow-hidden">
                <header className="border-b border-border bg-muted/10 px-5 py-4 sm:px-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground shadow-xs">
                            <UserPlus size={16} />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold tracking-tight text-foreground">
                                Register Player
                            </h1>
                            <p className="mt-0.5 text-sm text-muted-foreground">
                                Send an invitation email so the player can set their password and
                                join{clubName ? ` ${clubName}` : " your club"}.
                            </p>
                        </div>
                    </div>
                </header>

                <div className="px-5 py-6 sm:px-6">
                    {apiError ? (
                        <div className="mb-5">
                            <AlertToast title={apiError} variant="error" onClose={onDismissError} />
                        </div>
                    ) : null}

                    <form onSubmit={onSubmit} noValidate>
                        <section className="form-section">
                            <div className="mb-4">
                                <h3 className="text-sm font-semibold text-foreground">
                                    Player Details
                                </h3>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Enter the player&apos;s name and email address. The club is set
                                    automatically from your active club selection.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                {/* Club — read-only context pill */}
                                <div className="sm:col-span-2">
                                    <p className={labelCls}>Club</p>
                                    <div className="flex h-10 items-center rounded-lg border border-border bg-muted/30 px-3 text-sm text-muted-foreground">
                                        {clubName ?? "—"}
                                    </div>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Derived from your active club selection.
                                    </p>
                                </div>

                                {/* Full Name */}
                                <div>
                                    <label htmlFor="player-full-name" className={labelCls}>
                                        Full Name <span className="text-destructive">*</span>
                                    </label>
                                    <input
                                        id="player-full-name"
                                        type="text"
                                        autoComplete="name"
                                        className={`${fieldCls} ${fullNameError ? "border-destructive focus:border-destructive focus:ring-destructive/20" : ""}`}
                                        placeholder="e.g. Jane Doe"
                                        value={form.fullName}
                                        onChange={(e) => onFormChange({ fullName: e.target.value })}
                                    />
                                    {fullNameError ? (
                                        <p className="mt-1 text-xs text-destructive">
                                            {fullNameError}
                                        </p>
                                    ) : null}
                                </div>

                                {/* Email */}
                                <div>
                                    <label htmlFor="player-email" className={labelCls}>
                                        Email Address <span className="text-destructive">*</span>
                                    </label>
                                    <input
                                        id="player-email"
                                        type="email"
                                        autoComplete="email"
                                        className={`${fieldCls} ${emailError ? "border-destructive focus:border-destructive focus:ring-destructive/20" : ""}`}
                                        placeholder="e.g. jane@example.com"
                                        value={form.email}
                                        onChange={(e) => onFormChange({ email: e.target.value })}
                                    />
                                    {emailError ? (
                                        <p className="mt-1 text-xs text-destructive">
                                            {emailError}
                                        </p>
                                    ) : null}
                                </div>
                            </div>
                        </section>

                        <div className="mt-8 flex items-center justify-end gap-3 border-t border-border pt-5">
                            <button type="button" onClick={onCancel} className="btn-outline">
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isPending}
                                className="btn-cta flex items-center gap-2"
                            >
                                <UserPlus size={14} />
                                {isPending ? "Sending…" : "Send Invitation"}
                            </button>
                        </div>
                    </form>
                </div>
            </section>
        </div>
    );
}
