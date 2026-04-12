_Last updated: 2026-04-12 09:32 UTC_

# Frontend Domain Layer Guide

How to add a domain model, mapper, service, and hooks for a module that already has an API client entry in `@repo/api-client`.

This guide picks up where [`FE_API_CLIENT_GUIDE.md`](FE_API_CLIENT_GUIDE.md) leaves off. Before following these steps, the module must already have `<module>.types.ts` and `<module>.api.ts` in `packages/api-client/modules/<domain>/<module>/`.

---

## Where domain code lives

All domain code for the staff portal lives in `packages/staff-domain/`. Player portal code lives in `packages/player-domain/`.

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

Each package that contains hooks or mappers **must** have a `vitest.config.ts`, a `vitest.setup.ts`, and test files alongside the implementation files. The `test` script in `package.json` must run `vitest run`.

---

## Step 1 — Create `<module>.model.ts`

**File:** `packages/staff-domain/models/<module>.model.ts`

Domain models mirror the API response types but belong to the domain layer. Apps and features **only** import from here — never from `@repo/api-client`.

### Rules

- Copy the structure of the corresponding `*Response` DTO and rename it (e.g. `CourtResponse` → `Court`).
- Rename `*Create` → `*Input` and `*Update` → `*UpdateInput` for domain consistency.
- Keep `SurfaceType`-style enums as union types (same as in the DTO).
- Re-export `UUID` from the model so callers only need one import.
- Add inline comments for non-obvious fields (e.g. `// 0 = Monday … 6 = Sunday`).

### When domain model = DTO (no transformation)

If no field needs renaming or computing, the domain model will be structurally identical to the DTO. That is fine — the layer boundary still matters for decoupling.

### Example

```ts
// packages/staff-domain/models/court.model.ts

export type UUID = string;

export type SurfaceType = "artificial_grass" | "concrete" | "carpet" | "wood";

export interface Court {
    id: UUID;
    club_id: UUID;
    name: string;
    surface_type: SurfaceType;
    has_lighting: boolean;
    lighting_surcharge: number | null;
    is_active: boolean;
}

export interface CourtInput {
    club_id: UUID;
    name: string;
    surface_type: SurfaceType;
    has_lighting?: boolean;
    lighting_surcharge?: number | null;
    is_active?: boolean;
}

export interface CourtUpdateInput {
    name?: string;
    surface_type?: SurfaceType;
    has_lighting?: boolean;
    lighting_surcharge?: number | null;
    is_active?: boolean;
}
```

Register in `packages/staff-domain/models/index.ts`:

```ts
export type { SurfaceType, Court, CourtInput, CourtUpdateInput } from "./court.model";
```

---

## Step 2 — Create `<module>.mapper.ts` (only when needed)

**File:** `packages/staff-domain/mappers/<module>.mapper.ts`

A mapper is only needed when a field requires a transformation before it reaches the UI. The most common case is converting an ISO 8601 datetime string to `datetime-local` format for `<input type="datetime-local" />`.

### When to add a mapper

| Situation                                             | Mapper needed?      |
| ----------------------------------------------------- | ------------------- |
| API returns ISO datetime, form needs `datetime-local` | Yes                 |
| API returns snake_case, UI needs camelCase            | Yes                 |
| Fields are structurally identical to the DTO          | No — skip this step |

### Example (from club module)

```ts
// packages/staff-domain/mappers/club.mapper.ts

function toDatetimeLocal(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return (
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
        `T${pad(d.getHours())}:${pad(d.getMinutes())}`
    );
}

export function toPricingRule(raw: PricingRule): PricingRule {
    return {
        ...raw,
        incentive_expires_at: raw.incentive_expires_at
            ? toDatetimeLocal(raw.incentive_expires_at)
            : raw.incentive_expires_at,
    };
}
```

Register in `packages/staff-domain/mappers/index.ts`:

```ts
export { toPricingRule } from "./club.mapper";
```

---

## Step 3 — Create `<module>.service.ts` (only when needed)

**File:** `packages/staff-domain/services/<module>.service.ts`

A service contains **pure business logic** — functions that take domain models and return computed values. No HTTP calls, no React, no side effects.

### When to add a service

| Situation                                                             | Service needed?     |
| --------------------------------------------------------------------- | ------------------- |
| Computing a derived value from domain data (e.g. "upcoming bookings") | Yes                 |
| Validating domain rules before a mutation                             | Yes                 |
| Formatting/filtering a list for display                               | Yes                 |
| The hook just passes data straight to the API                         | No — skip this step |

