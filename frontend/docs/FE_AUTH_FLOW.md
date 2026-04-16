_Last updated: 2026-04-16 00:00 UTC_

# FE Auth Flow

---

## 1. Login Flow

```
User fills form
  → LoginForm.tsx  (features/auth/components/LoginForm.tsx)
  → useLogin()     (packages/auth/hooks/index.ts)
      → loginService()   POST /api/v1/auth/login   → returns { access_token, refresh_token, clubs }
      → setTokens()      persists tokens + clubs to Zustand store + localStorage
      → setTenantSubdomain()
      → getMeService()   GET /api/v1/players/me    → returns UserResponse
      → setUser()        hydrates user in store (in-memory only, not persisted)
  → navigate("/dashboard")
```

**Store:** `packages/auth/store/index.ts` — Zustand store (`useAuthStore`), persisted via `localStorage` key `smashbook-auth`.

| Persisted         | Not persisted |
| ----------------- | ------------- |
| `accessToken`     | `user`        |
| `refreshToken`    |               |
| `clubs`           |               |
| `tenantSubdomain` |               |

---

## 2. Session Restore (Page Refresh)

Tokens and `clubs` survive a refresh (localStorage), but `user` does not. `useInitAuth` re-hydrates the user.

```
DashboardLayout mounts
  → useInitAuth()   (packages/auth/hooks/index.ts)
      → reads accessToken from store
      → if token is expired → tryRefreshToken() first
      → getMeService()   GET /api/v1/players/me
      → if user.role !== "owner" AND clubs[] is empty → clearAuth() + throw
           (non-owners must have a club; /refresh doesn't return clubs so
            if they were never persisted the session is unusable → re-login)
      → setUser()        re-hydrates user in store
  → while isLoading → spinner shown (DashboardLayout.tsx)
  → if no token or isError → redirect to /login
```

**File:** `apps/web-staff/src/layout/dashboard/DashboardLayout.tsx`

---

## 3. Every API Request — Fetcher

Every API call goes through the centralised fetch wrapper in `packages/api-client/core/fetcher.ts`.

```
fetcher(url, options)             (packages/api-client/core/fetcher.ts)
  → getAccessToken()              reads from Zustand store (packages/auth/store/index.ts)
  → Authorization: Bearer <token> attached to every request
  → if config.injectTenantHeader  (true when appEnv === "development" or "staging")
      → getTenantSubdomain()      reads from store
      → X-Tenant-Subdomain header attached
  → fetch(url, { ...options, headers })
  → if 401 and not already retried:
      → tryRefreshToken()         (packages/auth/hooks/index.ts)
          → refreshService()      POST /api/v1/auth/refresh
          → setTokens()           updates store with new tokens
      → if refresh succeeded → retry original request once
      → if refresh failed   → signOut() → clearAuth()
```

---

## 4. Logout Flow

```
Navbar → handleLogout()           (apps/web-staff/src/layout/dashboard/Navbar.tsx)
  → clearAuth()                   clears store + localStorage

/logout route
  → LogoutPage.tsx                (features/auth/pages/LogoutPage.tsx)
  → clearAuth() + QueryClient.clear()
  → redirect to /login after 1s
```

---

## 5. Routing

**File:** `apps/web-staff/src/app/index.tsx` — TanStack Router

| Route              | Component                           | Notes                            |
| ------------------ | ----------------------------------- | -------------------------------- |
| `/login`           | `LoginPage.tsx`                     | Public                           |
| `/logout`          | `LogoutPage.tsx`                    | Public, clears session           |
| `/forgot-password` | `ForgotPasswordPage.tsx`            | Public                           |
| `/reset-password`  | `ResetPasswordPage.tsx`             | Public                           |
| `/unauthorized`    | `UnauthorizedPage.tsx`              | Public                           |
| `/dashboard`       | `DashboardLayout` + `DashboardPage` | Auth guard via `DashboardLayout` |

**Auth guard:** `DashboardLayout.tsx` — calls `useInitAuth()` and redirects to `/login` if no valid session. There are no `beforeLoad` route guards; protection is entirely layout-level.

---

## 6. Role-Based Module Visibility

