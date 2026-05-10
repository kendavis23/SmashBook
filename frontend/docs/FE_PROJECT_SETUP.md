_Last updated: 2026-05-10 00:00 UTC_

# Frontend Project Setup

SmashBook frontend is a **pnpm monorepo** managed by [Turborepo](https://turbo.build/). It contains three apps (`web-staff`, `web-player`, `mobile-player`) and a set of shared packages.

---

## Requirements

| Tool    | Minimum Version |
| ------- | --------------- |
| Node.js | `>= 20`         |
| pnpm    | `>= 9.12.3`     |

---

## Environment Setup

Before running any app, copy `.env.example` to `.env` in the relevant app directory and fill in the values:

```bash
cp apps/web-staff/.env.example apps/web-staff/.env
cp apps/web-player/.env.example apps/web-player/.env
```

Each `.env.example` contains two required variables:

```env
VITE_API_BASE_URL=   # Base URL of the SmashBook API (e.g. http://localhost:8080)
VITE_APP_ENV=        # Runtime environment: development | staging | production
```

---

## Installation

```bash
# From the frontend/ directory
cd frontend

# Install all workspace dependencies (all apps + packages)
pnpm install
```

> pnpm workspaces resolve all `workspace:*` dependencies automatically — no separate installs needed per app.

---

## Running the Project

### All apps at once (recommended)

```bash
# From frontend/
pnpm dev
```

Turborepo starts every app in parallel in development mode.

### Individual app

```bash
# Staff web portal
cd apps/web-staff && pnpm dev

# Player web portal
cd apps/web-player && pnpm dev

# Mobile app (Expo)
cd apps/mobile-player && pnpm start
```

---

## App Info & Ports

| App                    | Package name          | Framework           | Dev command       | Port                   |
| ---------------------- | --------------------- | ------------------- | ----------------- | ---------------------- |
| Player web portal      | `@repo/web-player`    | React + Vite        | `pnpm dev:player` | `3002`                 |
| Staff web portal       | `@repo/web-staff`     | React + Vite        | `pnpm dev:staff`  | `3001`                 |
| Mobile (iOS / Android) | `@repo/mobile-player` | React Native + Expo | `pnpm start`      | `8081` (Metro bundler) |

> Ports are explicitly set in each app's `vite.config.ts`. Expo Metro bundler defaults to **8081**.

---

## Available Scripts

All root-level scripts delegate to Turborepo and run across every app/package in parallel.

### Root (`frontend/`)

| Command           | What it does                                            |
| ----------------- | ------------------------------------------------------- |
| `pnpm dev`        | Start all apps in watch/dev mode                        |
| `pnpm dev:staff`  | Start **web-staff** only                                |
| `pnpm dev:player` | Start **web-player** only                               |
| `pnpm build`      | Production build for all apps                           |
| `pnpm lint`       | ESLint across all apps & packages                       |
| `pnpm test`       | Run all test suites                                     |
| `pnpm type-check` | TypeScript type-check across all apps                   |
| `pnpm format`     | Prettier format all `.ts`, `.tsx`, `.json`, `.md` files |

---

## Per-App Scripts

### `web-staff` & `web-player` (Vite + Vitest)

| Command           | What it does                                    |
| ----------------- | ----------------------------------------------- |
| `pnpm dev`        | Vite dev server with HMR                        |
| `pnpm build`      | `tsc -b && vite build` — type-check then bundle |
| `pnpm preview`    | Serve the production build locally              |
| `pnpm lint`       | ESLint on `src/` (`.ts`, `.tsx`)                |
| `pnpm test`       | Vitest unit/component tests                     |
| `pnpm type-check` | `tsc --noEmit`                                  |

### `mobile-player` (Expo + Jest)

| Command           | What it does                                        |
| ----------------- | --------------------------------------------------- |
| `pnpm start`      | Start Expo dev server (Metro bundler)               |
| `pnpm android`    | Build & launch on connected Android device/emulator |
| `pnpm ios`        | Build & launch on iOS simulator                     |
| `pnpm lint`       | ESLint on `src/` (`.ts`, `.tsx`)                    |
| `pnpm test`       | Jest with `jest-expo` preset                        |
| `pnpm type-check` | `tsc --noEmit`                                      |

---

## Key Dependencies

> Pinned versions are maintained in [FE_ARCHITECTURE.md](FE_ARCHITECTURE.md).

| Library                  | Used by                              |
| ------------------------ | ------------------------------------ |
| React                    | web-staff, web-player, mobile-player |
| React Native             | mobile-player                        |
| Expo                     | mobile-player                        |
| Expo Router              | mobile-player                        |
| Vite                     | web-staff, web-player                |
| React Router DOM         | web-staff, web-player                |
| TanStack Query           | all apps                             |
| Zustand                  | all apps                             |
| React Hook Form          | all apps                             |
| Zod                      | all apps                             |
| NativeWind               | mobile-player                        |
| react-native-mmkv        | mobile-player                        |
| AsyncStorage             | mobile-player                        |
| react-native-reanimated  | mobile-player                        |
| react-native-worklets    | mobile-player                        |
| react-native-css-interop | mobile-player                        |
| Tailwind CSS             | all apps                             |
| TypeScript               | all apps                             |
| Turborepo                | monorepo orchestration               |
| pnpm                     | package manager                      |
