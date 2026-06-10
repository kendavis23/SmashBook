import { useSearch, useNavigate } from "@tanstack/react-router";
import type { JSX, FormEvent } from "react";
import { useState } from "react";
import { useCompleteStaffInvitation } from "../hooks";

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

type FormState = {
    fullName: string;
    password: string;
    confirmPassword: string;
};

type FieldErrors = {
    fullName?: string;
    password?: string;
    confirmPassword?: string;
};

type ViewProps = {
    form: FormState;
    fieldErrors: FieldErrors;
    apiError: string;
    isPending: boolean;
    isSuccess: boolean;
    hasToken: boolean;
    onFormChange: (patch: Partial<FormState>) => void;
    onSubmit: (e: FormEvent) => void;
    onDismissError: () => void;
    onGoToLogin: () => void;
};

function CompleteInvitationView({
    form,
    fieldErrors,
    apiError,
    isPending,
    isSuccess,
    hasToken,
    onFormChange,
    onSubmit,
    onDismissError,
    onGoToLogin,
}: ViewProps): JSX.Element {
    const inputCls =
        "mt-1 w-full px-4 py-3 border border-border rounded-lg text-sm bg-background " +
        "text-foreground outline-none focus:ring-2 focus:ring-cta/30 focus:border-cta transition";

    return (
        <div className="relative min-h-screen bg-background grid grid-cols-1 lg:grid-cols-[55%_45%]">
            {/* Divider */}
            <div className="hidden lg:block absolute top-0 bottom-0 left-[55%] w-[2px] bg-gradient-to-b from-transparent via-border to-transparent" />

            {/* LEFT — branding */}
            <div className="hidden lg:flex flex-col justify-start pt-10 pl-12">
                <div className="w-fit mb-10 px-6 py-3 rounded-2xl border border-border bg-background">
                    <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-foreground">
                        Smash<span className="text-cta">Book</span>
                    </h1>
                </div>
                <div className="flex-1 flex items-center justify-end pr-0">
                    <img
                        src="/padel.png"
                        alt="Padel Illustration"
                        className="max-w-[900px] w-full h-auto object-contain"
                    />
                </div>
            </div>

            {/* RIGHT — form */}
            <div className="flex items-center justify-center">
                <div className="w-full max-w-md mx-auto min-h-screen flex flex-col justify-center py-12 px-8">
                    {/* No token in URL */}
                    {!hasToken && (
                        <div className="flex flex-col items-center gap-5 text-center">
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/15 text-destructive">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width={28}
                                    height={28}
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden="true"
                                >
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-lg font-semibold text-foreground">
                                    Invalid invitation link
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    No invitation token was found. Please use the link from your
                                    invitation email.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={onGoToLogin}
                                className="w-full border border-border text-foreground py-3 rounded-lg font-medium text-sm transition hover:bg-muted"
                            >
                                Back to Sign in
                            </button>
                        </div>
                    )}

                    {/* Success state */}
                    {isSuccess && hasToken && (
                        <div className="flex flex-col items-center gap-5 text-center">
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width={28}
                                    height={28}
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden="true"
                                >
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-lg font-semibold text-foreground">
                                    Account activated!
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Your account is ready. You can now sign in with your new
                                    password.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={onGoToLogin}
                                className="w-full bg-cta text-white py-3 rounded-lg font-medium text-sm transition hover:opacity-90"
                            >
                                Go to Sign in
                            </button>
                        </div>
                    )}

                    {/* Form */}
                    {!isSuccess && hasToken && (
                        <>
                            <div className="mb-8">
                                <h1 className="text-3xl font-semibold text-foreground">
                                    Set up your account
                                </h1>
                                <p className="text-sm text-muted-foreground mt-2">
                                    You&apos;ve been invited to SmashBook. Enter your name and
                                    choose a password to activate your account.
                                </p>
                            </div>

                            <form onSubmit={onSubmit} noValidate className="space-y-5">
                                {/* API error */}
                                {apiError ? (
                                    <div
                                        role="alert"
                                        className="flex items-start justify-between gap-3 text-sm text-destructive bg-destructive/10 px-4 py-3 rounded-md"
                                    >
                                        <span>{apiError}</span>
                                        <button
                                            type="button"
                                            onClick={onDismissError}
                                            aria-label="Dismiss error"
                                            className="shrink-0 text-destructive/60 hover:text-destructive transition"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ) : null}

                                {/* Full name */}
                                <div>
                                    <label
                                        htmlFor="full-name"
                                        className="text-sm font-medium text-foreground"
                                    >
                                        Full name
                                    </label>
                                    <input
                                        id="full-name"
                                        type="text"
                                        placeholder="Your full name"
                                        autoComplete="name"
                                        className={inputCls}
                                        value={form.fullName}
                                        onChange={(e) => onFormChange({ fullName: e.target.value })}
                                    />
                                    {fieldErrors.fullName ? (
                                        <p className="text-xs text-destructive mt-1">
                                            {fieldErrors.fullName}
                                        </p>
                                    ) : null}
                                </div>

                                {/* Password */}
                                <div>
                                    <label
                                        htmlFor="password"
                                        className="text-sm font-medium text-foreground"
                                    >
                                        Password
                                    </label>
                                    <input
                                        id="password"
                                        type="password"
                                        placeholder="Min. 8 characters"
                                        autoComplete="new-password"
                                        className={inputCls}
                                        value={form.password}
                                        onChange={(e) => onFormChange({ password: e.target.value })}
                                    />
                                    {fieldErrors.password ? (
                                        <p className="text-xs text-destructive mt-1">
                                            {fieldErrors.password}
                                        </p>
                                    ) : null}
                                </div>

                                {/* Confirm password */}
                                <div>
                                    <label
                                        htmlFor="confirm-password"
                                        className="text-sm font-medium text-foreground"
                                    >
                                        Confirm password
                                    </label>
                                    <input
                                        id="confirm-password"
                                        type="password"
                                        placeholder="Repeat your password"
                                        autoComplete="new-password"
                                        className={inputCls}
                                        value={form.confirmPassword}
                                        onChange={(e) =>
                                            onFormChange({ confirmPassword: e.target.value })
                                        }
                                    />
                                    {fieldErrors.confirmPassword ? (
                                        <p className="text-xs text-destructive mt-1">
                                            {fieldErrors.confirmPassword}
                                        </p>
                                    ) : null}
                                </div>

                                <button
                                    type="submit"
                                    disabled={isPending}
                                    className="w-full bg-cta text-white py-3 rounded-lg font-medium text-sm transition hover:opacity-90 disabled:opacity-60"
                                >
                                    {isPending ? "Activating account…" : "Activate Account"}
                                </button>
                            </form>

                            <p className="mt-8">
                                <button
                                    type="button"
                                    onClick={onGoToLogin}
                                    className="text-sm text-cta font-medium"
                                >
                                    Back to Sign in
                                </button>
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Container
// ---------------------------------------------------------------------------

function CompleteInvitationContainer(): JSX.Element {
    const navigate = useNavigate();
    const search = useSearch({ strict: false }) as { token?: string };
    const token = search.token ?? "";

    const { mutate, isPending, isSuccess, error, reset } = useCompleteStaffInvitation();

    const [form, setForm] = useState<FormState>({
        fullName: "",
        password: "",
        confirmPassword: "",
    });
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

    const validate = (): boolean => {
        const errors: FieldErrors = {};
        if (!form.fullName.trim()) {
            errors.fullName = "Required";
        }
        if (!form.password) {
            errors.password = "Required";
        } else if (form.password.length < 8) {
            errors.password = "Must be at least 8 characters";
        }
        if (!form.confirmPassword) {
            errors.confirmPassword = "Required";
        } else if (form.confirmPassword !== form.password) {
            errors.confirmPassword = "Passwords do not match";
        }
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = (e: FormEvent): void => {
        e.preventDefault();
        if (!validate()) return;
        mutate({ token, password: form.password, full_name: form.fullName.trim() });
    };

    return (
        <CompleteInvitationView
            form={form}
            fieldErrors={fieldErrors}
            apiError={(error as Error | null)?.message ?? ""}
            isPending={isPending}
            isSuccess={isSuccess}
            hasToken={!!token}
            onFormChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
            onSubmit={handleSubmit}
            onDismissError={reset}
            onGoToLogin={() => void navigate({ to: "/login" })}
        />
    );
}

// ---------------------------------------------------------------------------
// Page (thin shell)
// ---------------------------------------------------------------------------

export default function CompleteInvitationPage(): JSX.Element {
    return <CompleteInvitationContainer />;
}
