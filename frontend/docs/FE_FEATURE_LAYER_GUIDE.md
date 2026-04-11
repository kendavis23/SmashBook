_Last updated: 2026-04-08 14:00 UTC_

# Frontend Feature Layer Guide

How to build a feature inside an app that consumes a domain package.

This guide continues from [`FE_DOMAIN_LAYER_GUIDE.md`](FE_DOMAIN_LAYER_GUIDE.md). Before creating a feature, the domain package must already expose hooks and models for the module (e.g. `@repo/staff-domain/hooks`, `@repo/staff-domain/models`).

---

## Where features live

Each app has its own `features/` directory. No feature code crosses app boundaries.

```
apps/web-staff/src/features/
apps/web-player/src/features/
```

A **feature** represents one user-facing concern (e.g. `club`, `court`, `booking`). When a feature grows beyond 10 files, split it into named sub-features.

---

## Feature folder structure

```
features/
  <feature>/
    components/       # shared UI within this feature (e.g. modals reused across sub-features)
    hooks/            # re-exports from domain packages only
    store/            # re-exports from domain packages only
    types/            # feature-specific types (NOT DTOs, NOT domain models)
    pages/            # entry-point re-exports (thin shells only)
    <sub-feature>/
      components/     # sub-feature UI
      pages/          # sub-feature pages
```

### Sub-feature split rule

When a feature reaches 10 source files (excluding tests), split it into named sub-features:

```
features/club/
  clubs-list/           # sub-feature: list all clubs
    components/
    pages/
  club-detail/          # sub-feature: manage a single club
    components/
    pages/
  components/           # shared between sub-features (e.g. ClubModal)
  hooks/                # index re-exports from @repo/staff-domain/hooks
  store/                # index re-exports from @repo/staff-domain/store
  types/                # feature types + constants exported via index
  pages/                # thin re-exports → actual pages in sub-features
```

---

## Layer rules (strict)

| Layer         | Can import from                                                                       | Cannot import from                                      |
| ------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `pages/`      | `components/` of the same feature                                                     | Domain packages directly, `fetch`, `useEffect` for data |
| `components/` | `hooks/`, `types/`, `@repo/ui`, `@repo/design-system`, other feature-local components | Other features, `@repo/api-client`, DOM fetch           |
| `hooks/`      | `@repo/*-domain/hooks` (re-export only)                                               | `@repo/api-client` directly                             |
| `store/`      | `@repo/*-domain/store` (re-export only)                                               | Cross-domain stores                                     |
| `types/`      | `@repo/*-domain/models` (re-export only), local feature types                         | DTOs, `@repo/api-client` types                          |

**Cross-feature imports are prohibited.** Features communicate only through domain packages.

---

## Step 1 — Create `hooks/index.ts`

Re-export all hooks the feature needs from the domain package. No new hooks are written here.

```ts
// features/club/hooks/index.ts
export {
    useListClubs,
    useCreateClub,
    useGetClub,
    useUpdateClub,
    useUpdateClubSettings,
    useGetOperatingHours,
    useSetOperatingHours,
    useGetPricingRules,
    useSetPricingRules,
} from "@repo/staff-domain/hooks";
```

---

## Step 2 — Create `store/index.ts`

Re-export domain store slices the feature needs.

```ts
// features/club/store/index.ts
export { useClubAccess } from "@repo/staff-domain/store";
```

---

## Step 3 — Create `types/index.ts`

Re-export domain model types **and** define feature-specific types (e.g. tab identifiers, local form state). Never import DTOs here.

```ts
// features/club/types/index.ts
export type {
    Club,
    ClubSettingsInput,
    OperatingHours,
    PricingRule,
} from "@repo/staff-domain/models";

// Feature-specific types — not in domain
export type Tab = "view" | "settings" | "hours" | "pricing";

export const TABS: { id: Tab; label: string }[] = [
    { id: "view", label: "View" },
    { id: "settings", label: "Settings" },
    { id: "hours", label: "Operating Hours" },
    { id: "pricing", label: "Pricing Rules" },
];
```

