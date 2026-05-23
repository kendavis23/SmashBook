import { useSearch, useNavigate } from "@tanstack/react-router";
import type { JSX } from "react";
import { useVerifyEmail } from "../hooks";

export default function VerifyEmailPage(): JSX.Element {
    const navigate = useNavigate();
    const search = useSearch({ strict: false }) as { token?: string };
    const token = search.token ?? "";

    const { isLoading, isSuccess, isError, error } = useVerifyEmail(token);

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
            <div className="w-full max-w-md mx-auto">
                {/* Header */}
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-semibold text-foreground">Email Verification</h1>
                    <p className="text-sm text-muted-foreground mt-2">
                        Verifying your SmashBook account
                    </p>
                </div>

                <div className="rounded-lg border border-border bg-background p-8">
                    {/* Loading */}
                    {isLoading && (
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-10 h-10 border-2 border-border border-t-cta rounded-full animate-spin" />
                            <p className="text-sm text-muted-foreground">
                                Verifying your email address…
                            </p>
                        </div>
                    )}

                    {/* No token */}
                    {!token && !isLoading && (
                        <div
                            role="alert"
                            className="text-sm text-destructive bg-destructive/10 px-4 py-3 rounded-md text-center"
                        >
                            Invalid verification link. No token was provided.
                        </div>
                    )}

                    {/* Success */}
                    {isSuccess && (
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
                                    Email verified!
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Your account is ready. You can now sign in.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => void navigate({ to: "/login" })}
                                className="w-full bg-cta text-white py-3 rounded-lg font-medium text-sm transition hover:opacity-90"
                            >
                                Go to Sign in
                            </button>
                        </div>
                    )}

                    {/* Error */}
                    {isError && (
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
                                    Verification failed
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {error instanceof Error
                                        ? error.message
                                        : "This link is invalid or has expired."}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => void navigate({ to: "/login" })}
                                className="w-full border border-border text-foreground py-3 rounded-lg font-medium text-sm transition hover:bg-muted"
                            >
                                Back to Sign in
                            </button>
                        </div>
                    )}
                </div>

                <p className="text-xs text-muted-foreground text-center mt-10">
                    Secure verification powered by SmashBook
                </p>
            </div>
        </div>
    );
}
