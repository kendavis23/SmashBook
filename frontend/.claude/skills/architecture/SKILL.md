---
name: architecture
description: SmashBook frontend architecture rules — layer boundaries, package ownership, where code belongs.
---

## Core principle

Apps are thin shells. Packages are powerful. Never cross layer boundaries.

## Layer ownership

| Layer          | Package                       | Owns                                   |
| -------------- | ----------------------------- | -------------------------------------- |
| HTTP calls     | `@repo/api-client`            | fetcher, DTO types, error mapping      |
| Business logic | `@repo/*-domain`              | models, services, hooks, store         |
| Auth           | `@repo/auth`                  | tokens, session, login/logout          |
| UI components  | `@repo/ui`                    | shared shadcn wrappers                 |
| Design tokens  | `@repo/design-system`         | Tailwind CSS variables                 |
| Env vars       | `@repo/config`                | ONLY place env is read (Zod-validated) |
| Feature UI     | `apps/*/features/[name]`      | rendering only                         |
| Routing/layout | `apps/*/app`, `apps/*/layout` | thin shells                            |

## Hard prohibitions

- Apps never call `fetch()` or import domain stores directly
- `api-client` is the ONLY place raw HTTP calls exist
- `player-domain` cannot import from `staff-domain` (and vice versa)
- No cross-feature imports inside an app
- Never access `process.env` / `import.meta.env` outside `@repo/config`

## Decision guide — where does this code belong?

1. HTTP call? → `packages/api-client`
2. Business rule / computation? → `packages/*-domain/services`
3. Domain state? → `packages/*-domain/store`
4. Auth? → `packages/auth`
5. Reusable UI? → `packages/ui`
6. Design token? → `packages/design-system`
7. Feature rendering? → `apps/*/features/[name]/components`
8. Routing/layout? → `apps/*/app` or `apps/*/layout`

If it doesn't fit cleanly into one answer — it's two concerns mixed. Split it.

## Ref: `docs/FE_ARCHITECTURE.md`, `docs/FE_CODING_STANDARD.md`
