---
name: api-client
description: How to add a new API client module — types, endpoint functions, tests, and registration.
---

## File structure for a new module

```
packages/api-client/modules/<domain>/<module>/
  <module>.types.ts    ← DTO types from Python schemas
  <module>.api.ts      ← endpoint functions using fetcher
  <module>.api.test.ts ← required unit tests
```

Domain is `staff`, `player`, or `share`. Register both files in the domain `index.ts`.

## Type conversion (Python → TypeScript)

| Python                                | TypeScript                                              |
| ------------------------------------- | ------------------------------------------------------- |
| `uuid.UUID`                           | `UUID` (= `string`, import from `common.ts`)            |
| `datetime` / `date`                   | `string` (ISO 8601)                                     |
| `Optional[X]`                         | `X \| null`                                             |
| `Optional[X] = None` on Create/Update | `X?: ... \| null`                                       |
| `Enum`                                | `type MyEnum = "val1" \| "val2"` (never `enum` keyword) |
| `BaseModel` (Create)                  | `interface XCreate`                                     |
| `BaseModel` (Update)                  | `interface XUpdate` — all fields optional               |
| `BaseModel` (Response)                | `interface XResponse`                                   |

`UUID` is declared once in `common.ts` — never redeclare it.

## Endpoint function pattern

```ts
// Naming: listX, getX, createX, updateX, deleteX — always suffix with `Endpoint`
export function listCourtsEndpoint(clubId: string): Promise<CourtResponse[]> {
    return fetcher<CourtResponse[]>(`/api/v1/clubs/${clubId}/courts`);
}

export function createCourtEndpoint(clubId: string, data: CourtCreate): Promise<CourtResponse> {
    return fetcher<CourtResponse>(`/api/v1/clubs/${clubId}/courts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
}
```

## Test pattern (required)

Mock `fetcher`, assert URL + method + body. One `describe` per function, one `it` per test.

```ts
vi.mock("../../../core/fetcher", () => ({ fetcher: vi.fn() }));
import { fetcher } from "../../../core/fetcher";
const mockFetcher = vi.mocked(fetcher);
beforeEach(() => mockFetcher.mockReset());
```

## Checklist

- [ ] `<module>.types.ts` — all Python schemas converted, enums as union types
- [ ] `UUID` imported from `common.ts`, not redeclared
- [ ] `<module>.api.ts` — one function per endpoint, suffixed `Endpoint`
- [ ] `<module>.api.test.ts` — fetcher mocked, URL/method/body asserted
- [ ] `index.ts` — both files exported

## Ref: `docs/FE_API_CLIENT_GUIDE.md`