After login, the server returns a `clubs` array. Each club has a `role` field. The active club's role controls which sidebar routes are shown or hidden.

```
Login → loginService() returns { access_token, refresh_token, clubs }
  → clubs stored in useAuthStore  (packages/auth/store/index.ts)
  → useAuth() derives `role` from the active club entry

DashboardLayout renders → Sidebar + Navbar
  → Sidebar reads role via useAuth()
  → ROUTES (config/routeConfig.ts) declares each route with an optional `roles` array
      roles: undefined       → visible to any authenticated user
      roles: ["admin","owner"] → visible only to those roles
  → canAccess(route.roles, role) filters ROUTES before rendering
  → visibleRoutes used to build the sidebar nav groups
```

**How `canAccess` works** (`config/routeConfig.ts`):

```ts
canAccess(roles, userRole);
// roles undefined → always true (public to all staff)
// roles defined   → true only if userRole is in the array
```

**Group items (children):** If a parent route has `children`, only the children the user can access are shown. If no children are visible, the parent group is hidden entirely.

**Example — `staff` role:**

- `Dashboard`, `Courts`, `Bookings`, `Players`, `Support`, `Equipment` → visible (no `roles` restriction)
- `Clubs`, `Calendar`, `Staff`, `Finance`, `Reports`, `Settings` → hidden (`roles: ["owner","admin"]`)

**Changing access:** Edit the `roles` array on the relevant entry in `ROUTES` inside `apps/web-staff/src/config/routeConfig.ts`. No other file needs to change — sidebar, search, and navbar page-title lookup all read from the same source.

---

## 7. Role-Based UI Access

Role controls both page-level access and intra-page element visibility. The pattern is consistent across features:

**Auth source:** Always read role via a domain store hook (e.g. `useClubAccess()` from `@repo/staff-domain/store`), which wraps `useAuth()` internally. Features re-export it from their local `store/index.ts`. Pages do not call `useAuth()` directly.

**Page-level redirect** (`ClubsPage.tsx`):

```ts
const { isOwner, clubId } = useClubAccess();

useEffect(() => {
    if (!isOwner && clubId) {
        void navigate({ to: "/clubs/$clubId", params: { clubId } });
    }
}, [isOwner, clubId, navigate]);
```

Non-owners are redirected to their own club detail page immediately on mount.

**Tab-level visibility** (`ClubDetailPage.tsx`):

```ts
const canManage = role === "owner" || role === "admin";
const visibleTabs = TABS.filter((t) => t.id === "view" || canManage);
```

`"view"` is always visible. `"settings"`, `"hours"`, and `"pricing"` are hidden for `staff`/`employee` roles. If the active tab becomes hidden (e.g. role changes), it falls back to `"view"`.

**Action-level visibility** (`CourtsContainer.tsx` / `CourtsView.tsx`):

```ts
const { role } = useClubAccess();
const canManageCourts = role === "owner" || role === "admin";
```

`Add Court` is rendered only when `canManageCourts` is true. Staff and other non-owner/admin roles can still view courts and inspect availability, but they do not see the create action.

**Rule of thumb:**

- Sidebar route gating → `canAccess()` in `routeConfig.ts`
- Page-level redirect → feature store + `useEffect` in the page
- Intra-page elements (tabs, buttons) → derive `canManage` from store role, filter inline

---

## 8. Key Files at a Glance

| Concern                                                   | File                                                      |
| --------------------------------------------------------- | --------------------------------------------------------- |
| Login form & submit                                       | `features/auth/components/LoginForm.tsx`                  |
| Auth hooks (login, logout, refresh, initAuth)             | `packages/auth/hooks/index.ts`                            |
| Zustand auth store                                        | `packages/auth/store/index.ts`                            |
| API services (loginService, refreshService, getMeService) | `packages/auth/services/`                                 |
| Fetch wrapper (shared)                                    | `packages/api-client/core/fetcher.ts`                     |
| Session restore + layout guard                            | `apps/web-staff/src/layout/dashboard/DashboardLayout.tsx` |
| Router definition                                         | `apps/web-staff/src/app/index.tsx`                        |
