# SmashBook Frontend

Turborepo monorepo for all SmashBook frontend surfaces.

## Apps

| App           | Path                 | Port | Description                                 |
| ------------- | -------------------- | ---- | ------------------------------------------- |
| web-staff     | `apps/web-staff`     | 3001 | Staff / club operator portal (React + Vite) |
| web-player    | `apps/web-player`    | 3000 | Player-facing web portal (React + Vite)     |
| mobile-player | `apps/mobile-player` | —    | Player mobile app (Expo / React Native)     |

## Packages

| Package                 | Description                                                                 |
| ----------------------- | --------------------------------------------------------------------------- |
| `@repo/tsconfig`        | Shared TypeScript configurations                                            |
| `@repo/eslint-config`   | Shared ESLint rules                                                         |
| `@repo/tailwind-config` | Shared Tailwind CSS preset (do NOT upgrade Tailwind to v4)                  |
| `@repo/design-system`   | Design tokens and theming                                                   |
| `@repo/config`          | Env var validation (Zod) — only place process.env / import.meta.env is read |
| `@repo/auth`            | Auth state, tokens, login/logout, AuthLayout                                |
| `@repo/api-client`      | All HTTP calls, error types, TanStack Query client                          |
| `@repo/player-domain`   | Player business logic (web + mobile)                                        |
| `@repo/staff-domain`    | Staff business logic (web-staff only)                                       |
| `@repo/ui`              | Shared UI components (shadcn wrappers)                                      |
| `@repo/testing`         | Shared test utilities, MSW handlers, mocks                                  |

## Prerequisites

- **Node.js** ≥ 20
- **pnpm** 9.12.3 — `corepack enable && corepack prepare pnpm@9.12.3 --activate`

## Setup

```bash
cd frontend

# Install all dependencies
pnpm install
```

## Development

```bash
# Run all apps simultaneously
pnpm dev

# Run a specific app
pnpm --filter web-staff dev
pnpm --filter web-player dev
pnpm --filter mobile-player start
```

## Build

```bash
# Build all apps and packages
pnpm build

# Build a specific app
pnpm --filter web-staff build
```

## Testing

```bash
# Run all tests
pnpm test

# Run tests for a specific package / app
pnpm --filter web-staff test
pnpm --filter @repo/api-client test
```

## Type checking

```bash
pnpm type-check
```

## Linting

```bash
pnpm lint
```

## Adding shadcn/ui components

Always target `@repo/ui` so components are available to all web apps:

```bash
cd frontend
pnpm dlx shadcn@2.1.8 add button --cwd packages/ui
```

## Tech stack versions (pinned — do not upgrade without updating FE_ARCHITECTURE.md)

| Dependency      | Version |
| --------------- | ------- |
| TypeScript      | 5.6.3   |
| Vite            | 5.4.11  |
| React           | 18.3.1  |
| React Router    | 6.28.0  |
| Tailwind CSS    | 3.4.17  |
| shadcn/ui       | 2.1.8   |
| Lucide React    | 0.446.0 |
| TanStack Query  | 5.62.9  |
| Zustand         | 4.5.5   |
| React Hook Form | 7.54.0  |
| Zod             | 3.24.1  |
| Expo SDK        | ~54.0.0 |
| React Native    | 0.76.1  |
| Expo Router     | ~4.0.0  |
| NativeWind      | ^4.0.0  |

See [docs/FE_ARCHITECTURE.md](docs/FE_ARCHITECTURE.md) for full architecture decisions and coding standards.
