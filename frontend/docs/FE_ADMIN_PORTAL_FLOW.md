_Last updated: 2026-05-17 00:00 UTC_

# FE Admin Portal Flow

The `web-admin` app (`apps/web-admin`) is SmashBook's internal platform portal. It is used exclusively by the SmashBook platform team — not by club operators or players — to manage subscription plans, onboard new tenants, and monitor accounts.

Unlike the staff and player portals, the admin portal does **not** use JWT authentication. Every request is authenticated with a single shared secret: the `X-Platform-Key` header.

---

## 1. Auth Model

| Portal       | Auth mechanism         | Token type    | Stored in                  |
| ------------ | ---------------------- | ------------- | -------------------------- |
| `web-staff`  | JWT (access + refresh) | Bearer token  | `localStorage`             |
| `web-player` | JWT (access + refresh) | Bearer token  | `localStorage`             |
| `web-admin`  | Platform key           | Static secret | `sessionStorage` (encoded) |

There are no user accounts, roles, or JWTs in the admin portal. A valid `X-Platform-Key` is the only credential.

---

## 2. Login Flow

```
User opens /login
  → AdminLoginPage renders (pages/admin-login-page.tsx)
  → User types the platform key
  → Submit
      → listPlansEndpoint(key)   GET /api/v1/admin/plans
          → adminFetcher sets X-Platform-Key header
          → if 200 OK:
              savePlatformKey(key)     encodes + writes to sessionStorage
              useAdminAuthStore.setPlatformKey(key)   syncs Zustand state
              navigate("/dashboard")
          → if 401/403:
              show "Invalid platform key. Please try again."
```

The `listPlansEndpoint` call is used as the validation probe — it's a lightweight read that exercises the real `X-Platform-Key` header check on the backend. No separate `/auth/validate` endpoint is needed.

---

## 3. Route Protection

Route guards run in `apps/web-admin/src/app/index.tsx` via TanStack Router's `beforeLoad`.

```
/              → always redirects to /dashboard
/login         → if sessionStorage has a valid key → redirect to /dashboard
                 otherwise → render AdminLoginPage
/dashboard     → if no key in sessionStorage → redirect to /login
/plans         → (same guard, inherited from dashboardLayoutRoute)
/plans/new     → (same guard)
/plans/:planId → (same guard)
/tenants       → (same guard)
/tenants/:id   → (same guard)
/onboard       → (same guard)
```

The guard reads directly from `sessionStorage` via `loadPlatformKey()` — not from Zustand — so it works synchronously inside `beforeLoad` before any React component mounts. Zustand state and the router guard always agree because both use the same `sessionStorage` key (`smashbook_admin_pk`).

---

## 4. Key Files

