import { renderHook, waitFor } from "@testing-library/react";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

function createWrapper() {
    const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    return ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
}

// ---------------------------------------------------------------------------
// Mock services so useInitAuth / useLogin don't make real HTTP calls
// ---------------------------------------------------------------------------

vi.mock("../services", () => ({
    loginService: vi.fn(),
    registerService: vi.fn(),
    logoutService: vi.fn(),
    refreshService: vi.fn(),
    requestPasswordResetService: vi.fn(),
    confirmPasswordResetService: vi.fn(),
    getMeService: vi.fn(),
}));

vi.mock("../utils", () => ({
    isTokenExpired: vi.fn(() => false),
}));

import { useAuthStore } from "../store";
import { useAuth, useLogin } from "./index";
import { loginService, getMeService } from "../services";
import type { UserResponse } from "../types";

const mockLoginService = vi.mocked(loginService);
const mockGetMeService = vi.mocked(getMeService);

const mockUser: UserResponse = {
    id: "u1",
    email: "test@example.com",
    full_name: "Test User",
    role: "staff",
    phone: null,
    photo_url: null,
    skill_level: null,
    preferred_notification_channel: "email",
    is_active: true,
};

// ---------------------------------------------------------------------------
// Reset store between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
    useAuthStore.getState().clearAuth();
});

// ---------------------------------------------------------------------------
// useAuth — clubId resolution
// ---------------------------------------------------------------------------

describe("useAuth — clubId resolution", () => {
    it("returns null clubId when no clubs and no active club", () => {
        const { result } = renderHook(() => useAuth());
        expect(result.current.clubId).toBeNull();
    });

    it("falls back to the first JWT club when activeClubId is not set", () => {
        act(() => {
            useAuthStore.getState().setTokens({
                access_token: "tok",
                refresh_token: "ref",
                token_type: "bearer",
                clubs: [{ club_id: "c1", club_name: "Club One", role: "staff" }],
            });
        });
        const { result } = renderHook(() => useAuth());
        expect(result.current.clubId).toBe("c1");
    });

    it("returns activeClubId when explicitly set, overriding JWT club", () => {
        act(() => {
            useAuthStore.getState().setTokens({
                access_token: "tok",
                refresh_token: "ref",
                token_type: "bearer",
                clubs: [{ club_id: "c1", club_name: "Club One", role: "staff" }],
            });
            useAuthStore.getState().setActiveClubId("c2", "Club Two", "admin");
        });
        const { result } = renderHook(() => useAuth());
        expect(result.current.clubId).toBe("c2");
    });
});

// ---------------------------------------------------------------------------
// useAuth — activeClubName resolution
// ---------------------------------------------------------------------------

describe("useAuth — activeClubName resolution", () => {
    it("returns null when no club is present", () => {
        const { result } = renderHook(() => useAuth());
        expect(result.current.activeClubName).toBeNull();
    });

    it("falls back to the JWT club name when activeClubName is not set", () => {
        act(() => {
            useAuthStore.getState().setTokens({
                access_token: "tok",
                refresh_token: "ref",
                token_type: "bearer",
                clubs: [{ club_id: "c1", club_name: "Club One", role: "staff" }],
            });
        });
        const { result } = renderHook(() => useAuth());
        expect(result.current.activeClubName).toBe("Club One");
    });

    it("returns the explicit activeClubName when set", () => {
        act(() => {
            useAuthStore.getState().setActiveClubId("c2", "Club Two", "staff");
        });
        const { result } = renderHook(() => useAuth());
        expect(result.current.activeClubName).toBe("Club Two");
    });
});

// ---------------------------------------------------------------------------
// useAuth — setActiveClubId
// ---------------------------------------------------------------------------

describe("useAuth — setActiveClubId", () => {
    it("exposes setActiveClubId which updates the store", () => {
        const { result } = renderHook(() => useAuth());
        act(() => {
            result.current.setActiveClubId("c3", "Club Three", "viewer");
        });
        expect(useAuthStore.getState().activeClubId).toBe("c3");
        expect(useAuthStore.getState().activeClubName).toBe("Club Three");
        expect(useAuthStore.getState().activeRole).toBe("viewer");
    });
});

// ---------------------------------------------------------------------------
// useAuth — role resolution
// ---------------------------------------------------------------------------

