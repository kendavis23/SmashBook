// Shared error contract — consumed by domain hooks and feature components.
// Features react to error.code, never to error.status directly.

export type ApiErrorCode =
    | "UNAUTHORIZED" // 401 — token missing or expired (fetcher handles silently)
    | "FORBIDDEN" // 403 — valid token, insufficient role
    | "NOT_FOUND" // 404
    | "VALIDATION_ERROR" // 422 — request body failed server validation
    | "RATE_LIMITED" // 429
    | "SERVER_ERROR" // 5xx
    | "NETWORK_ERROR" // fetch failed (offline, timeout, CORS)
    | "UNKNOWN"; // anything else

export interface ApiError {
    code: ApiErrorCode;
    status: number;
    message: string;
    detail?: unknown; // raw server payload — for logging/Sentry only, not UI
}

export function statusToCode(status: number): ApiErrorCode {
    if (status === 401) return "UNAUTHORIZED";
    if (status === 403) return "FORBIDDEN";
    if (status === 404) return "NOT_FOUND";
    if (status === 422) return "VALIDATION_ERROR";
    if (status === 429) return "RATE_LIMITED";
    if (status >= 500) return "SERVER_ERROR";
    return "UNKNOWN";
}
