import { useAdminAuthStore } from "../../../store/admin-auth-store";

// Re-exports the admin auth store as the platform key store so existing
// feature containers continue to work without changes.
export function usePlatformKeyStore() {
    const platformKey = useAdminAuthStore((s) => s.platformKey ?? "");
    const isSet = useAdminAuthStore((s) => s.isAuthenticated);
    const set = useAdminAuthStore((s) => s.setPlatformKey);
    const clear = useAdminAuthStore((s) => s.logout);

    return { platformKey, isSet, set, clear };
}