**Rule:** types that belong only to the feature's UI (local state shape, tab IDs, constants) live here. Never put them in a component file.

---

## Step 4 — Container / View pattern (required for every component)

Every component with data-fetching **must** be split into a Container (data) and a View (UI).

### Container

- Calls domain hooks to fetch/mutate data
- Handles loading, error, and redirect logic
- Passes typed props to the View
- Contains no JSX beyond loading/error fallbacks

```tsx
// club-detail/components/ClubDetailContainer.tsx
import { useGetClub } from "../../hooks";
import { useClubAccess } from "../../store";
import type { Club } from "../../types";
import ClubDetailPageView from "./ClubDetailPageView";

export default function ClubDetailContainer(): JSX.Element {
    const { clubId } = useParams({ strict: false }) as { clubId: string };
    const { data, isLoading, error } = useGetClub(clubId);
    const { role } = useClubAccess();

    if (isLoading) return <LoadingSpinner />;
    if (error || !data) return <ErrorMessage error={error} />;

    return (
        <ClubDetailPageView
            club={data as Club}
            clubId={clubId}
            role={role}
            // ... all other props
        />
    );
}
```

### View

- Pure rendering — receives all data as props
- No `useEffect` for data fetching
- No domain hooks, no `fetch`, no mutations
- Can have local UI state (`useState`) for modals, tabs, form dirty-state

```tsx
// club-detail/components/ClubDetailPageView.tsx
type Props = {
    club: Club;
    clubId: string;
    activeTab: Tab;
    onTabChange: (tab: Tab) => void;
    // ...
};

export default function ClubDetailPageView({ club, activeTab, onTabChange }: Props): JSX.Element {
    return <div className="w-full space-y-4">{/* pure rendering — no hooks */}</div>;
}
```

---

## Step 5 — Pages (entry points)

Pages are **thin shells** — they render the container and nothing else. No logic, no state, no hooks.

```tsx
// clubs-list/pages/ClubsPage.tsx
import type { JSX } from "react";
import ClubsContainer from "../components/ClubsContainer";

export default function ClubsPage(): JSX.Element {
    return <ClubsContainer />;
}
```

Top-level `pages/` re-exports sub-feature pages so app-level routing does not need to know about sub-features:

```tsx
// features/club/pages/ClubsPage.tsx
export { default } from "../clubs-list/pages/ClubsPage";

// features/club/pages/ClubDetailPage.tsx
export { default } from "../club-detail/pages/ClubDetailPage";
```

App-level routing only imports from `features/<feature>/pages/`:

```tsx
// apps/web-staff/src/app/index.tsx
const ClubsPage = lazy(() => import("../features/club/pages/ClubsPage"));
const ClubDetailPage = lazy(() => import("../features/club/pages/ClubDetailPage"));
```

---

## Step 6 — Styling rules

All styling uses Tailwind utility classes with design tokens from `@repo/design-system`.

### Rules

- **Tailwind only** — no custom CSS files, no `style={{}}` props
- **Design tokens only** — never hardcode colors, spacing, or font sizes
- Use semantic tokens: `bg-primary`, `text-foreground`, `border-border`, `text-muted-foreground`
- Feature-specific class strings that repeat across components can be extracted into a constants file

```ts
// pricingRulesConstants.ts — shared Tailwind class strings for this sub-feature
export const fieldCls =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground " +
    "placeholder:text-muted-foreground transition focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta-ring/30";

export const labelCls = "mb-1 block text-sm font-medium text-foreground";
```

### Semantic token reference

