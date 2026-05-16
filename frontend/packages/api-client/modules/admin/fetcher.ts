// Admin fetcher — platform-key-authenticated requests only.
//
// Differences from core/fetcher:
//   - No Authorization header (no JWT / access token)
//   - No X-Tenant-Subdomain header injection
//   - No 401 silent-refresh / sign-out logic (403 on bad platform key just throws)
//
// platformKey is set here — callers pass it as an argument, never in headers directly.

import { config } from "@repo/config";
import { type ApiError, statusToCode } from "../../core/error";

const BASE = config.apiBaseUrl;

export async function adminFetcher<T>(
    url: string,
    platformKey: string,
    options?: RequestInit
): Promise<T> {
    const headers = new Headers(options?.headers);
    headers.set("X-Platform-Key", platformKey);

    const response = await fetch(`${BASE}${url}`, { ...options, headers }).catch(() => {
        throw {
            code: "NETWORK_ERROR",
            status: 0,
            message: "Network request failed",
        } satisfies ApiError;
    });

    if (!response.ok) {
        const detail = await response.json().catch(() => null);
        const code = statusToCode(response.status);

        let message = "Request failed";

        const detailField = (detail as { detail?: unknown })?.detail;
        if (response.status === 422 && Array.isArray(detailField)) {
            message = (detailField as { loc?: string[]; msg: string }[])
                .map((e) => {
                    const field = e.loc?.[e.loc.length - 1];
                    return `${field}: ${e.msg}`;
                })
                .join(", ");
        } else if (response.status === 422 && typeof detailField === "string") {
            message = detailField;
        } else {
            message =
                typeof detailField === "string"
                    ? detailField
                    : (detail as { message?: string })?.message || "Request failed";
        }

        throw {
            code,
            status: response.status,
            message,
            detail,
        } satisfies ApiError;
    }

    if (response.status === 204 || response.headers.get("content-length") === "0") {
        return undefined as T;
    }

    return response.json() as Promise<T>;
}
