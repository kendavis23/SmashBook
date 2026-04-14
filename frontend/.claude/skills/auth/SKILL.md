---
name: auth
description: SmashBook auth flow — login, session restore, token refresh, role-based access, and key files.
---

## Rules

- Only `@repo/auth` reads/writes tokens and manages session refresh
- `fetcher.ts` reads the token from auth store — it never manages tokens itself
- Apps consume `useAuth()` from `@repo/auth` — never import auth store directly
- Features read role via domain store hook (e.g. `useClubAccess()`) — not `useAuth()` directly

## Login flow

```
LoginForm → useLogin() → loginService() POST /auth/login
  → setTokens() (Zustand + localStorage)
  → getMeService() GET /players/me → setUser()
  → navigate("/dashboard")
```

## Session restore (page refresh)

`user` is NOT persisted. `DashboardLayout` calls `useInitAuth()` on mount:

```
reads accessToken → if expired: tryRefreshToken() → getMeService() → setUser()
if no token or error → redirect to /login
```

## Every API request — fetcher

```
fetcher(url) → getAccessToken() from auth store
  → attach Authorization: Bearer <token>
  → if dev: attach X-Tenant-Subdomain
  → if 401: tryRefreshToken() → retry once → if fails: signOut()
```

## Role-based access

**Sidebar routes** — `canAccess(route.roles, role)` in `routeConfig.ts`  
**Page-level redirect** — `useEffect` with `useClubAccess()` in the page  
**Intra-page elements** — derive `canManage` from store role, filter inline

```ts
const { isOwner, role } = useClubAccess(); // from @repo/staff-domain/store
const canManage = role === "owner" || role === "admin";
```

## Persisted vs in-memory

| Persisted (localStorage)                                  | In-memory only |
| --------------------------------------------------------- | -------------- |
| `accessToken`, `refreshToken`, `clubs`, `tenantSubdomain` | `user`         |

## Key files

| Concern                                       | File                                                      |
| --------------------------------------------- | --------------------------------------------------------- |
| Auth hooks (login, logout, refresh, initAuth) | `packages/auth/hooks/index.ts`                            |
| Zustand auth store                            | `packages/auth/store/index.ts`                            |
| Fetch wrapper                                 | `packages/api-client/core/fetcher.ts`                     |
| Session guard                                 | `apps/web-staff/src/layout/dashboard/DashboardLayout.tsx` |
| Route config + canAccess                      | `apps/web-staff/src/config/routeConfig.ts`                |

## Ref: `docs/FE_AUTH_FLOW.md`