| Token                   | Purpose                                      |
| ----------------------- | -------------------------------------------- |
| `bg-card`               | Card / panel backgrounds                     |
| `bg-muted`              | Subtle backgrounds (table headers, disabled) |
| `bg-secondary`          | Badges, tags                                 |
| `bg-cta`                | Primary action buttons                       |
| `bg-destructive`        | Danger/delete buttons                        |
| `bg-success/15`         | Success badge background                     |
| `bg-warning/15`         | Warning/surge badge background               |
| `bg-info/15`            | Info/low-demand badge background             |
| `text-foreground`       | Primary text                                 |
| `text-muted-foreground` | Secondary/placeholder text                   |
| `text-cta`              | Active link / selected tab color             |
| `text-success`          | Positive status text                         |
| `text-warning`          | Warning status text                          |
| `text-info`             | Informational status text                    |
| `border-border`         | Default dividers and card borders            |

**Never use:** `bg-[#xxx]`, `text-amber-700`, `bg-sky-50`, `bg-violet-50`, `text-gray-500` or any Tailwind palette color directly.

### Page layout baseline

Every page-level container follows this structure:

```tsx
<div className="w-full space-y-5">
    {/* Breadcrumb */}
    <Breadcrumb items={[{ label: "Section" }, { label: "Page" }]} />

    {/* Main card */}
    <section className="w-full rounded-xl border border-border bg-card px-6 py-6 shadow-sm sm:px-8">
        {/* Header */}
        <header className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
            <h1 className="text-xl font-semibold text-foreground">Page Title</h1>
        </header>

        {/* Content */}
        <div className="mt-5">{/* tab content / list / form */}</div>
    </section>
</div>
```

### Form section baseline

```tsx
<section className="form-section">
    <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">Section Title</h3>
        <p className="mt-1 text-sm text-muted-foreground">Helpful description.</p>
    </div>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {/* FormField components */}
    </div>
</section>
```

### Typography scale

| Use                  | Class                                                                 |
| -------------------- | --------------------------------------------------------------------- |
| Page title           | `text-xl font-semibold text-foreground`                               |
| Section header       | `text-sm font-semibold text-foreground`                               |
| Description / helper | `text-sm text-muted-foreground`                                       |
| Table header         | `text-xs font-semibold uppercase tracking-wide text-muted-foreground` |
| Body text            | `text-sm text-foreground`                                             |
| Badge / label        | `text-xs font-medium`                                                 |
| Input text           | `text-sm text-foreground`                                             |

---

## Step 7 — Tests (required)

Every feature component, utility function, and service must have tests. Tests live alongside their source file.

### What to test

| File type                  | Test focus                                                    |
| -------------------------- | ------------------------------------------------------------- |
| View component             | User behavior — rendered output, user events, prop variations |
| Container component        | Loading/error/success state rendering, hook calls             |
| Utility / constants        | Pure function outputs                                         |
| Hooks (in domain packages) | See `FE_DOMAIN_LAYER_GUIDE.md`                                |

### Rules

- Use `@testing-library/react` — `render`, `screen`, `fireEvent`
- Query by role: `getByRole`, `getByText`, `getByLabelText`, `getByPlaceholderText`
- Avoid `getByTestId` unless absolutely no semantic alternative exists
- Mock domain hooks at the module level with `vi.mock`
- Mock `@repo/ui` components minimally — return simple HTML equivalents
- Test behavior, not implementation — never assert on internal state
- Never test Zustand store directly — test the component behavior that depends on it

### Test file naming

```
ClubsView.tsx          → ClubsView.test.tsx
HoursEditor.tsx        → HoursEditor.test.tsx
pricingRulesConstants.ts → pricingRulesConstants.test.ts
```

### Test structure

```tsx
// ClubsView.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ClubsView from "./ClubsView";

vi.mock("@repo/ui", () => ({
    Breadcrumb: ({ items }: { items: { label: string }[] }) => (
        <nav>{items.map((i) => <span key={i.label}>{i.label}</span>)}</nav>
    ),
}));

describe("ClubsView — loading state", () => {
    it("shows loading spinner", () => {
        render(<ClubsView clubs={[]} search="" isLoading={true} error={null} ... />);
        expect(screen.getByText("Loading clubs…")).toBeInTheDocument();
    });
});

describe("ClubsView — club list", () => {
    it("calls onManageClub with the correct id when Manage is clicked", () => {
        const handleManage = vi.fn();
        render(<ClubsView clubs={mockClubs} ... onManageClub={handleManage} />);
        fireEvent.click(screen.getAllByText("Manage")[0]);
        expect(handleManage).toHaveBeenCalledWith("club-id-1");
    });
});
```

