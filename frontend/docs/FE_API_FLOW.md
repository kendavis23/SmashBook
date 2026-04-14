_Last updated: 2026-04-05 00:00 UTC_

# API Flow

How a data request travels from a React component through three layers to the backend and back.

---

## Overview

The frontend is split into three responsibilities:

| Layer               | Package                 | Responsibility                                    |
| ------------------- | ----------------------- | ------------------------------------------------- |
| **Component / App** | `apps/web-staff`        | Renders UI, calls hooks, works with domain models |
| **Domain**          | `packages/staff-domain` | TanStack Query hooks, maps DTO → domain model     |
| **API Client**      | `packages/api-client`   | HTTP calls, DTO types, error handling             |

No layer skips another. Components never call `fetch`. The API client never references React.

---

## Flow Diagram

```
┌──────────────────────────────────────────────────────┐
│  Component (apps/web-staff)                          │
│  • imports hook from @repo/staff-domain              │
│  • works only with domain models (Club, PricingRule) │
└─────────────────────────┬────────────────────────────┘
                          │ calls
                          ▼
┌──────────────────────────────────────────────────────┐
│  Hook  (packages/staff-domain / club.hooks.ts)       │
│  • wraps useQuery / useMutation                      │
│  • types queryFn return as Promise<Club>             │
│  • applies mapper when DTO ≠ model (e.g. dates)      │
└─────────────────────────┬────────────────────────────┘
                          │ calls endpoint fn
                          ▼
┌──────────────────────────────────────────────────────┐
│  API Client  (packages/api-client / club.api.ts)     │
│  • calls fetcher() with path + options               │
│  • types response as internal DTO (ClubResponse)     │
│  • DTO types never leave this package                │
└─────────────────────────┬────────────────────────────┘
                          │ HTTP GET/POST/PUT
                          ▼
┌──────────────────────────────────────────────────────┐
│  Backend  (FastAPI)                                  │
│  • processes request, returns JSON                   │
└──────────────────────────────────────────────────────┘
                          │ JSON response
                          ▼
             (same path in reverse — data
              typed as DTO, converted to
              domain model before the hook
              returns to the component)
```

---

## Step-by-Step Explanation

### 1. Component requests data

The component calls a hook. It imports the hook and its return type from `@repo/staff-domain`. It never imports anything from `@repo/api-client`.

### 2. Hook manages caching and fetching

The hook uses TanStack Query (`useQuery` or `useMutation`). The `queryFn` type annotation (`Promise<Club>`) forces the domain model type. If the raw DTO needs a field transform (e.g. ISO timestamp → datetime-local), a mapper function is applied in the `select` callback before data is returned to the component.

### 3. API client makes the HTTP request

The endpoint function calls `fetcher()` from `core/fetcher.ts`, which is a thin wrapper over the browser `fetch` API. It deserialises the response into a DTO type. DTO types live only in `packages/api-client/modules/*/` and are never re-exported from `packages/api-client/index.ts`.

### 4. Backend responds

FastAPI returns JSON. The API client resolves the promise with the parsed DTO. The hook's typed `queryFn` (or mapper) converts it to a domain model. The component receives a clean `Club`, never a raw `ClubResponse`.

---

## Example — Loading a Club

**Component** (`ClubDetailPage.tsx`)

```tsx
import { useGetClub } from "@repo/staff-domain";
import type { Club } from "@repo/staff-domain";

const { data, isLoading } = useGetClub(clubId);
const club = data as Club | undefined;
```

**Hook** (`club.hooks.ts`)

```ts
import { getClubEndpoint } from "@repo/api-client";
import type { Club } from "../models";

export function useGetClub(clubId: string) {
    return useQuery({
        queryKey: ["clubs", clubId],
        queryFn: async (): Promise<Club> => getClubEndpoint(clubId),
        enabled: Boolean(clubId),
    });
}
```

The `Promise<Club>` annotation is what enforces the type boundary. TypeScript's structural typing accepts the `ClubResponse` DTO here because its shape is compatible — but the inferred type exposed to callers is `Club`.

**API client** (`club.api.ts`)

```ts
import { fetcher } from "../../core/fetcher";
import type { ClubResponse } from "./club.types"; // internal only

export function getClubEndpoint(clubId: string): Promise<ClubResponse> {
    return fetcher<ClubResponse>(`/api/v1/clubs/${clubId}`);
}
```

**HTTP request**

```
GET /api/v1/clubs/:clubId
Authorization: Bearer <token>
X-Tenant-Subdomain: <subdomain>
```

---

## Rules

### Do

- Import hooks and types exclusively from `@repo/staff-domain` or `@repo/player-domain` in app code
- Type `queryFn` return as `Promise<DomainModel>` to pin the inferred type
- Apply mappers in the `select` callback when a field transform is needed
- Keep DTO types (`club.types.ts`) inside `api-client` — never re-export them from `packages/api-client/index.ts`

### Don't

| ❌ Don't                                                                      | ✅ Do instead                                               |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `fetch('/api/v1/clubs')` in a component                                       | call `useGetClub(clubId)`                                   |
| `import { ClubResponse } from "@repo/api-client"` in an app                   | `import type { Club } from "@repo/staff-domain"`            |
| Add business logic or mapping inside `club.api.ts`                            | put it in a mapper (`club.mapper.ts`) in the domain package |
| Skip the domain layer and call an endpoint function directly from a component | always go through a hook                                    |

---

## File Naming

```
packages/api-client/modules/club/
  club.api.ts       ← endpoint functions
  club.types.ts     ← DTO types (internal, not exported from index)

packages/staff-domain/
  hooks/club.hooks.ts     ← TanStack Query hooks
  models/club.model.ts    ← domain model interfaces
  mappers/club.mapper.ts  ← DTO → domain model transforms
```
