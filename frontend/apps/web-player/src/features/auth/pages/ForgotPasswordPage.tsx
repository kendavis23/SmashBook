import { useNavigate } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useRef, useState } from "react";

import { usePasswordResetRequest } from "../hooks";

const REDIRECT_DELAY_S = 20;

export default function ForgotPasswordPage(): JSX.Element {
    const navigate = useNavigate();
    const { mutate, isPending, isError, error, isSuccess } = usePasswordResetRequest();

    const [club, setClub] = useState("");
    const [email, setEmail] = useState("");
    const [fieldErrors, setFieldErrors] = useState<{ club?: string; email?: string }>({});
    const [countdown, setCountdown] = useState(REDIRECT_DELAY_S);

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (!isSuccess) return;

        intervalRef.current = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(intervalRef.current!);
                    void navigate({ to: "/reset-password" });
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isSuccess, navigate]);

    const validate = (): boolean => {
        const errors: { club?: string; email?: string } = {};
        if (!club) errors.club = "Required";
        if (!email) errors.email = "Required";
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = (): void => {
        if (!validate()) return;
        mutate({ tenant_subdomain: club, email });
    };

    return (
        <div className="relative min-h-screen bg-background grid grid-cols-1 lg:grid-cols-[55%_45%]">
            {/* Divider */}
            <div className="hidden lg:block absolute top-0 bottom-0 left-[55%] w-[2px] bg-gradient-to-b from-transparent via-border to-transparent" />

            {/* LEFT */}
            <div className="hidden lg:flex flex-col justify-start pt-10 pl-12">
                <div className="w-fit mb-10 px-6 py-3 rounded-2xl border border-border bg-background">
                    <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-foreground">
                        Smash<span className="text-blue-600">Book</span>
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

            {/* RIGHT */}
            <div className="flex items-center justify-center">
                <div className="w-full max-w-md mx-auto min-h-screen flex flex-col justify-center py-12 px-8">
                    {isSuccess ? (
                        <>
                            <div className="mb-8">
                                <h1 className="text-3xl font-semibold text-foreground">
                                    Check your inbox
                                </h1>
                                <p className="text-sm text-muted-foreground mt-2">
                                    Reset instructions were sent to{" "}
                                    <span className="font-medium">{email}</span>.
                                </p>
                            </div>
                            <div className="space-y-4">
                                <div className="text-sm text-green-700 bg-green-50 px-4 py-3 rounded-md">
                                    Email sent successfully!
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Redirecting to password reset in{" "}
                                    <span className="font-semibold text-foreground">
                                        {countdown}s
                                    </span>
                                    …
                                </p>
                                <button
                                    type="button"
                                    onClick={() => void navigate({ to: "/reset-password" })}
                                    className="text-blue-600 text-sm font-medium"
                                >
                                    Go now
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="mb-8">
                                <h1 className="text-3xl font-semibold text-foreground">
                                    Forgot password?
                                </h1>
                                <p className="text-sm text-muted-foreground mt-2">
                                    Enter your club and email to receive reset instructions.
                                </p>
                            </div>

                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleSubmit();
                                }}
                                className="space-y-5"
                            >
                                {isError && (
                                    <div
                                        role="alert"
                                        className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md"
                                    >
                                        {error instanceof Error
                                            ? error.message
                                            : "Something went wrong"}
                                    </div>
                                )}

                                <div>
                                    <label htmlFor="club" className="text-sm text-muted-foreground">
                                        Club
                                    </label>
                                    <input
                                        id="club"
                                        type="text"
                                        placeholder="your-company"
                                        className="mt-1 w-full px-4 py-3 border border-border rounded-lg text-sm bg-background text-foreground outline-none focus:ring-2 focus:ring-blue-500"
                                        value={club}
                                        onChange={(e) => setClub(e.target.value)}
                                    />
                                    {fieldErrors.club && (
                                        <p className="text-xs text-red-500 mt-1">
                                            {fieldErrors.club}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label
                                        htmlFor="email"
                                        className="text-sm text-muted-foreground"
                                    >
                                        Email
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        placeholder="you@example.com"
                                        className="mt-1 w-full px-4 py-3 border border-border rounded-lg text-sm bg-background text-foreground outline-none focus:ring-2 focus:ring-blue-500"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                    {fieldErrors.email && (
                                        <p className="text-xs text-red-500 mt-1">
                                            {fieldErrors.email}
                                        </p>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={isPending}
                                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium"
                                >
                                    {isPending ? "Sending…" : "Send reset instructions"}
                                </button>
                            </form>
                        </>
                    )}

                    <p className="mt-8">
                        <button
                            type="button"
                            onClick={() => void navigate({ to: "/login" })}
                            className="text-sm text-blue-600 font-medium"
                        >
                            Back to sign in
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