describe("useAuth — role resolution", () => {
    it("returns null role when no clubs and no user role", () => {
        const { result } = renderHook(() => useAuth());
        expect(result.current.role).toBeNull();
    });

    it("returns role from first JWT club", () => {
        act(() => {
            useAuthStore.getState().setTokens({
                access_token: "tok",
                refresh_token: "ref",
                token_type: "bearer",
                clubs: [{ club_id: "c1", club_name: "Club One", role: "admin" }],
            });
        });
        const { result } = renderHook(() => useAuth());
        expect(result.current.role).toBe("admin");
    });
});

// ---------------------------------------------------------------------------
// useLogin — portal type filtering
// ---------------------------------------------------------------------------

describe("useLogin — player portal", () => {
    it("succeeds when clubs contain a player role", async () => {
        mockLoginService.mockResolvedValue({
            access_token: "tok",
            refresh_token: "ref",
            token_type: "bearer",
            clubs: [{ club_id: "c1", club_name: "Club One", role: "player" }],
        });
        mockGetMeService.mockResolvedValue(mockUser);

        const { result } = renderHook(() => useLogin("player"), { wrapper: createWrapper() });
        await act(async () => {
            await result.current.mutateAsync({
                tenant_subdomain: "test",
                email: "p@test.com",
                password: "pass",
            });
        });

        expect(useAuthStore.getState().activeRole).toBe("player");
    });

    it("throws when no player clubs are present", async () => {
        mockLoginService.mockResolvedValue({
            access_token: "tok",
            refresh_token: "ref",
            token_type: "bearer",
            clubs: [{ club_id: "c1", club_name: "Club One", role: "staff" }],
        });

        const { result } = renderHook(() => useLogin("player"), { wrapper: createWrapper() });

        await act(async () => {
            await expect(
                result.current.mutateAsync({
                    tenant_subdomain: "test",
                    email: "s@test.com",
                    password: "pass",
                })
            ).rejects.toThrow("This portal is for players only.");
        });
    });
});

describe("useLogin — staff portal", () => {
    it("succeeds when clubs contain a staff role", async () => {
        mockLoginService.mockResolvedValue({
            access_token: "tok",
            refresh_token: "ref",
            token_type: "bearer",
            clubs: [{ club_id: "c2", club_name: "Club Two", role: "admin" }],
        });
        mockGetMeService.mockResolvedValue(mockUser);

        const { result } = renderHook(() => useLogin("staff"), { wrapper: createWrapper() });
        await act(async () => {
            await result.current.mutateAsync({
                tenant_subdomain: "test",
                email: "a@test.com",
                password: "pass",
            });
        });

        expect(useAuthStore.getState().activeRole).toBe("admin");
    });

    it("throws when only player clubs are present", async () => {
        mockLoginService.mockResolvedValue({
            access_token: "tok",
            refresh_token: "ref",
            token_type: "bearer",
            clubs: [{ club_id: "c1", club_name: "Club One", role: "player" }],
        });

        const { result } = renderHook(() => useLogin("staff"), { wrapper: createWrapper() });

        await act(async () => {
            await expect(
                result.current.mutateAsync({
                    tenant_subdomain: "test",
                    email: "p@test.com",
                    password: "pass",
                })
            ).rejects.toThrow("This portal is for staff only.");
        });
    });

    it("filters out player clubs and uses only staff clubs", async () => {
        mockLoginService.mockResolvedValue({
            access_token: "tok",
            refresh_token: "ref",
            token_type: "bearer",
            clubs: [
                { club_id: "c1", club_name: "Player Club", role: "player" },
                { club_id: "c2", club_name: "Staff Club", role: "trainer" },
            ],
        });
        mockGetMeService.mockResolvedValue(mockUser);

        const { result } = renderHook(() => useLogin("staff"), { wrapper: createWrapper() });
        await act(async () => {
            await result.current.mutateAsync({
                tenant_subdomain: "test",
                email: "t@test.com",
                password: "pass",
            });
        });

        // Only the trainer club should be stored — player club filtered out.
        expect(useAuthStore.getState().clubs).toHaveLength(1);
        expect(useAuthStore.getState().clubs[0]!.club_id).toBe("c2");
        expect(useAuthStore.getState().activeRole).toBe("trainer");
    });
});
