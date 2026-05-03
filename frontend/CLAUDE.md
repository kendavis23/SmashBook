# CLAUDE.md

Output only file names that were changed (e.g., Navbar.tsx, Navbar.test.tsx). No code, no explanations, exactly 2 lines max.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
pnpm install

# Development
pnpm dev                          # all apps
pnpm --filter web-staff dev       # staff portal only (port 3001)
pnpm --filter web-player dev      # player portal only (port 3002)
pnpm --filter website dev      # player portal only (port 3003)
pnpm --filter mobile-player start # mobile app

# Build
pnpm build
pnpm --filter web-staff build

# Website
pnpm --filter @repo/website dev
pnpm --filter @repo/website build
VITE_API_PLAYER_SITE_URL=https://ace-player-staging.smashbook.app VITE_API_STAFF_SITE_URL=https://ace-staging.smashbook.app pnpm --filter @repo/website build

# Test (maxForks=2 is enforced in vitest.config.ts — do NOT pass --reporter=verbose --pool=vmThreads or raise forks above 2; it overloads CPU on Mac)
pnpm test
pnpm --filter web-staff test
pnpm --filter @repo/api-client test
pnpm --filter web-staff test -- --run # sequential, no watch

# Type checking & linting
pnpm type-check
pnpm lint
pnpm format   # prettier --write

# Adding shadcn/ui components (always target @repo/ui)
pnpm dlx shadcn@2.1.8 add <component> --cwd packages/ui
```

## Architecture Overview

This is a **Turborepo + pnpm monorepo** with three apps and shared packages.

### Core principle: Apps are thin shells. Packages are powerful.

```
apps/          → routing, layout, providers ONLY — no business logic
packages/      → all logic, UI, and configuration
```

### Apps

| App             | Description                                          |
| --------------- | ---------------------------------------------------- |
| `web-staff`     | Staff/club operator portal (React + Vite, port 3001) |
| `web-player`    | Player-facing web portal (React + Vite, port 3002)   |
| `mobile-player` | Player mobile app (Expo Router / React Native)       |

### Package Responsibilities (strict ownership)

| Package               | Owns                                                                     |
| --------------------- | ------------------------------------------------------------------------ |
| `@repo/api-client`    | All HTTP calls, `fetcher.ts`, query keys, `ApiError` type — nothing else |
| `@repo/staff-domain`  | Staff business logic, Zustand store, validators, types                   |
| `@repo/player-domain` | Player business logic, Zustand store, validators, types                  |
| `@repo/auth`          | Tokens, session, login/logout, `useAuth()` hook                          |
| `@repo/config`        | **Only** place `process.env` / `import.meta.env` is read (Zod-validated) |
| `@repo/ui`            | Shared shadcn/ui component wrappers                                      |
| `@repo/design-system` | Design tokens, light/dark themes                                         |
| `@repo/testing`       | MSW handlers, shared mocks, test utilities                               |

## Key Rules

### Layer boundaries (never cross these)

- Apps never call `fetch()`, `axios`, or import domain stores directly — only domain hooks
- `api-client` is the **only** place raw HTTP calls exist
- Cross-domain imports are prohibited (`player-domain` cannot import from `staff-domain`)
- Cross-feature imports are prohibited within an app
- Never access `process.env` / `import.meta.env` outside `@repo/config`

### Feature structure inside `apps/*/src/features/`

```
feature-name/
  components/   # UI only for this feature
  hooks/        # wraps domain hooks for feature-specific composition
  types.ts
  index.ts      # only export what routing/layout needs
```

Features > 10 files must be split into sub-features.

### Component pattern

Always use container/view separation:

- **Container**: fetches data via domain hooks, passes to view
- **View**: pure rendering, no data fetching, no `useEffect` for fetching

### State management

- Server/domain state → `packages/*-domain/store/` (via domain hooks)
- Auth state → `packages/auth/store/` (via `useAuth()`)
- UI-only state (modals, tabs) → component `useState` — never Zustand

### Styling

- Tailwind utility classes only — no custom CSS files
- Use design tokens from `@repo/design-system` via Tailwind CSS variables
- No hardcoded colors (`bg-[#6366f1]`) — use semantic tokens (`bg-primary`)

### Error handling

- `fetcher.ts` owns all 401 handling (auto-refresh → sign-out)
- Features react to `error.code` (e.g. `"FORBIDDEN"`, `"NOT_FOUND"`) — never `error.status`
- Every async UI state must render loading, error, and empty states

### Naming conventions

| Pattern         | Convention          | Example                   |
| --------------- | ------------------- | ------------------------- |
| Hooks           | `useSomething`      | `useBookings`             |
| API functions   | `getSomething`      | `getBookings`             |
| Domain services | `computeSomething`  | `computeUpcomingBookings` |
| Event handlers  | `handleSomething`   | `handleSubmit`            |
| Booleans        | `isSomething`       | `isLoading`               |
| Zod schemas     | `somethingSchema`   | `bookingSchema`           |
| Zustand stores  | `useSomethingStore` | `usePlayerStore`          |

### Code quality limits

- Max file: 300 lines | Max function: 50 lines | Max component: 200 lines
- No `any` — use `unknown` and narrow
- No `console.log` in committed code
- No non-null assertion (`!`) without a comment explaining why

## Pinned versions (do not upgrade without updating FE_ARCHITECTURE.md)

- Tailwind CSS: **3.4.17** — do NOT upgrade to v4
- React: 18.3.1 | TypeScript: 5.6.3 | Vite: 5.4.11
- TanStack Query: 5.62.9 | Zustand: 4.5.5 | React Hook Form: 7.54.0
- Expo SDK: ~54.0.0 | React Native: 0.76.1 (ships own types — do NOT add `@types/react-native`)
- shadcn/ui: 2.1.8 | Lucide React: 0.446.0

## Where code belongs — decision guide

1. HTTP call? → `packages/api-client`
2. Business rule / domain computation? → `packages/*-domain/services`
3. Domain state? → `packages/*-domain/store`
4. Auth-related? → `packages/auth`
5. Reusable UI component? → `packages/ui`
6. Design token / theme? → `packages/design-system`
7. Feature-specific rendering? → `apps/*/features/[name]/components`
8. Routing or layout? → `apps/*/app` or `apps/*/layout`

Full architecture and coding standards: [`docs/FE_ARCHITECTURE.md`](docs/FE_ARCHITECTURE.md) and [`docs/FE_CODING_STANDARD.md`](docs/FE_CODING_STANDARD.md).

Deployment, CI/CD, and infra: [`docs/FE_DEPLOYMENT.md`](docs/FE_DEPLOYMENT.md) — source of truth for all deploy configuration.
