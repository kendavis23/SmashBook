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
    it("sets activeClubId and activeClubName", () => {
        useAuthStore.getState().setActiveClubId("club-1", "Padel Pro");
        const state = useAuthStore.getState();
        expect(state.activeClubId).toBe("club-1");
        expect(state.activeClubName).toBe("Padel Pro");
    });

    it("overrides a previously set active club", () => {
        useAuthStore.getState().setActiveClubId("club-1", "First Club");
        useAuthStore.getState().setActiveClubId("club-2", "Second Club");
        const state = useAuthStore.getState();
        expect(state.activeClubId).toBe("club-2");
        expect(state.activeClubName).toBe("Second Club");
    });
});

// ---------------------------------------------------------------------------
// clearAuth resets activeClubId and activeClubName
// ---------------------------------------------------------------------------

describe("useAuthStore — clearAuth", () => {
    it("clears activeClubId and activeClubName on sign-out", () => {
        useAuthStore.getState().setActiveClubId("club-1", "Test Club");
        useAuthStore.getState().clearAuth();
        const state = useAuthStore.getState();
        expect(state.activeClubId).toBeNull();
        expect(state.activeClubName).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

describe("useAuthStore — initial state", () => {
    it("starts with null activeClubId and activeClubName", () => {
        const state = useAuthStore.getState();
        expect(state.activeClubId).toBeNull();
        expect(state.activeClubName).toBeNull();
    });
});
