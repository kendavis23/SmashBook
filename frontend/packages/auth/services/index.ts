// Auth service functions — raw fetch calls, no business logic, no store imports.
// api-client/fetcher.ts is NOT used here (that would be a circular dependency).
// All parameters are explicit; callers (hooks) are responsible for reading the store.

import { config } from "@repo/config";
import { buildAuthHeaders } from "../utils";
import type {
    UserLogin,
    UserRegister,
    TokenResponse,
    RefreshRequest,
    PasswordResetRequest,
    PasswordResetConfirm,
    UserResponse,
} from "../types";

const BASE = config.apiBaseUrl;

async function parseError(res: Response): Promise<Error> {
    const body = await res.json().catch(() => null);
    const message =
        (body as { detail?: string; message?: string } | null)?.detail ??
        (body as { detail?: string; message?: string } | null)?.message ??
        `Request failed (${res.status})`;
    const err = new Error(message);
    (err as Error & { status: number }).status = res.status;
    return err;
}

export async function loginService(data: UserLogin): Promise<TokenResponse> {
    const res = await fetch(`${BASE}/api/v1/auth/login`, {
        method: "POST",
        headers: buildAuthHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) throw await parseError(res);
    return res.json() as Promise<TokenResponse>;
}

export async function registerService(data: UserRegister): Promise<TokenResponse> {
    const res = await fetch(`${BASE}/api/v1/auth/register`, {
        method: "POST",
        headers: buildAuthHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) throw await parseError(res);
    return res.json() as Promise<TokenResponse>;
}

export async function refreshService(data: RefreshRequest): Promise<TokenResponse> {
    const res = await fetch(`${BASE}/api/v1/auth/refresh`, {
        method: "POST",
        headers: buildAuthHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) throw await parseError(res);
    return res.json() as Promise<TokenResponse>;
}

export async function logoutService(
    data: RefreshRequest,
    accessToken: string,
    tenantSubdomain: string | null
): Promise<void> {
    const res = await fetch(`${BASE}/api/v1/auth/logout`, {
        method: "POST",
        headers: buildAuthHeaders(accessToken, tenantSubdomain),
        body: JSON.stringify(data),
    });
    // Ignore non-2xx on logout — session is cleared locally regardless.
    if (!res.ok && res.status !== 401) throw await parseError(res);
}

export async function requestPasswordResetService(data: PasswordResetRequest): Promise<void> {
    const res = await fetch(`${BASE}/api/v1/auth/password-reset/request`, {
        method: "POST",
        headers: buildAuthHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) throw await parseError(res);
}

export async function confirmPasswordResetService(data: PasswordResetConfirm): Promise<void> {
    const res = await fetch(`${BASE}/api/v1/auth/password-reset/confirm`, {
        method: "POST",
        headers: buildAuthHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) throw await parseError(res);
}

export async function getMeService(
    accessToken: string,
    tenantSubdomain: string | null
): Promise<UserResponse> {
    const res = await fetch(`${BASE}/api/v1/players/me`, {
        method: "GET",
        headers: buildAuthHeaders(accessToken, tenantSubdomain),
    });
    if (!res.ok) throw await parseError(res);
    return res.json() as Promise<UserResponse>;
}