### Example

```ts
// packages/staff-domain/services/court.service.ts

import type { Court } from "../models";

/** Returns only active courts sorted by name. */
export function computeActiveCourts(courts: Court[]): Court[] {
    return courts.filter((c) => c.is_active).sort((a, b) => a.name.localeCompare(b.name));
}
```

Register in `packages/staff-domain/services/index.ts`:

```ts
export { computeActiveCourts } from "./court.service";
```

---

## Step 4 — Create `<module>.hooks.ts`

**File:** `packages/staff-domain/hooks/<module>.hooks.ts`

Hooks wrap API client calls with TanStack Query (`useQuery` / `useMutation`). They are the **only** public interface that apps and features call.

### Rules

- Import endpoint functions from `@repo/api-client/modules/<domain>` — never call `fetcher` directly.
- Import domain model types from `../models` — never import DTO types.
- Apply mappers inside `queryFn` or `select` as appropriate.
- Every `useQuery` must have `enabled: Boolean(param)` guard for required params.
- Every mutation that modifies a list must `invalidateQueries` the list key.
- Every mutation that modifies a detail must `invalidateQueries` the detail key.
- Group query keys in a `const <module>Keys = { ... }` object at the top of the file.

### Pattern

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listCourtsEndpoint, createCourtEndpoint } from "@repo/api-client/modules/staff";
import type { Court, CourtInput } from "../models";

const courtKeys = {
    all: (clubId: string) => ["courts", clubId] as const,
    detail: (clubId: string, courtId: string) => ["courts", clubId, courtId] as const,
};

export function useListCourts(clubId: string) {
    return useQuery({
        queryKey: courtKeys.all(clubId),
        queryFn: async (): Promise<Court[]> => listCourtsEndpoint(clubId),
        enabled: Boolean(clubId),
    });
}

export function useCreateCourt(clubId: string) {
    const queryClient = useQueryClient();
    return useMutation<Court, Error, CourtInput>({
        mutationFn: (data: CourtInput) => createCourtEndpoint(clubId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: courtKeys.all(clubId) });
        },
    });
}
```

Register in `packages/staff-domain/hooks/index.ts`:

```ts
export { useListCourts, useCreateCourt, ... } from "./court.hooks";
```

---

## Step 5 — Unit tests (required)

Every domain package that has mappers or hooks **must** have test files. Tests are co-located next to the file they cover.

### Package setup

Add these files once per package (copy from `packages/staff-domain/`):

**`vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    test: {
        environment: "jsdom",
        globals: true,
        setupFiles: ["./vitest.setup.ts"],
    },
});
```

**`vitest.setup.ts`**

```ts
import "@testing-library/jest-dom";
```

**`package.json` scripts**

```json
{
    "scripts": {
        "test": "vitest run",
        "test:watch": "vitest"
    },
    "devDependencies": {
        "@testing-library/jest-dom": "^6.4.0",
        "@testing-library/react": "^16.0.0",
        "@types/react-dom": "^18.3.0",
        "@vitejs/plugin-react": "^4.3.0",
        "jsdom": "^25.0.0",
        "react-dom": "18.3.1",
        "vitest": "^2.0.0"
    }
}
```

**Run tests:**

```bash
pnpm --filter @repo/staff-domain test
```

---

### Mapper tests (`<module>.mapper.test.ts`)

Test every exported mapper function. Cover: no transformation needed, field present, field absent/undefined.

```ts
import { describe, it, expect } from "vitest";
import { toPricingRule } from "./club.mapper";

