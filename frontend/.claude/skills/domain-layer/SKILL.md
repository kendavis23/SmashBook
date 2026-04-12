---
name: domain-layer
description: How to add domain models, mappers, services, and hooks for a new module in staff-domain or player-domain.
---

Prerequisite: module must already have `<module>.types.ts` and `<module>.api.ts` in `api-client`.

## Structure

```
packages/staff-domain/
  models/     ← domain model types (ONLY types exposed to apps)
  mappers/    ← DTO → model transforms (only when needed)
  services/   ← pure business logic (no HTTP, no React)
  hooks/      ← TanStack Query hooks (public interface for apps)
  store/      ← Zustand slices (domain state only)
  types/      ← internal types (NOT exported via index.ts)
  index.ts    ← public surface: models + hooks only
```

## Step 1 — Model (`<module>.model.ts`)

Mirror the DTO but rename: `XResponse` → `X`, `XCreate` → `XInput`, `XUpdate` → `XUpdateInput`. Same rules: enums as union types, `UUID` re-exported.

## Step 2 — Mapper (only if field transformation needed)

Add a mapper if: ISO datetime → datetime-local, or snake_case → camelCase. Skip if fields are structurally identical.

## Step 3 — Service (only if domain logic needed)

Pure functions that compute derived values or validate domain rules. No HTTP, no React side effects.

```ts
export function computeActiveCourts(courts: Court[]): Court[] {
    return courts.filter((c) => c.is_active).sort((a, b) => a.name.localeCompare(b.name));
}
```

## Step 4 — Hooks (`<module>.hooks.ts`) — always required

```ts
const courtKeys = {
    all: (clubId: string) => ["courts", clubId] as const,
    detail: (clubId: string, courtId: string) => ["courts", clubId, courtId] as const,
};

export function useListCourts(clubId: string) {
    return useQuery({
        queryKey: courtKeys.all(clubId),
        queryFn: async (): Promise<Court[]> => listCourtsEndpoint(clubId),
        enabled: Boolean(clubId), // ← always guard required params
    });
}

export function useCreateCourt(clubId: string) {
    const qc = useQueryClient();
    return useMutation<Court, Error, CourtInput>({
        mutationFn: (data) => createCourtEndpoint(clubId, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: courtKeys.all(clubId) }),
    });
}
```

Rules:

- Import endpoints from `@repo/api-client/modules/<domain>` — never call `fetcher` directly
- Import types from `../models` — never import DTO types
- Every `useQuery` needs `enabled: Boolean(param)` for required params
- Every mutation must `invalidateQueries` affected list/detail keys
- Group query keys in `const <module>Keys` at top of file

## Step 5 — Tests (required)

Mappers: test every exported function — no transform, field present, field absent.  
Hooks: use `renderHook` + fresh `QueryClient`. Mock the entire api-client module at the top.

Required per hook:

- `useQuery`: success case + `enabled` guard (does not fetch when param is empty)
- `useMutation`: success case + `invalidateQueries` called with correct key

## Checklist

- [ ] Model: all DTO shapes converted, enums as union types, `models/index.ts` updated
- [ ] Mapper: only if field transform needed, `mappers/index.ts` updated, mapper test exists
- [ ] Service: only if domain logic needed, `services/index.ts` updated, service test exists
- [ ] Hooks: one hook per endpoint, `<module>Keys` object, `enabled` guard, `invalidateQueries`
- [ ] `hooks/index.ts` — all hooks exported
- [ ] Hook tests: success + enabled-guard for queries; success + invalidation for mutations

## Ref: `docs/FE_DOMAIN_LAYER_GUIDE.md`
