import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect } from "react";

import { useAuthStore } from "../store";

/**
 * Logout Page
 * Handles logout flow and redirects to login
 */
export default function LogoutPage(): JSX.Element {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    useEffect(() => {
        // Clear auth state
        useAuthStore.getState().clearAuth();

        // Clear all queries
        queryClient.cancelQueries();
        queryClient.clear();

        // Clear any API request interceptors state
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("token_type");

        // Redirect to login after a short delay
        const timeout = setTimeout(() => {
            navigate({ to: "/login", replace: true });
        }, 1000);

        return () => clearTimeout(timeout);
    }, [navigate, queryClient]);

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