| File                                                    | Responsibility                                                                                                                       |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/web-admin/src/pages/admin-login-page.tsx`         | Login UI — input, validation probe, error state                                                                                      |
| `apps/web-admin/src/store/admin-auth-store.ts`          | Zustand store — holds platform key in memory, delegates persistence to crypto helpers                                                |
| `apps/web-admin/src/lib/platform-key-crypto.ts`         | Encode/decode helpers — reads and writes `sessionStorage`                                                                            |
| `apps/web-admin/src/app/index.tsx`                      | Router — `beforeLoad` guards on `/login` and `dashboardLayoutRoute`                                                                  |
| `apps/web-admin/src/layout/dashboard/Navbar.tsx`        | Logout button — calls `adminLogout()` + `clearAuth()` + navigate to `/login`                                                         |
| `apps/web-admin/src/features/plan/store/platformKey.ts` | Thin proxy — re-exports `useAdminAuthStore` under the `usePlatformKeyStore` interface so existing feature containers need no changes |
| `packages/api-client/modules/admin/fetcher.ts`          | `adminFetcher` — attaches `X-Platform-Key` to every admin HTTP request                                                               |

---

## 5. Storage and Encoding

Platform key storage lives in `lib/platform-key-crypto.ts`. It uses `sessionStorage` (not `localStorage`) so the key is cleared automatically when the browser tab closes.

The key is not stored in plain text. It is encoded with a versioned salt prefix (`smashbook_admin_v1:<key>`) and then base64-encoded via `btoa`. This is **obfuscation, not encryption** — it prevents the raw key from appearing as plain text in DevTools, but it is not a cryptographic guarantee. The platform key must be treated as a secret shared out-of-band (e.g., 1Password, internal runbook).

```
sessionStorage key:  smashbook_admin_pk
value format:        base64( utf8("smashbook_admin_v1:<plaintext-key>") )
```

On page load, `useAdminAuthStore` calls `hydrate()` which reads and decodes `sessionStorage`, rehydrating `platformKey` and `isAuthenticated` into Zustand without any React lifecycle.

---

## 6. Zustand Store

`apps/web-admin/src/store/admin-auth-store.ts`

```ts
interface AdminAuthState {
    platformKey: string | null;
    isAuthenticated: boolean;
    setPlatformKey: (plain: string) => void; // encodes + saves to sessionStorage + sets Zustand
    getPlatformKey: () => string | null;
    logout: () => void; // clears sessionStorage + resets Zustand
}
```

A module-level getter `getAdminPlatformKey()` is exported for use outside React (e.g., in fetchers or utilities) without needing a hook.

---

## 7. How Feature Containers Get the Platform Key

All existing feature containers (Plans, Tenants, Onboard) import `usePlatformKeyStore` from `features/plan/store/platformKey.ts`. That file is now a thin proxy:

```ts
// features/plan/store/platformKey.ts
export function usePlatformKeyStore() {
    const platformKey = useAdminAuthStore((s) => s.platformKey ?? "");
    const isSet = useAdminAuthStore((s) => s.isAuthenticated);
    const set = useAdminAuthStore((s) => s.setPlatformKey);
    const clear = useAdminAuthStore((s) => s.logout);
    return { platformKey, isSet, set, clear };
}
```

This means zero changes were needed in `PlansContainer`, `TenantsContainer`, `ManageTenantContainer`, `EditPlanContainer`, `NewPlanContainer`, or `OnboardContainer`. They all continue to call `usePlatformKeyStore()` and receive the persisted, session-scoped key automatically.

---

## 8. API Request Flow

```
Feature container
  → useListPlans(platformKey)         packages/admin-domain/hooks/admin.hooks.ts
  → listPlansEndpoint(platformKey)    packages/api-client/modules/admin/admin.api.ts
  → adminFetcher(url, platformKey)    packages/api-client/modules/admin/fetcher.ts
      → sets X-Platform-Key header
      → fetch(BASE + url)
      → on 401/403 → throws ApiError (no redirect — auth is router-level, not fetcher-level)
      → on 200    → returns parsed JSON
```

The `adminFetcher` never reads from `sessionStorage` directly. It always receives the platform key as a function argument passed down from the domain hook. This keeps the fetcher stateless and testable.

---

## 9. Logout

Logout is triggered from `Navbar.tsx`:

```ts
const handleLogout = () => {
    clearAuth(); // clears JWT auth store (no-op for admin portal, kept for safety)
    adminLogout(); // clears sessionStorage + resets Zustand
    navigate("/login");
};
```

After logout, `sessionStorage` is cleared. Any navigation to a dashboard route immediately fires `beforeLoad`, finds no key, and redirects to `/login`.

---

## 10. What the PlatformKeySection UI Component Does Now

`shared/components/PlatformKeySection.tsx` was a pre-auth-gate UI widget that let users type the platform key inline on each page. It is still rendered in `PlansView`, `TenantsView`, and `OnboardView`, but since users are now authenticated before reaching those pages, `isSet` is always `true` by the time any dashboard page loads. The component renders the "Key set" indicator and nothing else — no input, no Set button.

This component can be removed in a future cleanup pass once the team confirms the login gate is stable.

---

## 11. Differences from Staff/Player Auth

|                | `web-staff` / `web-player`                   | `web-admin`                                    |
| -------------- | -------------------------------------------- | ---------------------------------------------- |
| Token type     | JWT (60 min TTL) + refresh (30 days)         | Static platform key (no expiry)                |
| Storage        | `localStorage`                               | `sessionStorage`                               |
| Cleared on     | Explicit logout or refresh token expiry      | Explicit logout or tab close                   |
| Auth package   | `@repo/auth` (`useAuthStore`, `useLogin`)    | `apps/web-admin/src/store/admin-auth-store.ts` |
| Request header | `Authorization: Bearer <token>`              | `X-Platform-Key: <key>`                        |
| 401 handling   | Fetcher auto-refreshes token, then signs out | Router `beforeLoad` redirects to `/login`      |
| User object    | `user.full_name`, `user.email`, role         | None — no user concept                         |
