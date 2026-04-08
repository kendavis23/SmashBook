// Zustand auth store (persisted).
// Never import this store directly from apps — use hooks/index.ts instead.
// getAccessToken() and getTenantSubdomain() are exported for use by api-client/fetcher.ts.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ClubSummary, UserResponse, TokenResponse } from "../types";

interface AuthStoreState {
    accessToken: string | null;
    refreshToken: string | null;
    user: UserResponse | null;
    clubs: ClubSummary[];
    // Stored after login; used as X-Tenant-Subdomain header in dev requests.
    tenantSubdomain: string | null;
}

interface AuthStoreActions {
    setTokens(tokens: TokenResponse): void;
    setUser(user: UserResponse): void;
    setTenantSubdomain(subdomain: string): void;
    clearAuth(): void;
}

type AuthStore = AuthStoreState & AuthStoreActions;

const initialState: AuthStoreState = {
    accessToken: null,
    refreshToken: null,
    user: null,
    clubs: [],
    tenantSubdomain: null,
};

export const useAuthStore = create<AuthStore>()(
    persist(
        (set) => ({
            ...initialState,

            setTokens(tokens: TokenResponse) {
                set({
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token,
                    clubs: tokens.clubs ?? [],
                });
            },

            setUser(user: UserResponse) {
                set({ user });
            },

            setTenantSubdomain(subdomain: string) {
                set({ tenantSubdomain: subdomain });
            },

            clearAuth() {
                set(initialState);
            },
        }),
        {
            name: "smashbook-auth",
            storage: createJSONStorage(() => localStorage),
            // user is NOT persisted — always fetched fresh from /me on session restore.
            partialize: (state) => ({
                accessToken: state.accessToken,
                refreshToken: state.refreshToken,
                clubs: state.clubs,
                tenantSubdomain: state.tenantSubdomain,
            }),
        }
    )
);

// ---------------------------------------------------------------------------
// Plain getters — safe to call outside React (e.g. api-client/fetcher.ts).
// ---------------------------------------------------------------------------

export function getAccessToken(): string | null {
    return useAuthStore.getState().accessToken;
}

export function getTenantSubdomain(): string | null {
    return useAuthStore.getState().tenantSubdomain;
}
