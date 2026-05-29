import { useLogout } from "@repo/auth";
import { useNavigate } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect } from "react";

/**
 * Logout Page
 * Handles logout flow and redirects to login
 */
export default function LogoutPage(): JSX.Element {
    const navigate = useNavigate();
    const logout = useLogout();

    useEffect(() => {
        logout.mutate(undefined, {
            onSettled: () => {
                navigate({ to: "/login", replace: true });
            },
        });
        // Run once when the logout route mounts.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center">
                {/* Spinner */}
                <div className="flex justify-center mb-6">
                    <div className="animate-spin">
                        <svg
                            className="w-12 h-12 text-cta"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                    </div>
                </div>

                {/* Content */}
                <h1 className="text-2xl font-bold text-foreground mb-3">Logging out...</h1>
                <p className="text-muted-foreground mb-8">
                    You will be redirected to the login page shortly.
                </p>

                {/* Message */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-foreground">
                        Thank you for using SmashBook. See you soon!
                    </p>
                </div>
            </div>
        </div>
    );
}
