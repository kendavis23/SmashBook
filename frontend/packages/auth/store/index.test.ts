import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "./index";

// ---------------------------------------------------------------------------
// Reset store state between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
    useAuthStore.getState().clearAuth();
});

// ---------------------------------------------------------------------------
// setActiveClubId
// ---------------------------------------------------------------------------

describe("useAuthStore — setActiveClubId", () => {
    it("sets activeClubId, activeClubName, and activeRole", () => {
        useAuthStore.getState().setActiveClubId("club-1", "Padel Pro", "admin");
        const state = useAuthStore.getState();
        expect(state.activeClubId).toBe("club-1");
        expect(state.activeClubName).toBe("Padel Pro");
        expect(state.activeRole).toBe("admin");
    });

    it("overrides a previously set active club", () => {
        useAuthStore.getState().setActiveClubId("club-1", "First Club", "staff");
        useAuthStore.getState().setActiveClubId("club-2", "Second Club", "owner");
        const state = useAuthStore.getState();
        expect(state.activeClubId).toBe("club-2");
        expect(state.activeClubName).toBe("Second Club");
        expect(state.activeRole).toBe("owner");
    });
});

// ---------------------------------------------------------------------------
// clearAuth resets activeClubId and activeClubName
// ---------------------------------------------------------------------------

describe("useAuthStore — clearAuth", () => {
    it("clears activeClubId, activeClubName, and activeRole on sign-out", () => {
        useAuthStore.getState().setActiveClubId("club-1", "Test Club", "admin");
        useAuthStore.getState().clearAuth();
        const state = useAuthStore.getState();
        expect(state.activeClubId).toBeNull();
        expect(state.activeClubName).toBeNull();
        expect(state.activeRole).toBeNull();
    });

    it("removes persisted auth storage and legacy token keys", () => {
        useAuthStore.getState().setTokens({
            access_token: "access",
            refresh_token: "refresh",
            token_type: "bearer",
            subdomain: "test",
            clubs: [],
        });
        localStorage.setItem("access_token", "legacy-access");
        localStorage.setItem("refresh_token", "legacy-refresh");
        localStorage.setItem("token_type", "bearer");

        expect(localStorage.getItem("smashbook-auth")).not.toBeNull();

        useAuthStore.getState().clearAuth();

        expect(localStorage.getItem("smashbook-auth")).toBeNull();
        expect(localStorage.getItem("access_token")).toBeNull();
        expect(localStorage.getItem("refresh_token")).toBeNull();
        expect(localStorage.getItem("token_type")).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

describe("useAuthStore — initial state", () => {
    it("starts with null activeClubId, activeClubName, and activeRole", () => {
        const state = useAuthStore.getState();
        expect(state.activeClubId).toBeNull();
        expect(state.activeClubName).toBeNull();
        expect(state.activeRole).toBeNull();
    });
});
