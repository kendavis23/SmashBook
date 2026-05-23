import { useRegister } from "../hooks";
import { useNavigate, useSearch } from "@tanstack/react-router";
import type { FormEvent, JSX } from "react";
import { useState } from "react";

type RegisterSearch = { clubid?: string; t_subdomain?: string };

export default function RegisterForm(): JSX.Element {
    const navigate = useNavigate();
    const search = useSearch({ strict: false }) as RegisterSearch;

    const tenantSubdomain = search.t_subdomain ?? "";
    const clubId = search.clubid ?? "";

    const { mutate, isPending, isError, error } = useRegister();

    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [fieldErrors, setFieldErrors] = useState<{
        fullName?: string;
        email?: string;
        password?: string;
        confirmPassword?: string;
    }>({});

    const validate = (): boolean => {
        const errors: typeof fieldErrors = {};
        if (!fullName.trim()) errors.fullName = "Required";
        if (!email.trim()) errors.email = "Required";
        if (!password) errors.password = "Required";
        if (!confirmPassword) errors.confirmPassword = "Required";
        else if (password && confirmPassword && password !== confirmPassword)
            errors.confirmPassword = "Passwords do not match";
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = (e: FormEvent): void => {
        e.preventDefault();
        if (!validate()) return;

        mutate(
            {
                tenant_subdomain: tenantSubdomain,
                club_id: clubId,
                email,
                full_name: fullName,
                password,
            },
            {
                onSuccess: () => {
                    void navigate({ to: "/login" });
                },
            }
        );
    };

    return (
        <div className="w-full max-w-md mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-semibold text-foreground">Register</h1>
                <p className="text-sm text-muted-foreground mt-2">Create your SmashBook account</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                {isError && (
                    <div
                        role="alert"
                        className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md"
                    >
                        {error instanceof Error ? error.message : "Registration failed"}
                    </div>
                )}

                {/* Full Name */}
                <div>
                    <label htmlFor="fullName" className="text-sm text-muted-foreground">
                        <span className="text-red-500 mr-1">*</span>Name
                    </label>
                    <input
                        id="fullName"
                        type="text"
                        placeholder="Your full name"
                        className="mt-1 w-full px-4 py-3 border border-border rounded-lg text-sm bg-background text-foreground outline-none focus:ring-2 focus:ring-blue-500"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                    />
                    {fieldErrors.fullName && (
                        <p className="text-xs text-red-500 mt-1">{fieldErrors.fullName}</p>
                    )}
                </div>

                {/* Email */}
                <div>
                    <label htmlFor="email" className="text-sm text-muted-foreground">
                        <span className="text-red-500 mr-1">*</span>Email
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
                        <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>
                    )}
                </div>

                {/* Password */}
                <div>
                    <label htmlFor="password" className="text-sm text-muted-foreground">
                        <span className="text-red-500 mr-1">*</span>Password
                    </label>
                    <input
                        id="password"
                        type="password"
                        placeholder="Enter password"
                        className="mt-1 w-full px-4 py-3 border border-border rounded-lg text-sm bg-background text-foreground outline-none focus:ring-2 focus:ring-blue-500"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    {fieldErrors.password && (
                        <p className="text-xs text-red-500 mt-1">{fieldErrors.password}</p>
                    )}
                </div>

                {/* Confirm Password */}
                <div>
                    <label htmlFor="confirmPassword" className="text-sm text-muted-foreground">
                        <span className="text-red-500 mr-1">*</span>Confirm password
                    </label>
                    <input
                        id="confirmPassword"
                        type="password"
                        placeholder="Confirm password"
                        className="mt-1 w-full px-4 py-3 border border-border rounded-lg text-sm bg-background text-foreground outline-none focus:ring-2 focus:ring-blue-500"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    {fieldErrors.confirmPassword && (
                        <p className="text-xs text-red-500 mt-1">{fieldErrors.confirmPassword}</p>
                    )}
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={isPending}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium"
                >
                    {isPending ? "Registering..." : "Register"}
                </button>

                {/* Login link */}
                <p className="text-sm text-center text-muted-foreground">
                    Already have an account?{" "}
                    <button
                        type="button"
                        onClick={() => void navigate({ to: "/login" })}
                        className="text-cta font-medium"
                    >
                        Sign in
                    </button>
                </p>
            </form>

            <p className="text-xs text-muted-foreground text-center mt-10">
                Secure registration powered by SmashBook
            </p>
        </div>
    );
}
