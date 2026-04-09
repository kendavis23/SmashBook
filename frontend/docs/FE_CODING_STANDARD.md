_Last updated: 2026-04-06 00:00 UTC_

# Frontend Coding Standards

> **Core Principle:** Apps are thin. Packages are powerful. Clean boundaries = scalable system.

This document is the authoritative coding standard for the SmashBook frontend monorepo. All code changes must conform to these rules before review. See [FE_ARCHITECTURE.md](FE_ARCHITECTURE.md) for project structure and technical stack.

## Table of Contents

- [1. Project Philosophy](#1-project-philosophy)
- [2. Monorepo Architecture](#2-monorepo-architecture)
- [3. App Layer Rules](#3-app-layer-rules)
- [4. API Layer Rules](#4-api-layer-rules)
- [5. Domain Package Rules](#5-domain-package-rules)
- [6. Feature Structure](#6-feature-structure)
- [7. Component Rules](#7-component-rules)
- [8. Hook Rules](#8-hook-rules)
- [9. State Management](#9-state-management)
- [10. Styling Rules](#10-styling-rules)
- [11. Auth Rules](#11-auth-rules)
- [12. Environment & Config Rules](#12-environment--config-rules)
- [13. Testing Rules](#13-testing-rules)
- [14. Error Handling](#14-error-handling)
- [15. Naming Conventions](#15-naming-conventions)
- [16. Code Quality Standards](#16-code-quality-standards)
- [17. Anti-Patterns](#17-anti-patterns)
- [18. PR Checklist](#18-pr-checklist)
- [19. Decision Guide](#19-decision-guide)

---

## 1. Project Philosophy

- Follow **Domain-Driven Design (DDD)** — every piece of logic lives in its domain
- Prefer **composition over duplication** — share via packages, never copy-paste
- Keep **business logic outside UI** — components should only render and delegate
- Every folder must have **clear, single ownership** — no orphan code

---

## 2. Monorepo Architecture

```
apps/          → thin shells (routing, layout, providers only)
packages/      → all logic, UI, and configuration
```

### Package ownership table

| Package           | Owns                                                                              | Does NOT own                      |
| ----------------- | --------------------------------------------------------------------------------- | --------------------------------- |
| `api-client`      | HTTP calls, fetcher config, query keys, `ApiError` type, DTO types, error mapping | Business rules, domain state      |
| `player-domain`   | Player models, business logic, hooks, store                                       | API implementation, UI, DTO types |
| `staff-domain`    | Staff models, business logic, hooks, store, mappers                               | API implementation, UI, DTO types |
| `auth`            | Tokens, session, login/logout flows                                               | Non-auth domain logic             |
| `i18n`            | Locale strings, translation hooks                                                 | App-specific copy decisions       |
| `ui`              | Shared reusable components (shadcn)                                               | Feature-specific or domain logic  |
| `design-system`   | Tokens, theme, spacing, typography                                                | Components                        |
| `eslint-config`   | ESLint rule sets                                                                  | —                                 |
| `tsconfig`        | TypeScript configs                                                                | —                                 |
| `tailwind-config` | Tailwind preset                                                                   | —                                 |
| `testing`         | MSW handlers, shared mocks, test utils                                            | —                                 |

---

## 3. App Layer Rules

Apps are **composition shells only** (`apps/*`).

### ✅ Apps MUST only contain

- Route definitions and lazy-loaded page components
- Layout composition (`DashboardLayout`)
- App-level providers (`QueryClientProvider`, `ThemeProvider`, `AuthProvider`)

### ❌ Apps MUST NOT contain

- API calls of any kind
- Business logic or domain computations
- Domain-level Zustand stores
- Direct `fetch()` or `axios` usage

```ts
// ❌ Wrong — business logic inside app
// apps/web-player/src/features/booking/api.ts
const bookings = await fetch("/api/bookings");

// ✅ Correct — delegate to domain
// packages/player-domain/services/getBookings.ts
export const getUpcomingBookings = async () => {
    const data = await getBookings(); // from api-client
    return data.filter(isUpcoming); // business rule lives here
};
```

---

## 4. API Layer Rules

`packages/api-client` is the **only** place raw HTTP calls are made.

```ts
// ✅ api-client — HTTP only, no business rules
// packages/api-client/endpoints/bookings.ts
export const getBookings = (): Promise<Booking[]> => fetcher("/bookings");

// ✅ domain — consumes api-client, applies business logic
// packages/player-domain/services/bookings.ts
import { getBookings } from "@repo/api-client";

export const getUpcomingBookings = async () => {
    const data = await getBookings();
    return data.filter((b) => isAfter(b.date, new Date()));
};
```

### `fetcher.ts` responsibilities (and nothing else)

- Attach `Authorization` header from auth store
- Attach `X-Tenant-Subdomain` only in local/dev environments
- In production → do NOT send any tenant header (use URL-based resolution)
- Handle 401 → trigger token refresh
- Normalize error shape

---

## 5. Domain Package Rules

Domain packages are the **brain** of the system (`packages/*-domain`).

### Structure

```
staff-domain/               # reference implementation
  hooks/           # domain hooks — e.g. club.hooks.ts, profile.hooks.ts
  mappers/         # DTO → model transformations — e.g. club.mapper.ts
  models/          # domain model types — the ONLY types exposed to apps
  services/        # pure async functions (business logic)
  store/           # Zustand slices (domain state only)
  types/           # internal supporting types (NOT exported via index.ts)
  index.ts         # explicit public API surface (models + hooks only)
```

### Rules

- Domain exposes **models** to apps via `index.ts` — never DTOs or raw API types
- DTO types live inside `api-client/modules/*/` — domain maps them to models via `mappers/`
- Domain state lives in `domain/store`, never in components
- Cross-domain imports are **strictly prohibited** — `player-domain` cannot import from `staff-domain` and vice versa
- `types/` holds internal supporting types only — not part of the public `index.ts`
- `index.ts` defines the public surface — only models and hooks are exported

```ts
// ❌ Cross-domain import — prohibited
import { useStaffProfile } from "@repo/staff-domain"; // inside player-domain

// ✅ Shared logic goes in api-client (if HTTP) or a domain's own services
import { getClubDTO } from "@repo/api-client";
```

---

## 6. Feature Structure

Every feature inside `apps/*/src/features/` MUST follow this structure (based on `apps/web-staff/src/features/club`):

```
feature-name/
  components/      # UI components for this feature only
  hooks/           # feature-local hooks (wrapping domain hooks)
  pages/           # page-level components (routed entry points)
  store/           # feature-local Zustand slice (UI state only, if needed)
  types/           # feature-local TS types
```

### Rules

- **No cross-feature imports** — `booking` cannot import from `profile`
- Features communicate **only via domain packages**
- Pages are routed entry points — they delegate data to domain hooks and rendering to components
- `types/` holds feature-local types only — never import from `packages/types` or expose DTOs here
- A feature that grows beyond 10 files must be **split into sub-features**

---

## 7. Component Rules

### Component classification

| Type             | Location                             |
| ---------------- | ------------------------------------ |
| Feature-specific | `apps/*/features/[name]/components/` |
| Shared/reusable  | `packages/ui/components/`            |
| Layout           | `apps/*/layout/`                     |

### ✅ Always use the container/view pattern

```tsx
// ✅ Container — handles data, delegates rendering
const BookingPage = () => {
    const { bookings, isLoading } = useBookings();
    return <BookingView bookings={bookings} isLoading={isLoading} />;
};

// ✅ View — pure rendering, no logic
const BookingView = ({ bookings, isLoading }: BookingViewProps) => {
    if (isLoading) return <Skeleton />;
    return <BookingList items={bookings} />;
};
```

### ❌ Avoid

- Components longer than **200 lines** — split them
- Mixing data fetching + rendering in the same component
- API calls or `fetch()` directly inside components
- `useEffect` for data fetching — use React Query hooks from domain instead

---

## 8. Hook Rules

### ✅ Hooks MUST

- Encapsulate and reuse logic — no duplicated logic across features
- Wrap domain hooks for feature-specific composition
- Follow naming: `useSomething`

### ❌ Hooks MUST NOT

- Call `fetch()` or `axios` directly
- Duplicate business logic already in domain services
- Reach into another feature's hooks

```ts
// ✅ Feature hook wraps domain hook
const useBookingPage = () => {
    const { bookings } = useUpcomingBookings(); // from player-domain
    const { profile } = usePlayerProfile(); // from player-domain
    return { bookings, profile };
};
```

---

## 9. State Management

| State type          | Where it lives                       |
| ------------------- | ------------------------------------ |
| Domain/server state | `packages/*-domain/store/`           |
| Auth state          | `packages/auth/store/`               |
| UI/local state      | Component `useState` or feature hook |
| Mobile-native state | `apps/mobile-player/src/store/`      |

### Rules

- Do **not** use global Zustand stores for UI-only state (modals, tabs, accordion open state)
- Domain stores are consumed by domain hooks — apps never import stores directly
- Persist only what truly needs persistence (auth tokens, user preferences)

```ts
// ❌ Wrong — app importing store directly
import { usePlayerStore } from "@repo/player-domain/store";

// ✅ Correct — app imports domain hook
import { usePlayerProfile } from "@repo/player-domain";
```

---

## 10. Styling Rules

- Use **Tailwind utility classes only** — no custom CSS files
- Use **design tokens** from `@repo/design-system` via Tailwind CSS variables

```tsx
// ✅ Correct
<div className="bg-primary text-primary-foreground rounded-lg p-4" />

// ❌ Wrong — hardcoded values
<div style={{ backgroundColor: '#6366f1', color: 'white' }} />

// ❌ Wrong — arbitrary Tailwind values without design token
<div className="bg-[#6366f1]" />
```

All apps extend `@repo/tailwind-config`. Never redefine tokens locally per app.

---

## 11. Auth Rules

The `@repo/auth` package is the **single source of truth** for authentication.

- Only `auth` package reads/writes tokens
- Only `auth` package manages session refresh
- `api-client/fetcher.ts` reads the token from `auth` store — it never manages the token itself
- Apps consume `useAuth()` hook from `@repo/auth` — never import the store directly

```ts
// ✅ Correct
import { useAuth } from "@repo/auth";
const { user, logout } = useAuth();

// ❌ Wrong — importing auth store directly in app
import { authStore } from "@repo/auth/store";
```

---

## 12. Environment & Config Rules

Never access `process.env` or `import.meta.env` directly in app or package code.

```ts
// ❌ Wrong
const url = process.env.API_URL;
const key = import.meta.env.VITE_API_KEY;

// ✅ Correct — all env access goes through config package
import { config } from "@repo/config";
const url = config.apiUrl;
```

`packages/config/index.ts` validates all env vars at startup (use Zod) and exports typed config. If a required variable is missing, it throws at startup — not at runtime.

---

## 13. Testing Rules

| Layer       | Tool                  | What to test                       |
| ----------- | --------------------- | ---------------------------------- |
| Unit        | Vitest                | Domain services, utils, validators |
| Component   | React Testing Library | Component behavior from user POV   |
| Integration | MSW + Vitest          | Hook + API interaction             |

### Rules

- Test **behavior**, not implementation details
- Mock APIs using MSW handlers from `@repo/testing/msw`
- Never test Zustand store internals — test via hooks
- Every domain service with business logic **must** have unit tests
- Component tests use `screen.getByRole` — never `getByTestId` unless unavoidable

```ts
// ✅ Test behavior
it('filters out past bookings', async () => {
  server.use(handlers.bookings.withMixed())
  const { result } = renderHook(() => useUpcomingBookings())
  await waitFor(() => expect(result.current.bookings).toHaveLength(2))
})

// ❌ Test implementation
it('calls setBookings with filtered array', ...)
```

---

## 14. Error Handling

All API error handling is centralised in `packages/api-client/fetcher.ts`. Features and domain hooks **never** inspect raw HTTP status codes — they receive a typed `ApiError` and react to its `code` field.

### Error shape

```ts
// packages/api-client/types/errors.ts
export type ApiErrorCode =
    | "UNAUTHORIZED" // 401 — token missing or expired
    | "FORBIDDEN" // 403 — valid token, insufficient role
    | "NOT_FOUND" // 404
    | "VALIDATION_ERROR" // 422 — request body failed validation
    | "RATE_LIMITED" // 429
    | "SERVER_ERROR" // 5xx
    | "NETWORK_ERROR" // fetch failed (offline, timeout)
    | "UNKNOWN"; // anything else

export interface ApiError {
    code: ApiErrorCode;
    status: number;
    message: string;
    detail?: unknown; // raw server payload, for logging only
}
```

### Centralised handling in `fetcher.ts`

```ts
// packages/api-client/fetcher.ts
const response = await fetch(url, options);

if (!response.ok) {
    const detail = await response.json().catch(() => null);
    const code = statusToCode(response.status); // maps status → ApiErrorCode

    // 401 — token expired: attempt one silent refresh, then re-throw
    if (response.status === 401) {
        const refreshed = await tryRefreshToken(); // from @repo/auth
        if (refreshed) return fetch(url, withNewToken(options));
        signOut(); // refresh also failed → log out
    }

    throw {
        code,
        status: response.status,
        message: detail?.message ?? "Request failed",
        detail,
    } satisfies ApiError;
}
```

### Handling errors in domain hooks

```ts
// packages/player-domain/hooks/useBookings.ts
import { useQuery } from "@tanstack/react-query";
import { getBookings } from "@repo/api-client";
import type { ApiError } from "@repo/api-client";

export const useBookings = () =>
    useQuery({
        queryKey: ["bookings"],
        queryFn: getBookings,
        retry: (failureCount, error: ApiError) =>
            // never retry auth or client errors — only 5xx / network
            !["UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND", "VALIDATION_ERROR"].includes(error.code) &&
            failureCount < 2,
    });
```

### Handling errors in features (UI layer)

```tsx
// ✅ React on error.code — never on status number
const { data, error } = useBookings();

if (error?.code === "FORBIDDEN") {
    return <AccessDenied />; // 403 — show role-specific message
}
if (error?.code === "NOT_FOUND") {
    return <EmptyState />; // 404 — no data found
}
if (error) {
    return <ErrorBanner />; // catch-all for network / server errors
}
```

### Error code → UI response table

| Code               | HTTP Status | Who handles it                         | UI response                              |
| ------------------ | ----------- | -------------------------------------- | ---------------------------------------- |
| `UNAUTHORIZED`     | 401         | `fetcher.ts` (auto-refresh → sign-out) | Redirect to `/login`                     |
| `FORBIDDEN`        | 403         | Feature component                      | Show `<AccessDenied />`                  |
| `NOT_FOUND`        | 404         | Feature component                      | Show `<EmptyState />` or redirect        |
| `VALIDATION_ERROR` | 422         | Form hook / mutation `onError`         | Surface field errors via React Hook Form |
| `RATE_LIMITED`     | 429         | `fetcher.ts` + domain hook retry       | Toast: "Too many requests, please wait"  |
| `SERVER_ERROR`     | 5xx         | Domain hook `onError`                  | Toast or `<ErrorBanner />`               |
| `NETWORK_ERROR`    | —           | Domain hook `onError`                  | Show offline banner or `<ErrorBanner />` |

### Mutations and form errors

```ts
// packages/player-domain/hooks/useCreateBooking.ts
import { useMutation } from "@tanstack/react-query";
import type { ApiError } from "@repo/api-client";

export const useCreateBooking = () =>
    useMutation({
        mutationFn: createBooking,
        onError: (error: ApiError) => {
            if (error.code === "VALIDATION_ERROR") {
                // domain hook normalises field errors; feature sets them on the form
                return normaliseValidationErrors(error.detail);
            }
            // all other errors bubble up to the feature's onError handler
        },
    });
```

### Rules

- `fetcher.ts` owns **all** 401 handling (silent refresh → sign-out) — features never intercept 401
- Features react to `error.code`, **never** to `error.status` directly
- Mutations must handle `VALIDATION_ERROR` inside the domain hook and expose normalised field errors
- Every async UI state must render a loading, error, and empty state — none is optional
- Log `error.detail` to your monitoring service (e.g. Sentry) at the `fetcher` level — don't scatter logging across features
- Do **not** swallow errors silently — always surface feedback to the user

---

## 15. Naming Conventions

| Pattern               | Convention          | Example                           |
| --------------------- | ------------------- | --------------------------------- |
| Hooks                 | `useSomething`      | `useBookings`, `useAuth`          |
| API functions         | `getSomething`      | `getBookings`, `getUserById`      |
| Domain services       | `computeSomething`  | `computeUpcomingBookings`         |
| Event handlers        | `handleSomething`   | `handleSubmit`, `handleClose`     |
| Boolean variables     | `isSomething`       | `isLoading`, `isAuthenticated`    |
| Zod schemas           | `somethingSchema`   | `bookingSchema`, `loginSchema`    |
| Zustand stores        | `useSomethingStore` | `usePlayerStore`                  |
| Components            | `PascalCase`        | `BookingCard`, `PlayerLayout`     |
| Files (non-component) | `camelCase`         | `getBookings.ts`, `formatDate.ts` |

---

## 16. Code Quality Standards

| Rule                               | Limit     |
| ---------------------------------- | --------- |
| Max file size                      | 300 lines |
| Max function size                  | 50 lines  |
| Max component size                 | 200 lines |
| Max feature files before splitting | 10 files  |

- No `console.log` in committed code (use a logger util if needed)
- No unused imports, variables, or dead code
- No `any` — use `unknown` and narrow, or define a proper type
- No non-null assertion (`!`) without an explicit comment explaining why

---

## 17. Anti-Patterns

| Anti-pattern                           | Why it's prohibited                      |
| -------------------------------------- | ---------------------------------------- |
| `fetch()` inside a component           | Bypasses the API layer entirely          |
| Business logic inside a component      | Makes it untestable and non-reusable     |
| Cross-domain imports                   | Creates hidden coupling between domains  |
| Copy-paste between web and mobile      | Use `player-domain` — it exists for this |
| Importing DTOs from api-client in apps | Apps consume domain models only          |
| `process.env` access outside config    | Breaks type safety and testability       |
| Importing a Zustand store in an app    | Apps consume domain hooks, not stores    |

---

## 18. PR Checklist

Every PR must satisfy all of the following before review:

- [ ] Folder structure matches guidelines
- [ ] No business logic in `apps/`
- [ ] No API calls outside `api-client`
- [ ] No cross-domain imports
- [ ] No cross-feature imports
- [ ] No hardcoded colors or strings
- [ ] No DTO types imported outside `api-client`
- [ ] No global types sourced from `packages/types`
- [ ] Apps consume only domain models, not DTOs
- [ ] No `process.env` direct access
- [ ] No `console.log`
- [ ] No `any` types
- [ ] Proper naming conventions followed
- [ ] Logic has unit or integration tests
- [ ] File sizes within limits
- [ ] `index.ts` updated if adding new exports

---

## 19. Decision Guide

When you don't know where code belongs, answer these questions in order:

1. **Is it an HTTP call?** → `packages/api-client`
2. **Is it a business rule or domain computation?** → `packages/*-domain/services`
3. **Is it domain state?** → `packages/*-domain/store`
4. **Is it auth-related?** → `packages/auth`
5. **Is it a reusable UI component?** → `packages/ui`
6. **Is it a design token or theme value?** → `packages/design-system`
7. **Is it feature-specific rendering?** → `apps/*/features/[name]/components`
8. **Is it routing or layout?** → `apps/*/app` or `apps/*/layout`

If it doesn't fit cleanly into one answer — it's probably two concerns mixed together. Split it.

---

## Summary

```
Apps       = routing + layout + providers (nothing else)
api-client = HTTP layer + DTO types (nothing else)
Domain     = models + business logic + state (exposed to apps via index.ts)
UI         = dumb, reusable components
Packages   = the source of truth for all logic
```
