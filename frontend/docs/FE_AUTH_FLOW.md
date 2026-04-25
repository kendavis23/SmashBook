_Last updated: 2026-04-25 00:00 UTC_

# FE Auth Flow

---

## 1. Login Flow

```
User fills form
  → LoginForm.tsx  (features/auth/components/LoginForm.tsx)
  → useLogin()     (apps/<app>/features/auth/hooks/index.ts)
       wraps useLogin(portalType) from packages/auth/hooks/index.ts
      → loginService()   POST /api/v1/auth/login   → returns { access_token, refresh_token, clubs }
      → if clubs[] is empty → clearAuth() + throw
           "Your account has no clubs assigned. Contact your administrator."
           (applies to ALL roles — owner, admin, staff, etc.)
      → filterClubsForPortal(clubs, portalType)
           web-player: keeps only clubs where role === "player"
           web-staff:  keeps only clubs where role !== "player"
           → if filtered list is empty → clearAuth() + throw portal-specific error:
               player portal: "This portal is for players only. Please use your player account to log in."
               staff portal:  "This portal is for staff only. Player accounts cannot access the staff portal."
      → setTokens()      persists tokens + filtered clubs to Zustand store + localStorage
      → setTenantSubdomain()
      → setActiveClubId(clubs[0].club_id, clubs[0].club_name, clubs[0].role)
           auto-selects the first allowed club AND its role on login
      → getMeService()   GET /api/v1/players/me    → returns UserResponse
      → setUser()        hydrates user in store (in-memory only, not persisted)
  → navigate("/dashboard")
```

**Portal type binding:** Each app's feature hook (`apps/<app>/src/features/auth/hooks/index.ts`) wraps `useLogin` with the correct `portalType` so `LoginForm.tsx` calls it without any portal-specific logic. The `portalType` defaults to `"staff"` in the base hook if called directly.

**Store:** `packages/auth/store/index.ts` — Zustand store (`useAuthStore`), persisted via `localStorage` key `smashbook-auth`.

| Persisted         | Not persisted |
| ----------------- | ------------- |
| `accessToken`     | `user`        |
| `refreshToken`    |               |
| `clubs`           |               |
| `tenantSubdomain` |               |
| `activeClubId`    |               |
| `activeClubName`  |               |
| `activeRole`      |               |

---

## 1b. Club Selection (All Roles)

After login, `DashboardLayout` uses the clubs array from the login response for **all roles** (owner and non-owner alike). No additional API call is made.

```
DashboardLayout mounts
  → useAuth()              reads clubs (JWT clubs from login response) for all roles
  → clubs = jwtClubs.map(c => ({ id, name, role }))
  → if activeClubId is null and clubs.length > 0
      → setActiveClubId(clubs[0].id, clubs[0].name, clubs[0].role)  persisted to store
  → Navbar receives clubs[] + isClubsLoading=false as props
      → passes them to SwitchClubModal
```

**No owner API call:** Owners no longer call `GET /api/v1/clubs`. All roles use the `clubs` array returned by the login response.

**SwitchClubModal is data-agnostic** — it accepts `clubs: ClubOption[]` and `isLoading` as props. It does not fetch data itself. This makes it reusable by any app.

**Architecture for multi-app club switching:**

| App          | Club data source                       | Notes                                      |
| ------------ | -------------------------------------- | ------------------------------------------ |
| `web-staff`  | JWT clubs from login response          | Passed via `DashboardLayout` → `Navbar`    |
| `web-player` | Future hook from `@repo/player-domain` | Same pattern — layout fetches, passes down |

The `ClubOption { id, name, role }` interface is exported from `SwitchClubModal.tsx` and is the only contract the modal cares about.

**Switch Club is visible for all roles** in the navbar dropdown. The active club name is shown in the navbar header for all roles.

---

## 2. Session Restore (Page Refresh)

Tokens, `clubs`, and `activeRole` survive a refresh (localStorage), but `user` does not. `useInitAuth` re-hydrates the user.

```
DashboardLayout mounts
  → useInitAuth()   (packages/auth/hooks/index.ts)
      → reads accessToken from store
      → if token is expired → tryRefreshToken() first
      → getMeService()   GET /api/v1/players/me
      → if clubs[] is empty → clearAuth() + throw
           (all roles must have a club — if none persisted the session is unusable → re-login)
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

**Auth guard:** `DashboardLayout.tsx` — calls `useInitAuth()` and redirects to `/login` if no valid session.

**Role guard:** Every restricted route also has a `beforeLoad` hook in `app/index.tsx` that calls `requireRole(roles)`. This reads `getActiveRole()` from the auth store and throws a `redirect({ to: "/unauthorized" })` if the current role is not in the allowed list. This prevents direct URL access to routes the sidebar hides — navigating to `/bookings` as a `trainer` shows the 403 Unauthorized page instead of the page content.

```
requireRole(["owner", "admin"])   ← defined in app/index.tsx
  → getActiveRole()               reads activeRole from Zustand store (localStorage-persisted)
  → canAccess(roles, role)        imported from config/routeConfig.ts
  → if not allowed → redirect to /unauthorized
```

`getActiveRole()` is exported from `packages/auth/store/index.ts` as a plain getter (safe to call outside React, parallel to `getAccessToken`).

---

## 6. Role-Based Module Visibility

The login response returns a `clubs` array. Each club entry carries a `role` field. The **active club's role** controls which sidebar routes are shown or hidden. Switching clubs switches the role too.

```
Login → loginService() returns { access_token, refresh_token, clubs }
  → clubs stored in useAuthStore  (packages/auth/store/index.ts)
  → first club's role stored in activeRole
  → useAuth() reads activeRole → role

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

