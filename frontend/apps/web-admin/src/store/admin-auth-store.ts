import { create } from "zustand";
import { savePlatformKey, loadPlatformKey, clearPlatformKey } from "../lib/platform-key-crypto";

interface AdminAuthState {
    platformKey: string | null;
    isAuthenticated: boolean;
    setPlatformKey: (plain: string) => void;
    getPlatformKey: () => string | null;
    logout: () => void;
}

function hydrate(): Pick<AdminAuthState, "platformKey" | "isAuthenticated"> {
    const key = loadPlatformKey();
    return { platformKey: key, isAuthenticated: key !== null };
}

export const useAdminAuthStore = create<AdminAuthState>((set, get) => ({
    ...hydrate(),

    setPlatformKey(plain: string) {
        savePlatformKey(plain);
        set({ platformKey: plain, isAuthenticated: true });
    },

    getPlatformKey(): string | null {
        return get().platformKey;
    },

    logout() {
        clearPlatformKey();
        set({ platformKey: null, isAuthenticated: false });
    },
}));

export function getAdminPlatformKey(): string | null {
    return useAdminAuthStore.getState().getPlatformKey();
}