describe("toPricingRule", () => {
    it("passes through a rule with no incentive_expires_at unchanged", () => {
        const rule = {
            label: "Peak",
            day_of_week: 1,
            start_time: "18:00",
            end_time: "21:00",
            price_per_slot: 20,
        };
        expect(toPricingRule(rule)).toEqual(rule);
    });

    it("converts ISO datetime to datetime-local format", () => {
        const rule = { ...BASE_RULE, incentive_expires_at: "2026-04-08T14:30:00Z" };
        expect(toPricingRule(rule).incentive_expires_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    });
});
```

---

### Hook tests (`<module>.hooks.test.tsx`)

Use `renderHook` from `@testing-library/react` with a fresh `QueryClient` wrapper. Mock the entire `@repo/api-client/modules/<domain>` module — never call real endpoints.

**Wrapper helper (define once per test file):**

```ts
function makeWrapper() {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    return { client, Wrapper };
}
```

**Mock the api-client module at the top of the file:**

```ts
vi.mock("@repo/api-client/modules/staff", () => ({
    listCourtsEndpoint: vi.fn(),
    // ... all other endpoints the module exports
}));
import * as staffApi from "@repo/api-client/modules/staff";
```

**Required test cases per hook:**

| Hook type     | Required tests                                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------------- |
| `useQuery`    | success (data returned), `enabled` guard (does not fetch when param is empty)                                 |
| `useMutation` | success (endpoint called with correct args), cache invalidation (`invalidateQueries` called with correct key) |

```ts
describe("useListCourts", () => {
    it("returns courts for a club", async () => {
        vi.mocked(staffApi.listCourtsEndpoint).mockResolvedValue([mockCourt]);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useListCourts(CLUB_ID), { wrapper: Wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([mockCourt]);
    });

    it("does not fetch when clubId is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useListCourts(""), { wrapper: Wrapper });
        expect(staffApi.listCourtsEndpoint).not.toHaveBeenCalled();
    });
});

describe("useCreateCourt", () => {
    it("calls endpoint and invalidates list", async () => {
        vi.mocked(staffApi.createCourtEndpoint).mockResolvedValue(mockCourt);
        const { Wrapper, client } = makeWrapper();
        const invalidate = vi.spyOn(client, "invalidateQueries");
        const { result } = renderHook(() => useCreateCourt(CLUB_ID), { wrapper: Wrapper });
        result.current.mutate({
            club_id: CLUB_ID,
            name: "Court 1",
            surface_type: "artificial_grass",
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["courts", CLUB_ID] })
        );
    });
});
```

---

## Decision flowchart

```
New module added to api-client?
  └─ Create model.ts                         (always)
       └─ Any field transformation needed?
             ├─ Yes → Create mapper.ts
             └─ No  → skip
       └─ Any domain computation / validation?
             ├─ Yes → Create service.ts
             └─ No  → skip
       └─ Create hooks.ts                    (always)
```

---

## Checklist

- [ ] `<module>.model.ts` — domain interfaces for all DTO shapes
- [ ] Enums as union types, not `enum` keyword
- [ ] `models/index.ts` — all new types exported
- [ ] `<module>.mapper.ts` — only if field transformation required
- [ ] `mappers/index.ts` — mapper function exported
- [ ] `<module>.mapper.test.ts` — covers every mapper function (if mapper exists)
- [ ] `<module>.service.ts` — only if domain logic required
- [ ] `services/index.ts` — service functions exported
- [ ] `<module>.service.test.ts` — covers every service function (if service exists)
- [ ] `<module>.hooks.ts` — one hook per endpoint
- [ ] Query keys grouped in `<module>Keys` object
- [ ] `enabled` guard on every `useQuery` with required params
- [ ] `invalidateQueries` on every mutation that changes cached data
- [ ] `hooks/index.ts` — all hooks exported
- [ ] `<module>.hooks.test.tsx` — success + enabled-guard tests for queries; success + invalidation tests for mutations
- [ ] `vitest.config.ts` exists in the package (first module only)
- [ ] `vitest.setup.ts` exists in the package (first module only)
- [ ] `package.json` has `"test": "vitest run"` script (first module only)

---

> **NOTE:** Every time a new module is added to the domain layer, update the table below and set the `_Last updated` timestamp at the top of this file.

## Implemented domain modules

| Domain  | Module       | Model                 | Mapper           | Mapper test           | Service | Hooks                 | Hook test                   |
| ------- | ------------ | --------------------- | ---------------- | --------------------- | ------- | --------------------- | --------------------------- |
| `staff` | `club`       | `club.model.ts`       | `club.mapper.ts` | `club.mapper.test.ts` | —       | `club.hooks.ts`       | `club.hooks.test.tsx`       |
| `staff` | `court`      | `court.model.ts`      | —                | —                     | —       | `court.hooks.ts`      | `court.hooks.test.tsx`      |
| `staff` | `booking`    | `booking.model.ts`    | —                | —                     | —       | `booking.hooks.ts`    | `booking.hooks.test.tsx`    |
| `staff` | `membership` | `membership.model.ts` | —                | —                     | —       | `membership.hooks.ts` | `membership.hooks.test.tsx` |
| `staff` | `equipment`  | `equipment.model.ts`  | —                | —                     | —       | `equipment.hooks.ts`  | `equipment.hooks.test.tsx`  |
| `staff` | `trainer`    | `trainer.model.ts`    | —                | —                     | —       | `trainer.hooks.ts`    | `trainer.hooks.test.tsx`    |