**Changing access:** Edit the `roles` array on the relevant entry in `ROUTES` inside `apps/web-staff/src/config/routeConfig.ts`, **and** update the matching `beforeLoad: requireRole([...])` call on the corresponding route in `apps/web-staff/src/app/index.tsx`. Both must stay in sync — `routeConfig.ts` controls sidebar visibility and `app/index.tsx` controls router-level enforcement.

---

## 7. Role per Club — Club Switching

A single user can have a different role in each club. Switching the active club switches the active role automatically.

```
Example: john@example.com
  Club A → role: admin
  Club B → role: staff
  Club C → role: viewer
```

```
SwitchClubModal — user selects Club B
  → handleSelect(club.id, club.name, club.role)
  → setActiveClubId(id, name, role)   persisted to store (activeClubId, activeClubName, activeRole)
  → useAuth() now returns role = "staff"
  → Sidebar re-renders with routes filtered for "staff"
```

**Roles available per app:**

| Application  | Audience                    | Roles Available                                                                                                                                 |
| ------------ | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `web-player` | Players / end-users         | `player` only — login rejected if no `player` club present                                                                                      |
| `web-staff`  | Internal staff / management | `owner`, `admin`, `ops_lead`, `staff`, `front_desk`, `trainer`, `viewer` — `player` clubs are stripped; login rejected if no staff club remains |

**Enforcement point:** `filterClubsForPortal()` in `packages/auth/hooks/index.ts` — called inside `useLogin` on every login attempt before tokens are persisted.

---

## 8. Role-Based UI Access

Role controls both page-level access and intra-page element visibility. The pattern is consistent across features:

**Auth source:** Always read role via a domain store hook (e.g. `useClubAccess()` from `@repo/staff-domain/store`), which wraps `useAuth()` internally. Features re-export it from their local `store/index.ts`. Pages do not call `useAuth()` directly.

**Access functions — single source of truth:**

Each feature defines an `access.ts` file inside its `store/` folder. This is the **only** place role-to-permission logic is written. Components and containers call these functions — they never repeat inline role comparisons.

```
features/<feature>/store/access.ts   ← all role checks live here
features/<feature>/store/index.ts    ← re-exports useClubAccess + access functions
```

Example (`features/club/store/access.ts`):

```ts
const MANAGE_ROLES: TenantUserRole[] = ["owner", "admin"];
const CREATE_CLUB_ROLES: TenantUserRole[] = ["owner"];

export function canManageClub(role) {
    return role !== null && MANAGE_ROLES.includes(role);
}
export function canCreateClub(role) {
    return role !== null && CREATE_CLUB_ROLES.includes(role);
}
export function canViewClubList(role) {
    return role === "owner";
}
```

To extend access (e.g. grant `staff` the ability to manage settings), edit **only** the relevant array in `access.ts`.

**Page-level redirect** (`ClubsContainer.tsx`):

```ts
const { role, clubId } = useClubAccess();

useEffect(() => {
    if (!canViewClubList(role) && clubId) {
        void navigate({ to: "/clubs/$clubId", params: { clubId } });
    }
}, [role, clubId, navigate]);
```

Non-owners are redirected to their own club detail page immediately on mount.

**Tab-level visibility** (`ClubDetailContainer.tsx`):

```ts
const { role } = useClubAccess();
const canManage = canManageClub(role);
const visibleTabs = TABS.filter((t) => t.id === "view" || canManage);
```

`"view"` is always visible. `"settings"`, `"hours"`, and `"pricing"` are hidden unless `canManageClub` returns true. If the active tab becomes hidden (e.g. role changes), it falls back to `"view"`.

**Action-level visibility** (`CourtsContainer.tsx` / `CourtsView.tsx`):

```ts
const { role } = useClubAccess();
const canManageCourts = role === "owner" || role === "admin";
```

`Add Court` is rendered only when `canManageCourts` is true. Staff and other non-owner/admin roles can still view courts and inspect availability, but they do not see the create action.

**Rule of thumb:**

- Router-level enforcement (blocks direct URL access) → `beforeLoad: requireRole([...])` in `app/index.tsx`
- Sidebar route gating (hides links) → `canAccess()` in `routeConfig.ts`
- Page-level redirect → `access.ts` function + `useEffect` in the container
- Intra-page elements (tabs, buttons) → `access.ts` function, result passed as prop to View
- **Never** write `role === "owner" || role === "admin"` inline in a component — always call an `access.ts` function

---

## 9. Key Files at a Glance

| Concern                                                   | File                                                      |
| --------------------------------------------------------- | --------------------------------------------------------- |
| Login form & submit                                       | `features/auth/components/LoginForm.tsx`                  |
| Auth hooks (login, logout, refresh, initAuth)             | `packages/auth/hooks/index.ts`                            |
| Zustand auth store                                        | `packages/auth/store/index.ts`                            |
| API services (loginService, refreshService, getMeService) | `packages/auth/services/`                                 |
| Fetch wrapper (shared)                                    | `packages/api-client/core/fetcher.ts`                     |
| Session restore + layout guard                            | `apps/web-staff/src/layout/dashboard/DashboardLayout.tsx` |
| Router definition                                         | `apps/web-staff/src/app/index.tsx`                        |
