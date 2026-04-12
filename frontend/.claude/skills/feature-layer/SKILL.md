---
name: feature-layer
description: How to build a feature inside an app — folder structure, container/view pattern, pages, and styling.
---

Prerequisite: domain package must already expose hooks and models for this module.

## Feature folder structure

```
apps/web-staff/src/features/<feature>/
  hooks/        ← re-exports from domain package only
  store/        ← re-exports from domain package only
  types/        ← re-exports domain models + feature-only types (tabs, constants)
  components/   ← shared UI within this feature
  pages/        ← thin re-export shells only
  <sub-feature>/
    components/
    pages/
```

Split into sub-features when feature reaches 10 source files (excluding tests).

## Layer import rules

| Layer         | Can import                               | Cannot import                      |
| ------------- | ---------------------------------------- | ---------------------------------- |
| `pages/`      | `components/` of same feature            | domain packages directly, `fetch`  |
| `components/` | `hooks/`, `types/`, `@repo/ui`           | other features, `@repo/api-client` |
| `hooks/`      | `@repo/*-domain/hooks` (re-export only)  | `@repo/api-client` directly        |
| `types/`      | `@repo/*-domain/models` (re-export only) | DTOs, api-client types             |

## Container / View pattern (required for every data-fetching component)

**Container** — data only, minimal JSX:

```tsx
export default function ClubDetailContainer(): JSX.Element {
    const { data, isLoading, error } = useGetClub(clubId);
    if (isLoading) return <LoadingSpinner />;
    if (error || !data) return <ErrorMessage error={error} />;
    return <ClubDetailPageView club={data} />;
}
```

**View** — pure rendering, no hooks, no fetch:

```tsx
type Props = { club: Club; onSave: () => void };
export default function ClubDetailPageView({ club, onSave }: Props): JSX.Element {
    // local UI state (useState) is fine — no domain hooks, no useEffect for fetching
}
```

## Pages — thin shells only

```tsx
// pages/ClubsPage.tsx
export default function ClubsPage(): JSX.Element {
    return <ClubsContainer />;
}
```

Top-level `pages/` re-exports from sub-feature pages. App routing imports only from `features/<feature>/pages/`.

## Naming conventions

| Pattern        | Convention                          | Example                    |
| -------------- | ----------------------------------- | -------------------------- |
| Container      | `<Entity>Container`                 | `ClubDetailContainer`      |
| View           | `<Entity>View` / `<Entity>PageView` | `ClubDetailPageView`       |
| Modal          | `<Entity>Modal`                     | `ClubModal`                |
| Constants file | `<domain>Constants.ts`              | `pricingRulesConstants.ts` |

## Styling rules

- Tailwind utility classes only — no custom CSS, no `style={{}}`
- Use semantic tokens: `bg-primary`, `text-foreground`, `border-border`, `text-muted-foreground`
- Never: `bg-[#xxx]`, `text-amber-700`, `bg-sky-50`, or any Tailwind palette color directly

## Page layout baseline

```tsx
<div className="w-full space-y-5">
    <Breadcrumb items={[{ label: "Section" }, { label: "Page" }]} />
    <section className="w-full rounded-xl border border-border bg-card px-6 py-6 shadow-sm sm:px-8">
        <header className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
            <h1 className="text-xl font-semibold text-foreground">Page Title</h1>
        </header>
        <div className="mt-5">{/* content */}</div>
    </section>
</div>
```

## Checklist

- [ ] `hooks/index.ts` — re-exports from domain only
- [ ] `store/index.ts` — re-exports from domain only
- [ ] `types/index.ts` — re-exports domain models + feature-only types
- [ ] Every data-fetching component split into Container + View
- [ ] Pages are thin shells (no logic)
- [ ] No hardcoded colors, no cross-feature imports, no `@repo/api-client` in features
- [ ] Sub-feature count ≤ 10 source files
- [ ] Test file exists for every View and Container

## Ref: `docs/FE_FEATURE_LAYER_GUIDE.md`