### Required test cases per component type

**View component:**

- Loading state renders loading indicator
- Error state renders error message
- Empty state renders empty message and CTA
- Data state renders all items
- User events call correct callbacks with correct arguments

**Modal / dialog:**

- Renders correct title for create vs edit mode
- Validation prevents submit when required fields are empty
- Submit calls mutation with correct payload
- Cancel calls `onClose`

**Toggle / editor (e.g. HoursEditor):**

- Initial render matches props
- Interactive change enables Save button
- Save calls `onSave` with correct filtered payload
- Success/error feedback shown when props change

**Pure utility (constants, services):**

- All exported functions tested with: zero/empty input, typical input, edge cases

---

## Code quality limits

| Metric               | Limit                                                      |
| -------------------- | ---------------------------------------------------------- |
| File                 | 300 lines                                                  |
| Function             | 50 lines                                                   |
| Component            | 200 lines                                                  |
| Feature source files | 10 (excluding tests — split into sub-features if exceeded) |

Additional rules:

- No `console.log` in committed code
- No `any` — use `unknown` and narrow
- No non-null assertion (`!`) without an explanatory comment
- No unused imports or variables
- Prefer named exports for components within `components/`; default exports for pages and containers

---

## Naming conventions

| Pattern             | Convention                           | Example                                 |
| ------------------- | ------------------------------------ | --------------------------------------- |
| Container component | `<Entity>Container`                  | `ClubsContainer`, `ClubDetailContainer` |
| View component      | `<Entity>View` or `<Entity>PageView` | `ClubsView`, `ClubDetailPageView`       |
| Section component   | `<Entity><Section>Section`           | `ClubDetailHoursSection`                |
| Editor / sub-view   | `<Entity>Editor`                     | `HoursEditor`                           |
| Modal               | `<Entity>Modal`                      | `ClubModal`, `DeleteModal`              |
| Constants file      | `<domain>Constants.ts`               | `pricingRulesConstants.ts`              |
| Hook re-export      | `hooks/index.ts`                     | —                                       |
| Store re-export     | `store/index.ts`                     | —                                       |
| Types re-export     | `types/index.ts`                     | —                                       |

---

## Checklist — new feature

- [ ] `hooks/index.ts` — re-exports from domain package only
- [ ] `store/index.ts` — re-exports from domain package only
- [ ] `types/index.ts` — re-exports domain models + feature-only types
- [ ] Every data-fetching component split into Container + View
- [ ] Pages are thin shells (no logic)
- [ ] `pages/` contains re-export files pointing to sub-feature pages
- [ ] No hardcoded colors (`bg-[#xxx]`, `text-amber-700`, etc.)
- [ ] No cross-feature imports
- [ ] No imports from `@repo/api-client` inside features
- [ ] No `process.env` / `import.meta.env` access (use `@repo/config`)
- [ ] File count per sub-feature ≤ 10 source files
- [ ] All components ≤ 200 lines
- [ ] View component test file exists for every View
- [ ] Container component test file exists for every Container
- [ ] Utility/constants test file exists for every constants/service file
- [ ] Tests use `getByRole`, `getByText`, `getByLabelText` — not `getByTestId`
- [ ] Mocks defined with `vi.mock(...)` at module level

---

## Implemented features

| App         | Feature | Sub-features                | Domain package       |
| ----------- | ------- | --------------------------- | -------------------- |
| `web-staff` | `club`  | `clubs-list`, `club-detail` | `@repo/staff-domain` |
| `web-staff` | `court` | —                           | `@repo/staff-domain` |
