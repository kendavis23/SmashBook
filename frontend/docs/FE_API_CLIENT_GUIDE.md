_Last updated: 2026-04-08 12:00 UTC_

# Backend Schema → Frontend API Client

How to convert a Python backend schema into a typed frontend API client module.

---

## File structure for each module

Choose the domain that owns the module:

| Domain    | Who uses it                        | Example modules          |
|-----------|------------------------------------|--------------------------|
| `staff`   | Club operators / admin portal      | `club`, `court`, `staff` |
| `player`  | Player-facing web & mobile         | `booking`, `profile`     |
| `share`   | Used by both staff and player      | `profile`                |

```
packages/api-client/modules/<domain>/<module>/
  <module>.types.ts   ← TypeScript types from Python schemas
  <module>.api.ts     ← API functions using fetcher
  <module>.api.test.ts
```

Register in `packages/api-client/modules/<domain>/index.ts`.

---

## Type conversion rules

| Python (Pydantic)         | TypeScript                     |
|---------------------------|--------------------------------|
| `uuid.UUID`               | `UUID` (= `string`)            |
| `str`                     | `string`                       |
| `int` / `float` / `Decimal` | `number`                     |
| `bool`                    | `boolean`                      |
| `datetime` / `date`       | `string` (ISO 8601)            |
| `Optional[X]`             | `X \| null`                    |
| `Optional[X] = None` on Create/Update | `X?: ... \| null` |
| `list[X]`                 | `X[]`                          |
| `Enum`                    | `type MyEnum = "val1" \| "val2"` |
| `BaseModel` (Create)      | `interface XCreate`            |
| `BaseModel` (Update)      | `interface XUpdate` — all fields optional |
| `BaseModel` (Response)    | `interface XResponse`          |

**UUID:** Defined once in `packages/api-client/modules/staff/common.ts`. Every types file re-exports it from there — never redeclare it.

`staff/common.ts`:
```ts
export type UUID = string;
```

In each `<module>.types.ts`:
```ts
import type { UUID } from "../common";
export type { UUID };
```

---

## Example: simple model

**Python**
```python
class CourtCreate(BaseModel):
    club_id: uuid.UUID
    name: str
    has_lighting: bool = False
    lighting_surcharge: Optional[Decimal] = None

class CourtResponse(BaseModel):
    id: uuid.UUID
    club_id: uuid.UUID
    name: str
    has_lighting: bool
    lighting_surcharge: Optional[Decimal] = None
```

**TypeScript** (`court.types.ts`)
```ts
export interface CourtCreate {
    club_id: UUID;
    name: string;
    has_lighting?: boolean;
    lighting_surcharge?: number | null;
}

export interface CourtResponse {
    id: UUID;
    club_id: UUID;
    name: string;
    has_lighting: boolean;
    lighting_surcharge: number | null;
}
```

---

## Example: enum model

**Python**
```python
class CalendarReservationType(str, Enum):
    block = "block"
    maintenance = "maintenance"

class CalendarReservationCreate(BaseModel):
    reservation_type: CalendarReservationType
    title: str
    is_recurring: bool = False
    recurrence_rule: Optional[str] = None
```

**TypeScript**
```ts
export type CalendarReservationType = "block" | "maintenance";

export interface CalendarReservationCreate {
    reservation_type: CalendarReservationType;
    title: string;
    is_recurring?: boolean;
    recurrence_rule?: string | null;
}
```

---

## API functions (`<module>.api.ts`)

```ts
import { fetcher } from "../../../core/fetcher";
import type { CourtCreate, CourtResponse } from "./court.types";

const JSON_HEADERS = { "Content-Type": "application/json" };

// GET list
export function listCourtsEndpoint(clubId: string): Promise<CourtResponse[]> {
    return fetcher<CourtResponse[]>(`/api/v1/clubs/${clubId}/courts`);
}

// POST
export function createCourtEndpoint(clubId: string, data: CourtCreate): Promise<CourtResponse> {
    return fetcher<CourtResponse>(`/api/v1/clubs/${clubId}/courts`, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(data),
    });
}

// PATCH
export function updateCourtEndpoint(clubId: string, courtId: string, data: CourtUpdate): Promise<CourtResponse> {
    return fetcher<CourtResponse>(`/api/v1/clubs/${clubId}/courts/${courtId}`, {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify(data),
    });
}

// DELETE
export function deleteCourtEndpoint(clubId: string, courtId: string): Promise<void> {
    return fetcher<void>(`/api/v1/clubs/${clubId}/courts/${courtId}`, { method: "DELETE" });
}
```

Function naming: `listX`, `createX`, `getX`, `updateX`, `deleteX` — always suffixed with `Endpoint`.

---

## Unit tests (`<module>.api.test.ts`) — required

Every module **must** have a test file alongside `<module>.api.ts`. Tests mock `fetcher` and assert the correct URL, method, and body for each function. No real HTTP calls are made.

**File location:**
```
packages/api-client/modules/<domain>/<module>/<module>.api.test.ts
```

**Pattern:**
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { listCourtsEndpoint, createCourtEndpoint } from "./court.api";

vi.mock("../../../core/fetcher", () => ({ fetcher: vi.fn() }));

import { fetcher } from "../../../core/fetcher";
const mockFetcher = vi.mocked(fetcher);

beforeEach(() => { mockFetcher.mockReset(); });

describe("listCourtsEndpoint", () => {
    it("calls GET /api/v1/clubs/:clubId/courts", async () => {
        mockFetcher.mockResolvedValue([]);
        await listCourtsEndpoint("club-1");
        expect(mockFetcher).toHaveBeenCalledWith("/api/v1/clubs/club-1/courts");
    });
});

describe("createCourtEndpoint", () => {
    it("calls POST with body", async () => {
        mockFetcher.mockResolvedValue({});
        const data = { club_id: "club-1", name: "Court 1", surface_type: "concrete" as const };
        await createCourtEndpoint("club-1", data);
        expect(mockFetcher).toHaveBeenCalledWith("/api/v1/clubs/club-1/courts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
    });
});
```

One `describe` block per exported function. One `it` per test — assert URL, method, and body only.

**Run tests:**
```bash
pnpm --filter @repo/api-client test
```

---

## Register exports

Add both files to the domain's `index.ts`:

`packages/api-client/modules/<domain>/index.ts`:
```ts
export * from "./<module>/<module>.api";
export * from "./<module>/<module>.types";
// add new module here
```

---

## Checklist

- [ ] `<module>.types.ts` — all Python schemas converted
- [ ] Enums as union types, not `enum` keyword
- [ ] `UUID` imported from `club.types`, not redeclared
- [ ] `<module>.api.ts` — one function per endpoint
- [ ] `<module>.api.test.ts` — one `describe` per function, fetcher mocked
- [ ] `index.ts` — both files exported

---

> **NOTE:** Every time a new module is added, update the table below and set the `_Last updated` timestamp at the top of this file. This table must stay in sync with the code — it is the source of truth for AI and developers to know what has been implemented.

## Implemented modules

| Domain   | Module    | Types file           | API file           | Test file                |
|----------|-----------|----------------------|--------------------|--------------------------|
| `staff`  | `club`    | `club.types.ts`      | `club.api.ts`      | `club.api.test.ts`       |
| `staff`  | `court`   | `court.types.ts`     | `court.api.ts`     | `court.api.test.ts`      |
| `player` | —         | —                    | —                  | —                        |
| `share`  | `profile` | `profile.types.ts`   | `profile.api.ts`   | —                        |
