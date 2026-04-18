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
