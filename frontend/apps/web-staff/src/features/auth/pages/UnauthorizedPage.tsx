import { Link } from "@tanstack/react-router";
import type { JSX } from "react";

import { useAuth } from "../hooks";

/**
 * Unauthorized Page
 * Shown when user doesn't have required role for a route
 */
export default function UnauthorizedPage(): JSX.Element {
    const { user } = useAuth();

    return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center">
                {/* Icon */}
                <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                        <svg
                            className="w-10 h-10 text-red-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4v2m0 4v2m-6-4v2m6-6v2m0 4v2m6-6v2m0 4v2m-6-4v2m6-6v2"
                            />
                        </svg>
                    </div>
                </div>

                {/* Content */}
                <h1 className="text-4xl font-bold text-foreground mb-3">403</h1>
                <h2 className="text-2xl font-semibold text-foreground mb-4">Access Denied</h2>

                <p className="text-muted-foreground mb-2">
                    You don&apos;t have permission to access this resource.
                </p>

                {user && (
                    <p className="text-sm text-muted-foreground mb-8">
                        Your current role:{" "}
                        <span className="font-semibold capitalize">{user.role}</span>
                    </p>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col gap-3">
                    <Link
                        to="/dashboard"
                        className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
                    >
                        Go to Dashboard
                    </Link>

                    <Link
                        to="/"
                        className="w-full px-4 py-3 bg-muted text-foreground rounded-lg font-medium hover:bg-accent transition"
                    >
                        Go Home
                    </Link>
                </div>

                {/* Help Section */}
                <div className="mt-8 p-4 bg-background rounded-lg border border-border">
                    <p className="text-sm text-muted-foreground">
                        Need help? Contact your administrator if you believe this is a mistake.
                    </p>
                </div>
            </div>
        </div>
    );
}
