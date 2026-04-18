// Auth hooks — consume these in apps and features; never import the store directly.
// Also exports tryRefreshToken() and signOut() for use by api-client/fetcher.ts.

import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../store";
import {
    loginService,
    registerService,
    logoutService,
    refreshService,
    requestPasswordResetService,
    confirmPasswordResetService,
    getMeService,
} from "../services";
import { isTokenExpired } from "../utils";
import type {
    UserLogin,
    UserRegister,
    PasswordResetRequest,
    PasswordResetConfirm,
    UserResponse,
    TenantUserRole,
} from "../types";

// ---------------------------------------------------------------------------
// useAuth — read current session state
// ---------------------------------------------------------------------------

export function useAuth() {
    const user = useAuthStore((s) => s.user);
    const accessToken = useAuthStore((s) => s.accessToken);
    const clubs = useAuthStore((s) => s.clubs);
    const tenantSubdomain = useAuthStore((s) => s.tenantSubdomain);
    const activeClubId = useAuthStore((s) => s.activeClubId);
    const activeClubName = useAuthStore((s) => s.activeClubName);
    const activeRole = useAuthStore((s) => s.activeRole);
    const setActiveClubId = useAuthStore((s) => s.setActiveClubId);

    // Resolve active club — fall back to first club when no explicit selection has been made
    const firstClub = clubs[0];
    const clubId = activeClubId ?? firstClub?.club_id ?? null;
    const resolvedClubName = activeClubName ?? firstClub?.club_name ?? null;

    // Role comes from the active club entry so it switches when the active club changes.
    const resolvedRole: TenantUserRole | null =
        (activeRole as TenantUserRole | null) ??
        (firstClub?.role as TenantUserRole | undefined) ??
        null;

    const isAuthenticated = !!accessToken && !!user;

    return {
        user,
        accessToken,
        clubs,
        clubId,
        activeClubName: resolvedClubName,
        tenantSubdomain,
        isAuthenticated,
        role: resolvedRole,
        setActiveClubId,
    };
}

// ---------------------------------------------------------------------------
// useInitAuth — call once at app root to restore session after page refresh.
// Reads the persisted access token; if valid, fetches /me and hydrates user.
// If the access token is expired it attempts a silent refresh first.
// ---------------------------------------------------------------------------

export function useInitAuth() {
    const { setUser, clearAuth } = useAuthStore.getState();
    const accessToken = useAuthStore((s) => s.accessToken);

    return useQuery({
        queryKey: ["auth", "me"],
        queryFn: async (): Promise<UserResponse> => {
            const state = useAuthStore.getState();
            let token = state.accessToken;

            if (!token) {
                clearAuth();
                throw new Error("No access token");
            }

            // Silently refresh if expired before fetching /me.
            if (isTokenExpired(token)) {
                const refreshed = await tryRefreshToken();
                if (!refreshed) {
                    clearAuth();
                    throw new Error("Session expired");
                }
                token = useAuthStore.getState().accessToken!;
            }

            const user = await getMeService(token, state.tenantSubdomain);

            // All roles must have at least one club. If clubs are missing
            // (e.g. /refresh did not return clubs and none were persisted),
            // the session is unusable — force a fresh login.
            if (state.clubs.length === 0) {
                clearAuth();
                throw new Error("No club assigned");
            }

            setUser(user);
            return user;
        },
        enabled: !!accessToken,
        retry: false,
        staleTime: 5 * 60 * 1000, // re-validate /me at most every 5 min
    });
}

// ---------------------------------------------------------------------------
// useLogin — POST /api/v1/auth/login then GET /api/v1/players/me
// ---------------------------------------------------------------------------

export function useLogin() {
    return useMutation({
        mutationFn: async (credentials: UserLogin): Promise<UserResponse> => {
            const { setTokens, setUser, setTenantSubdomain, setActiveClubId, clearAuth } =
                useAuthStore.getState();

            const tokens = await loginService(credentials);

            if (!tokens.clubs || tokens.clubs.length === 0) {
                clearAuth();
                throw new Error("Your account has no clubs assigned. Contact your administrator.");
            }

            setTokens(tokens);
            setTenantSubdomain(credentials.tenant_subdomain);

            // Auto-select the first club and its role immediately on login.
            const firstClub = tokens.clubs[0]!;
            setActiveClubId(firstClub.club_id, firstClub.club_name, firstClub.role);

            const user = await getMeService(tokens.access_token, credentials.tenant_subdomain);
            setUser(user);
            return user;
        },
    });
}

// ---------------------------------------------------------------------------
// useRegister — POST /api/v1/auth/register then GET /api/v1/players/me
// ---------------------------------------------------------------------------

export function useRegister() {
    return useMutation({
        mutationFn: async (data: UserRegister): Promise<UserResponse> => {
            const { setTokens, setUser, setTenantSubdomain } = useAuthStore.getState();

            const tokens = await registerService(data);
            setTokens(tokens);
            setTenantSubdomain(data.tenant_subdomain);

            const user = await getMeService(tokens.access_token, data.tenant_subdomain);
            setUser(user);
            return user;
        },
    });
}

// ---------------------------------------------------------------------------
// useLogout — POST /api/v1/auth/logout then clear local state
// ---------------------------------------------------------------------------

export function useLogout() {
    return useMutation({
        mutationFn: async (): Promise<void> => {
            const { accessToken, refreshToken, tenantSubdomain } = useAuthStore.getState();
            if (accessToken && refreshToken) {
                await logoutService({ refresh_token: refreshToken }, accessToken, tenantSubdomain);
            }
        },
        onSettled: () => {
            useAuthStore.getState().clearAuth();
        },
    });
}

// ---------------------------------------------------------------------------
// usePasswordResetRequest — POST /api/v1/auth/password-reset/request
// ---------------------------------------------------------------------------

export function usePasswordResetRequest() {
    return useMutation({
        mutationFn: (data: PasswordResetRequest) => requestPasswordResetService(data),
    });
}

// ---------------------------------------------------------------------------
// usePasswordResetConfirm — POST /api/v1/auth/password-reset/confirm
// ---------------------------------------------------------------------------

export function usePasswordResetConfirm() {
    return useMutation({
        mutationFn: (data: PasswordResetConfirm) => confirmPasswordResetService(data),
    });
}

// ---------------------------------------------------------------------------
// Non-hook exports — used by api-client/fetcher.ts for 401 handling.
// ---------------------------------------------------------------------------

/**
 * Attempts a silent token refresh using the stored refresh token.
 * Updates the store on success; clears auth on failure.
 * Returns true if a new access token was obtained.
 */
export async function tryRefreshToken(): Promise<boolean> {
    const { refreshToken, setTokens, clearAuth } = useAuthStore.getState();
    if (!refreshToken) return false;

    try {
        const tokens = await refreshService({ refresh_token: refreshToken });
        setTokens(tokens);
        return true;
    } catch {
        clearAuth();
        return false;
    }
}

/** Clears all auth state — call after a failed refresh in fetcher.ts. */
export function signOut(): void {
    useAuthStore.getState().clearAuth();
}
