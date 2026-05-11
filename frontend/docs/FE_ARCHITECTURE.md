_Last updated: 2026-05-10 12:00 UTC_

# Frontend Architecture

## Table of Contents

- [Project Structure](#project-structure)
- Technical Stack
    - [🌐 Web — React + Vite](#-web--react--vite)
    - [📱 Mobile — React Native (Expo)](#-mobile--react-native-expo)
- [Coding Standards](FE_CODING_STANDARD.md)

---

## Project Structure

High-level folder overview only.  
Do NOT include files. This represents directory layout, not implementation details.

```
frontend/
├── apps/
│   ├── web-staff/                  # React (Vite) — admin/staff app
│   │   └── src/
│   │       ├── app/                # React Router routes
│   │       ├── layout/
│   │       │   └── dashboard/      # DashboardLayout, Sidebar, Navbar
│   │       ├── config/
│   │       ├── features/           # feature modules (see §6)
│   │       ├── providers/          # QueryClient, ThemeProvider
│   │       └── styles/
│   │
│   ├── web-player/                 # React (Vite) — player app
│   │   └── src/
│   │       ├── app/                # React Router routes
│   │       ├── layout/
│   │       │   └── dashboard/      # PlayerLayout, Sidebar, Navbar
│   │       ├── features/
│   │       ├── providers/
│   │       └── styles/
│   │
│   └── mobile-player/              # React Native (Expo)
│       ├── app/                    # Expo Router (file-based)
│       └── src/
│           ├── components/
│           ├── providers/
│           ├── store/              # mobile-specific Zustand state
│           ├── services/           # mobile-specific API calls
│           └── validators/
│
├── packages/
│   ├── api-client/                 # 🌐 HTTP layer — only place raw HTTP calls are made
│   │   ├── core/                   # fetcher, error mapping, QueryClient
│   │   └── modules/                # one folder per domain audience
│   │       ├── staff/              # club endpoints (staff-facing)
│   │       │   └── club/
│   │       ├── share/              # shared endpoints (profile, etc.)
│   │       │   └── profile/
│   │       └── player/             # player-specific endpoints (future)
│   │
│   ├── auth/                       # 🔐 tokens, session, login/logout
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── store/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── validators/
│   │   └── index.ts
│   │
│   ├── player-domain/              # 🎮 player business logic (web + mobile)
│   │   ├── hooks/
│   │   ├── models/                 # domain models — exposed to apps
│   │   ├── services/
│   │   ├── store/
│   │   └── index.ts
│   │
│   ├── staff-domain/               # 🏢 staff business logic (web-staff only)
│   │   ├── hooks/
│   │   ├── mappers/                # DTO → model transformations
│   │   ├── models/                 # domain models — exposed to apps
│   │   ├── services/
│   │   ├── store/
│   │   ├── types/                  # internal only (not exported)
│   │   └── index.ts
│   │
│   ├── ui/                         # 🎨 shared reusable components (shadcn)
│   │   ├── components/
│   │   ├── hooks/
│   │   └── index.ts
│   │
│   ├── design-system/              # 🎨 tokens + theming (light/dark)
│   │   ├── tokens/
│   │   ├── theme.ts
│   │   └── index.ts
│   │
│   ├── config/                     # env var validation + typed config
│   │   ├── env.ts
│   │   └── index.ts
│   │
│   ├── testing/                    # 🧪 MSW handlers, shared mocks
│   │   ├── msw/
│   │   ├── mocks/
│   │   └── index.ts
│   │
│   ├── eslint-config/              # shared ESLint rule sets
│   ├── tsconfig/                   # shared TypeScript configs
│   └── tailwind-config/            # shared Tailwind preset
│
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

---

# Technical Stack

# 🌐 Web — React + Vite

| Concern           | Tool                                                 | Current Version       | Action                                  |
| ----------------- | ---------------------------------------------------- | --------------------- | --------------------------------------- |
| Monorepo          | Turborepo + pnpm                                     | 2.3.3 / 9.12.3        | Keep                                    |
| Language          | TypeScript                                           | 5.6.3                 | Enable `composite: true`                |
| Build             | Vite                                                 | 5.4.11                | Keep                                    |
| UI Framework      | React                                                | 19.1.0                | Keep                                    |
| Routing           | React Router                                         | 6.28.0                | Keep                                    |
| Styling           | Tailwind CSS                                         | 3.4.17                | Keep (do NOT upgrade to v4)             |
| Component Library | shadcn/ui                                            | 2.1.8                 | Keep                                    |
| Icons             | Lucide React                                         | 0.446.0               | Keep                                    |
| Server State      | TanStack Query                                       | 5.62.9                | Keep                                    |
| UI State          | Zustand                                              | 4.5.5                 | Keep                                    |
| Forms             | React Hook Form                                      | 7.54.0                | Ensure `@hookform/resolvers` ≥ 3.9      |
| Validation        | Zod                                                  | 3.24.1                | Colocate in domain packages             |
| HTTP Client       | Fetch API                                            | Native                | Keep                                    |
| Linting           | ESLint + @typescript-eslint + eslint-plugin-react    | 8.57.x / 8.x / 7.37.x | Shared config via `@repo/eslint-config` |
| Testing           | Vitest / React Testing Library / Mock Service Worker | Latest                | Pin MSW to ^2.x                         |

---

# 📱 Mobile — React Native (Expo)

| Concern     | Tool                                | Current Version         | Action                                                           |
| ----------- | ----------------------------------- | ----------------------- | ---------------------------------------------------------------- |
| Framework   | React Native                        | 0.81.5                  | Keep                                                             |
| Expo SDK    | Expo                                | ~54.0.34                | Keep                                                             |
| TS Types    | Built-in (no `@types/react-native`) | —                       | RN 0.71+ ships own types — do NOT add `@types/react-native`      |
| Build       | EAS                                 | 14.x                    | Keep                                                             |
| Navigation  | Expo Router                         | ~6.0.23                 | Keep                                                             |
| State       | Zustand + TanStack Query            | 4.5.5 / 5.62.9          | Match web version                                                |
| Forms       | React Hook Form                     | 7.54.0                  | Use `<Controller>` for all inputs                                |
| Validation  | Zod                                 | 3.24.1                  | Colocate in domain packages                                      |
| Styling     | NativeWind                          | 4.2.3                   | Configure `withNativeWind`                                       |
| Storage     | MMKV                                | ^2.12.2                 | Use EAS dev client (not Expo Go)                                 |
| Storage     | AsyncStorage                        | 2.2.0                   | `@react-native-async-storage/async-storage`                      |
| Animation   | react-native-reanimated             | ~4.1.1                  | Keep                                                             |
| Worklets    | react-native-worklets               | 0.5.1                   | Required by reanimated                                           |
| CSS Interop | react-native-css-interop            | 0.2.3                   | Required by NativeWind                                           |
| Status Bar  | expo-status-bar                     | ~3.0.9                  | Updated to match Expo SDK 54.0.34                                |
| TypeScript  | TypeScript                          | ~5.9.2                  | Updated to match Expo SDK 54.0.34 requirement                    |
| Linting     | ESLint + @typescript-eslint         | 8.57.x / 7.x            | Shared config via `@repo/eslint-config`                          |
| Testing     | Jest + jest-expo + Maestro          | 29.x / 54.0.17 / Latest | `jest-expo` preset required for RN; `--passWithNoTests` flag set |

---

## Coding Standards

All engineering guidelines — layer rules, component patterns, state management, error handling, naming conventions, PR checklist, and more — are documented in [FE_CODING_STANDARD.md](FE_CODING_STANDARD.md).
