import { useLogin } from "../hooks";
import { useNavigate } from "@tanstack/react-router";
import type { FormEvent, JSX } from "react";
import { useState } from "react";

// On non-localhost hosts derive the subdomain from the first hostname segment.
// e.g. rally-staff.smashbook.app → "rally-staff"
function getTenantSubdomainFromHost(): string {
    return window.location.hostname.split(".")[0] ?? "";
}

export default function LoginForm(): JSX.Element {
    const navigate = useNavigate();
    const { mutate, isPending, isError, error } = useLogin();

    // Evaluated at render time so tests can override window.location.hostname.
    const isLocalhost = window.location.hostname === "localhost";

    const [tenantSubdomain, setTenantSubdomain] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fieldErrors, setFieldErrors] = useState<{
        tenant_subdomain?: string;
        email?: string;
        password?: string;
    }>({});

    const validate = (): boolean => {
        const errors: { tenant_subdomain?: string; email?: string; password?: string } = {};
        if (isLocalhost && !tenantSubdomain) errors.tenant_subdomain = "Required";
        if (!email) errors.email = "Required";
        if (!password) errors.password = "Required";
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = (e: FormEvent): void => {
        e.preventDefault();
        if (!validate()) return;

        const tenant_subdomain = isLocalhost ? tenantSubdomain : getTenantSubdomainFromHost();

        mutate(
            { tenant_subdomain, email, password },
            {
                onSuccess: () => {
                    void navigate({ to: "/dashboard" });
                },
            }
        );
    };

    return (
        <div className="w-full max-w-md mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-semibold text-foreground">Welcome back</h1>
                <p className="text-sm text-muted-foreground mt-2">
                    Sign in to your SmashBook account
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                {isError && (
                    <div
                        role="alert"
                        className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md"
                    >
                        {error instanceof Error ? error.message : "Invalid credentials"}
                    </div>
                )}

                {/* Tenant Subdomain — only shown on localhost (dev). Derived from URL in production. */}
                {isLocalhost && (
                    <div>
                        <label htmlFor="tenant_subdomain" className="text-sm text-muted-foreground">
                            Tenant Subdomain
                        </label>
                        <input
                            id="tenant_subdomain"
                            type="text"
                            placeholder="your-company"
                            className="mt-1 w-full px-4 py-3 border border-border rounded-lg text-sm bg-background text-foreground outline-none focus:ring-2 focus:ring-blue-500"
                            value={tenantSubdomain}
                            onChange={(e) => setTenantSubdomain(e.target.value)}
                        />
                        {fieldErrors.tenant_subdomain && (
                            <p className="text-xs text-red-500 mt-1">
                                {fieldErrors.tenant_subdomain}
                            </p>
                        )}
                    </div>
                )}

                {/* Email */}
                <div>
                    <label htmlFor="email" className="text-sm text-muted-foreground">
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
                        <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>
                    )}
                </div>

                {/* Password */}
                <div>
                    <label htmlFor="password" className="text-sm text-muted-foreground">
                        Password
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

                {/* Actions */}
                <div className="flex justify-between items-center text-sm">
                    <label className="flex items-center gap-2 text-muted-foreground">
                        <input type="checkbox" className="rounded border-border" />
                        Remember me
                    </label>
                    <button
                        type="button"
                        onClick={() => void navigate({ to: "/forgot-password" })}
                        className="text-cta font-medium"
                    >
                        Forgot password?
                    </button>
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={isPending}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium"
                >
                    {isPending ? "Signing in..." : "Sign in"}
                </button>
            </form>

            <p className="text-xs text-muted-foreground text-center mt-10">
                Secure login powered by SmashBook
            </p>
        </div>
    );
}
