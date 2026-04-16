// JWT decode helpers and token expiry checks.
import { config } from "@repo/config";

/** Decodes the payload of a JWT without verifying the signature. */
export function decodeJwtPayload(token: string): Record<string, unknown> {
    try {
        const parts = token.split(".");
        const payloadB64 = parts[1];
        if (!payloadB64) return {};
        const padded = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
        const json = atob(padded);
        return JSON.parse(json) as Record<string, unknown>;
    } catch {
        return {};
    }
}

/** Returns true if the JWT is expired or cannot be decoded. */
export function isTokenExpired(token: string): boolean {
    const payload = decodeJwtPayload(token);
    if (typeof payload.exp !== "number") return true;
    // exp is in seconds; add a 10-second buffer to account for clock skew
    return payload.exp * 1000 - 10_000 < Date.now();
}

/** Builds fetch headers for auth service requests.
 *  accessToken     → Authorization: Bearer <token>
 *  tenantSubdomain → X-Tenant-Subdomain (only in development/staging environments)
 */
export function buildAuthHeaders(
    accessToken?: string | null,
    tenantSubdomain?: string | null
): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
    if (tenantSubdomain && config.injectTenantHeader) {
        headers["X-Tenant-Subdomain"] = tenantSubdomain;
    }
    return headers;
}
