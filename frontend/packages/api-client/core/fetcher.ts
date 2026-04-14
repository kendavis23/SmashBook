// fetcher.ts — the ONLY place raw HTTP calls are made.
//
// Responsibilities (and nothing else):
//   1. Attach Authorization header from auth store
//   2. Attach X-Tenant-Subdomain in dev environments only
//   3. Map HTTP errors → ApiError (via statusToCode)
//   4. Handle 401 → silent token refresh → retry; or sign out on second failure
//   5. Normalise error shape before throwing
//
// Do NOT add business logic here.

import { getAccessToken, getTenantSubdomain, tryRefreshToken, signOut } from "@repo/auth";
import { config } from "@repo/config";
import { type ApiError, statusToCode } from "./error";

const BASE = config.apiBaseUrl;

export async function fetcher<T>(url: string, options?: RequestInit): Promise<T> {
    return _fetcher(`${BASE}${url}`, options, false);
}

async function _fetcher<T>(
    url: string,
    options: RequestInit | undefined,
    retried: boolean
): Promise<T> {
    const headers = new Headers(options?.headers);

    const token = getAccessToken();
    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    if (config.appEnv === "development") {
        const subdomain = getTenantSubdomain();
        if (subdomain) {
            headers.set("X-Tenant-Subdomain", subdomain);
        }
    }

    const response = await fetch(url, { ...options, headers }).catch(() => {
        throw {
            code: "NETWORK_ERROR",
            status: 0,
            message: "Network request failed",
        } satisfies ApiError;
    });

    if (!response.ok) {
        const detail = await response.json().catch(() => null);
        const code = statusToCode(response.status);

        // 401: attempt one silent token refresh, then retry; sign out on failure.
        if (response.status === 401 && !retried) {
            const refreshed = await tryRefreshToken();
            if (refreshed) return _fetcher(url, options, true);
            signOut();
        }

        let message = "Request failed";

        // Handle 422 validation errors — surface field-level messages
        if (response.status === 422 && Array.isArray((detail as { detail?: unknown[] })?.detail)) {
            message = (detail as { detail: { loc?: string[]; msg: string }[] }).detail
                .map((e) => {
                    const field = e.loc?.[e.loc.length - 1];
                    return `${field}: ${e.msg}`;
                })
                .join(", ");
        } else {
            message =
                (
                    detail as { detail?: { detail?: string } | string; message?: string }
                )?.detail?.toString() ||
                (detail as { message?: string })?.message ||
                "Request failed";
        }

        throw {
            code,
            status: response.status,
            message,
            detail,
        } satisfies ApiError;
    }

    return response.json() as Promise<T>;
}
