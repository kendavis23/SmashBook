import { renderHook } from "@testing-library/react";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
import { useAuth } from "./index";

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
                clubs: [{ club_id: "c1", club_name: "Club One", role: "staff" }],
            });
            useAuthStore.getState().setActiveClubId("c2", "Club Two");
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
                clubs: [{ club_id: "c1", club_name: "Club One", role: "staff" }],
            });
        });
        const { result } = renderHook(() => useAuth());
        expect(result.current.activeClubName).toBe("Club One");
    });

    it("returns the explicit activeClubName when set", () => {
        act(() => {
            useAuthStore.getState().setActiveClubId("c2", "Club Two");
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
            result.current.setActiveClubId("c3", "Club Three");
        });
        expect(useAuthStore.getState().activeClubId).toBe("c3");
        expect(useAuthStore.getState().activeClubName).toBe("Club Three");
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
                clubs: [{ club_id: "c1", club_name: "Club One", role: "admin" }],
            });
        });
        const { result } = renderHook(() => useAuth());
        expect(result.current.role).toBe("admin");
    });
});
