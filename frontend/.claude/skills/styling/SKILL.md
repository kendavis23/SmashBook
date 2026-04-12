---
name: styling
description: Tailwind + design token rules for SmashBook — semantic tokens, typography scale, page layout baseline.
---

## Rules

- Tailwind utility classes only — no custom CSS files, no `style={{}}` props
- Use semantic tokens from `@repo/design-system` via Tailwind CSS variables
- Never: `bg-[#xxx]`, `text-amber-700`, `bg-sky-50`, `bg-violet-50`, `text-gray-500`, or any palette color directly

## Semantic token reference

| Token                                         | Purpose                                      |
| --------------------------------------------- | -------------------------------------------- |
| `bg-card`                                     | Card / panel backgrounds                     |
| `bg-muted`                                    | Subtle backgrounds (table headers, disabled) |
| `bg-cta`                                      | Primary action buttons                       |
| `bg-destructive`                              | Danger/delete buttons                        |
| `bg-success/15`                               | Success badge background                     |
| `bg-warning/15`                               | Warning badge background                     |
| `text-foreground`                             | Primary text                                 |
| `text-muted-foreground`                       | Secondary/placeholder text                   |
| `text-cta`                                    | Active link / selected tab                   |
| `text-success` / `text-warning` / `text-info` | Status text                                  |
| `border-border`                               | Dividers and card borders                    |

## Typography scale

| Use            | Class                                                                 |
| -------------- | --------------------------------------------------------------------- |
| Page title     | `text-xl font-semibold text-foreground`                               |
| Section header | `text-sm font-semibold text-foreground`                               |
| Description    | `text-sm text-muted-foreground`                                       |
| Table header   | `text-xs font-semibold uppercase tracking-wide text-muted-foreground` |
| Body text      | `text-sm text-foreground`                                             |
| Badge          | `text-xs font-medium`                                                 |

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

## Form section baseline

```tsx
<section>
    <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">Section Title</h3>
        <p className="mt-1 text-sm text-muted-foreground">Description.</p>
    </div>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {/* FormField components */}
    </div>
</section>
```

## Pinned version

Tailwind CSS **3.4.17** — do NOT upgrade to v4.

## Ref: `docs/FE_FEATURE_LAYER_GUIDE.md` §6, `docs/FE_CODING_STANDARD.md` §10
