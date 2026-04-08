import { useNavigate } from "@tanstack/react-router";
import type { JSX } from "react";
import { useState } from "react";

import { usePasswordResetConfirm } from "../hooks";

export default function ResetPasswordPage(): JSX.Element {
    const navigate = useNavigate();
    const { mutate, isPending, isError, error, isSuccess } = usePasswordResetConfirm();

    const [token, setToken] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [fieldErrors, setFieldErrors] = useState<{
        token?: string;
        newPassword?: string;
        confirmPassword?: string;
    }>({});

    const validate = (): boolean => {
        const errors: { token?: string; newPassword?: string; confirmPassword?: string } = {};
        if (!token) errors.token = "Required";
        if (!newPassword) errors.newPassword = "Required";
        else if (newPassword.length < 8) errors.newPassword = "Must be at least 8 characters";
        if (!confirmPassword) errors.confirmPassword = "Required";
        else if (confirmPassword !== newPassword) errors.confirmPassword = "Passwords do not match";
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = (): void => {
        if (!validate()) return;
        mutate({ token, new_password: newPassword });
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
                                    Password updated
                                </h1>
                                <p className="text-sm text-muted-foreground mt-2">
                                    Your password has been reset successfully.
                                </p>
                            </div>
                            <div className="space-y-4">
                                <div className="text-sm text-green-700 bg-green-50 px-4 py-3 rounded-md">
                                    You can now sign in with your new password.
                                </div>
                                <button
                                    type="button"
                                    onClick={() => void navigate({ to: "/login" })}
                                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium"
                                >
                                    Back to sign in
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="mb-8">
                                <h1 className="text-3xl font-semibold text-foreground">
                                    Reset password
                                </h1>
                                <p className="text-sm text-muted-foreground mt-2">
                                    Enter the reset token from your email and choose a new password.
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
                                            : "Invalid or expired token"}
                                    </div>
                                )}

                                <div>
                                    <label
                                        htmlFor="token"
                                        className="text-sm text-muted-foreground"
                                    >
                                        Reset token
                                    </label>
                                    <input
                                        id="token"
                                        type="text"
                                        placeholder="Paste your reset token"
                                        className="mt-1 w-full px-4 py-3 border border-border rounded-lg text-sm bg-background text-foreground outline-none focus:ring-2 focus:ring-blue-500"
                                        value={token}
                                        onChange={(e) => setToken(e.target.value)}
                                    />
                                    {fieldErrors.token && (
                                        <p className="text-xs text-red-500 mt-1">
                                            {fieldErrors.token}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label
                                        htmlFor="new-password"
                                        className="text-sm text-muted-foreground"
                                    >
                                        New password
                                    </label>
                                    <input
                                        id="new-password"
                                        type="password"
                                        placeholder="Min. 8 characters"
                                        className="mt-1 w-full px-4 py-3 border border-border rounded-lg text-sm bg-background text-foreground outline-none focus:ring-2 focus:ring-blue-500"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                    />
                                    {fieldErrors.newPassword && (
                                        <p className="text-xs text-red-500 mt-1">
                                            {fieldErrors.newPassword}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label
                                        htmlFor="confirm-password"
                                        className="text-sm text-muted-foreground"
                                    >
                                        Confirm password
                                    </label>
                                    <input
                                        id="confirm-password"
                                        type="password"
                                        placeholder="Repeat new password"
                                        className="mt-1 w-full px-4 py-3 border border-border rounded-lg text-sm bg-background text-foreground outline-none focus:ring-2 focus:ring-blue-500"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                    />
                                    {fieldErrors.confirmPassword && (
                                        <p className="text-xs text-red-500 mt-1">
                                            {fieldErrors.confirmPassword}
                                        </p>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={isPending}
                                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium"
                                >
                                    {isPending ? "Resetting…" : "Reset password"}
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
