_Last updated: 2026-04-18 14:30 UTC_

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

## Step 2 — Create `store/index.ts` and `store/access.ts`

### `store/index.ts`

Re-export domain store slices the feature needs, plus all access functions from `access.ts`.

```ts
// features/club/store/index.ts
export { useClubAccess } from "@repo/staff-domain/store";
export { canManageClub, canCreateClub, canViewClubList } from "./access";
```

### `store/access.ts` — single source of truth for role checks

All role-to-permission logic for the feature lives **exclusively** in `access.ts`. Components and containers import and call these functions — they never write inline role comparisons (`role === "owner" || role === "admin"`).

```ts
// features/club/store/access.ts
import type { TenantUserRole } from "@repo/auth";

// To extend access to additional roles, add them to the relevant array.
const MANAGE_ROLES: TenantUserRole[] = ["owner", "admin"];
const CREATE_CLUB_ROLES: TenantUserRole[] = ["owner"];

export function canManageClub(role: TenantUserRole | null): boolean {
    return role !== null && MANAGE_ROLES.includes(role);
}

export function canCreateClub(role: TenantUserRole | null): boolean {
    return role !== null && CREATE_CLUB_ROLES.includes(role);
}

export function canViewClubList(role: TenantUserRole | null): boolean {
    return role === "owner";
}
```

**Rule:** every feature that has role-gated UI must have an `access.ts`. Containers read `role` from `useClubAccess()` and pass the result of an access function to the View as a boolean prop (`canCreate`, `canManage`, etc.). Views never import `access.ts` directly.

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

## Step 6 — Date and time formatting

Always use the helpers from `@repo/ui` to display dates and times. Never use `new Date().toLocaleString()`, `Date.toLocaleDateString()`, or manual string manipulation — these shift times by the browser's local timezone.

| Helper               | Output example           | When to use                                                            |
| -------------------- | ------------------------ | ---------------------------------------------------------------------- |
| `formatUTCDateTime`  | `Apr 17, 2026, 10:00 AM` | Full date + time display                                               |
| `formatUTCDate`      | `Apr 17, 2026`           | Date-only display                                                      |
| `formatUTCTime`      | `10:00 AM`               | Time-only display                                                      |
| `datetimeLocalToUTC` | `2026-04-17T10:00:00Z`   | Converting `<input type="datetime-local">` value before sending to API |

```tsx
import { formatUTCDateTime, formatUTCDate, formatUTCTime } from "@repo/ui";

// In a View component — display a booking start time
<span>{formatUTCDateTime(booking.start_time)}</span>

// Date only
<span>{formatUTCDate(booking.date)}</span>

// Time only
<span>{formatUTCTime(booking.start_time)}</span>
```

**Rule:** every ISO string that comes from the API must be formatted through one of these helpers before display. Import from `@repo/ui` — never from the file path directly.

---

## Step 7 — Styling rules

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

### Form inputs

**Never use bare `<input>`, `<select>`, or `<input type="date">` elements in feature components.** Native inputs render inconsistently across browsers (Chrome vs Safari) and carry no shared styles. Always use the shared components from `@repo/ui`.

| Use case                | Component                                         | Import     |
| ----------------------- | ------------------------------------------------- | ---------- |
| Text / email / password | native `<input>` is fine — no cross-browser issue | —          |
| Number field            | `NumberInput`                                     | `@repo/ui` |
| Time field              | `TimeInput`                                       | `@repo/ui` |
| Date field              | `DatePicker`                                      | `@repo/ui` |
| Date + time field       | `DateTimePicker`                                  | `@repo/ui` |
| Dropdown / select       | `SelectInput`                                     | `@repo/ui` |

```tsx
import { NumberInput, TimeInput, DatePicker, DateTimePicker, SelectInput } from "@repo/ui";
import type { SelectOption } from "@repo/ui";

const DAY_OPTIONS: SelectOption[] = [
    { value: "0", label: "Monday" },
    { value: "1", label: "Tuesday" },
    // ...
];

// ✅ Correct — use shared components
<NumberInput
    className="input-base"
    value={form.capacity}
    min={1}
    onChange={(e) => onChange({ capacity: Number(e.target.value) })}
/>

<TimeInput
    className="input-base"
    value={form.open_time}
    onChange={(e) => onChange({ open_time: e.target.value })}
/>

<DatePicker
    className="input-base"
    value={form.valid_from}          // "YYYY-MM-DD"
    onChange={(v) => onChange({ valid_from: v })}
/>

<DateTimePicker
    className="input-base"
    value={form.expires_at}          // "YYYY-MM-DDTHH:MM"
    onChange={(v) => onChange({ expires_at: v })}
/>

<SelectInput
    name="day_of_week"
    value={form.day_of_week}
    options={DAY_OPTIONS}
    onValueChange={(v) => onChange({ day_of_week: v })}
    placeholder="Select day"
/>

// ❌ Wrong — never write these in feature components
<input type="number" ... />
<input type="time" ... />
<input type="date" ... />
<input type="datetime-local" ... />
<select>...</select>
```

**Rule:** if you need a new input variant that `@repo/ui` does not yet export, add the component to `packages/ui/components/` first, export it from `packages/ui/components/index.ts`, then consume it in the feature. Never build a one-off styled input inside a feature.

### Page layout baseline

Every page-level container follows this structure:

```tsx
<div className="w-full space-y-5">
    {/* Breadcrumb */}
    <Breadcrumb items={[{ label: "Section" }, { label: "Page" }]} />

    {/* Main card */}
    <section className="card-surface overflow-hidden">
        {/* Header — see header patterns below */}
        <header className="flex flex-col gap-4 border-b border-border px-5 py-5 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
                <h1 className="text-xl font-semibold tracking-tight text-foreground">Page Title</h1>
                <p className="mt-1 text-sm text-muted-foreground">Subtitle or summary count</p>
            </div>
        </header>

        {/* Content */}
        <div className="px-5 py-5 sm:px-6">{/* tab content / list / form */}</div>
    </section>
</div>
```

### List page header — Refresh + New button

List pages always show a **Refresh** button and, for privileged roles, a **New \<Entity\>** button that navigates to a dedicated create page. Never open a modal for create/edit — use a route instead (see create/edit page patterns below).

```tsx
{
    /* In the View component's Props */
}
type Props = {
    // ...
    canManage: boolean;
    onRefresh: () => void;
    onCreateClick: () => void;
};

{
    /* Header JSX */
}
<header className="flex flex-col gap-4 border-b border-border px-5 py-5 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
    <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Entities</h1>
        <p className="mt-1 text-sm text-muted-foreground">
            {items.length > 0
                ? `${activeCount} active · ${items.length} total`
                : "Manage your club's entities"}
        </p>
    </div>
    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
        <button
            onClick={onRefresh}
            className="btn-outline min-h-11 px-4"
            aria-label="Refresh entities"
        >
            <RefreshCw size={14} /> Refresh
        </button>
        {canManage ? (
            <button onClick={onCreateClick} className="btn-cta min-h-11 px-4.5">
                <Plus size={14} /> New Entity
            </button>
        ) : null}
    </div>
</header>;
```

**In the Container:** wire `onRefresh` to `refetch` from the domain hook and `onCreateClick` to `navigate({ to: "/entities/new" })`.

```tsx
// Container
const { data, isLoading, error, refetch } = useListEntities(clubId);

const handleRefresh = useCallback(() => void refetch(), [refetch]);
const handleCreateClick = useCallback(() => void navigate({ to: "/entities/new" }), [navigate]);
```

**Success toast on return:** After create/edit navigates back, show a toast from a query-param flag (`?created=true` / `?updated=true`) — same pattern as bookings.

```tsx
// Container — read flag on mount, clear it from the URL immediately
const search = useSearch({ strict: false }) as { created?: boolean; updated?: boolean };
const [successMsg] = useState(
    search.created ? "Entity created." : search.updated ? "Entity updated." : ""
);
useEffect(() => {
    if (search.created || search.updated) {
        void navigate({
            to: "/entities",
            search: { created: undefined, updated: undefined },
            replace: true,
        });
    }
}, []);
```

---

### Create page pattern

A dedicated create page lives at `/entities/new`. It is a separate sub-feature (`new-entity/`) with its own Container and View — never reuse a modal.

**Folder structure:**

```
features/entity/
  new-entity/
    components/
      NewEntityView.tsx        ← pure form, no hooks
      NewEntityContainer.tsx   ← calls useCreateEntity, handles submit + cancel
      NewEntityView.test.tsx
      NewEntityContainer.test.tsx
    pages/
      NewEntityPage.tsx        ← thin shell: <NewEntityContainer />
  pages/
    NewEntityPage.tsx          ← re-export: export { default } from "../new-entity/pages/NewEntityPage"
```

**View pattern:**

```tsx
// NewEntityView.tsx
export type NewEntityFormState = { name: string; /* ... */ };

type Props = {
    form: NewEntityFormState;
    nameError: string;
    apiError: string;
    isPending: boolean;
    onFormChange: (patch: Partial<NewEntityFormState>) => void;
    onSubmit: (e: FormEvent) => void;
    onCancel: () => void;
    onDismissError: () => void;
};

export default function NewEntityView({ ... }: Props): JSX.Element {
    return (
        <div className="w-full space-y-5">
            <Breadcrumb items={[{ label: "Entities", href: "/entities" }, { label: "New Entity" }]} />
            <section className="card-surface overflow-hidden">
                <header className="flex flex-col gap-4 border-b border-border px-5 py-5 sm:px-6">
                    <div className="min-w-0">
                        <h1 className="text-xl font-semibold tracking-tight text-foreground">New Entity</h1>
                        <p className="mt-1 text-sm text-muted-foreground">Description of what this creates.</p>
                    </div>
                </header>
                <div className="px-5 py-6 sm:px-6">
                    {apiError ? <AlertToast title={apiError} variant="error" onClose={onDismissError} /> : null}
                    <form onSubmit={onSubmit} noValidate>
                        {/* form sections */}
                        <div className="mt-8 flex items-center justify-end gap-3 border-t border-border pt-5">
                            <button type="button" onClick={onCancel} className="btn-outline">Cancel</button>
                            <button type="submit" disabled={isPending} className="btn-cta">
                                {isPending ? "Creating…" : "Create Entity"}
                            </button>
                        </div>
                    </form>
                </div>
            </section>
        </div>
    );
}
```

**Container pattern:**

```tsx
// NewEntityContainer.tsx
export default function NewEntityContainer(): JSX.Element {
    const navigate = useNavigate();
    const { clubId } = useClubAccess();
    const [form, setForm] = useState<NewEntityFormState>(createDefaultForm);
    const [nameError, setNameError] = useState("");
    const createEntity = useCreateEntity(clubId ?? "");

    const handleSubmit = useCallback(
        (e: FormEvent) => {
            e.preventDefault();
            if (!validate()) return;
            createEntity.mutate(buildPayload(form, clubId), {
                onSuccess: () =>
                    void navigate({
                        to: "/entities",
                        search: { created: true, updated: undefined },
                    }),
            });
        },
        [form, clubId, createEntity, navigate]
    );

    const handleCancel = useCallback(
        () =>
            void navigate({ to: "/entities", search: { created: undefined, updated: undefined } }),
        [navigate]
    );

    return (
        <NewEntityView
            form={form}
            nameError={nameError}
            apiError={(createEntity.error as Error | null)?.message ?? ""}
            isPending={createEntity.isPending}
            onFormChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            onDismissError={() => createEntity.reset()}
        />
    );
}
```

**Route registration** (in `apps/web-staff/src/app/index.tsx`):

```tsx
const NewEntityPage = lazy(() => import("../features/entity/pages/NewEntityPage"));

const newEntityRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/entities/new",
    component: NewEntityPage,
});
```

---

### Edit page pattern

An edit page lives at `/entities/$entityId`. It is a separate sub-feature (`edit-entity/`).

**Key differences from create:**

- Container fetches the entity by ID with `useGetEntity(clubId, entityId)` via `useParams`
- Shows a loading spinner until data arrives and the form is initialised
- Form is pre-filled once data loads (use a `initialised` flag so it only populates once)
- Submit calls `useUpdateEntity`; navigates back with `?updated=true`
- Includes an **Active** status toggle (create always sets `is_active: true`)

**Container skeleton:**

```tsx
export default function EditEntityContainer(): JSX.Element {
    const navigate = useNavigate();
    const { entityId } = useParams({ strict: false }) as { entityId: string };
    const { clubId } = useClubAccess();
    const { data: entity, isLoading } = useGetEntity(clubId ?? "", entityId);
    const [form, setForm] = useState<EditEntityFormState>(createEmptyForm);
    const [initialised, setInitialised] = useState(false);

    useEffect(() => {
        if (entity && !initialised) {
            setForm(mapEntityToForm(entity));
            setInitialised(true);
        }
    }, [entity, initialised]);

    if (isLoading || !initialised) {
        return (
            <div className="flex items-center justify-center gap-3 py-32">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-cta" />
                <span className="text-sm text-muted-foreground">Loading…</span>
            </div>
        );
    }
    // ... handleSubmit + handleCancel same as create but calls useUpdateEntity
}
```

**Route registration:**

```tsx
const editEntityRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/entities/$entityId",
    component: EditEntityPage,
});
```

---

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

**List View component:**

- Loading state renders loading indicator
- Error state renders error message
- Empty state renders empty message and CTA
- Data state renders all items
- Header: Refresh button present and calls `onRefresh`
- Header: New Entity button present for admin, absent for non-admin
- Header: New Entity button calls `onCreateClick`
- Data: user events (Edit, Manage, etc.) call correct callbacks with correct arguments

**List Container component:**

- Loading/error/success state rendering matches View
- Refresh button calls `refetch` from domain hook
- New Entity button navigates to `/entities/new`
- Edit action navigates to `/entities/$entityId`
- Non-admin role does not show privileged buttons
- Success toast shown when returning with `?created=true` / `?updated=true`

**Create/Edit View component:**

- Page heading and breadcrumb render correctly
- All form section headings render
- Submit button label matches state: "Create Entity" / "Creating…" / "Save Changes" / "Saving…"
- Submit button disabled while `isPending`
- Validation errors display for each required field
- API error alert renders and dismiss calls `onDismissError`
- `onSubmit` called on form submit
- `onCancel` called on Cancel click
- `onFormChange` called with correct patch for each input

**Create Container component:**

- Renders page heading
- Validation: empty required fields show errors and do not call `mutate`
- Valid submit calls `mutate` with correct payload including `club_id`
- Navigates to list page with `?created=true` on success
- Cancel navigates to list page
- API error alert shown and dismiss calls `reset`
- isPending shows loading button label

**Edit Container component:**

- Shows loading spinner while `isLoading` is true
- Pre-fills form fields from fetched entity data
- Validation: cleared required field shows error and does not call `mutate`
- Valid submit calls `mutate` with correct payload
- Navigates to list page with `?updated=true` on success
- Cancel navigates to list page
- API error alert shown and dismiss calls `reset`

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
- [ ] `store/index.ts` — re-exports from domain package + access functions
- [ ] `store/access.ts` — all role-to-permission logic for the feature (no inline `role ===` comparisons in components)
- [ ] `types/index.ts` — re-exports domain models + feature-only types
- [ ] Every data-fetching component split into Container + View
- [ ] Pages are thin shells (no logic)
- [ ] `pages/` contains re-export files pointing to sub-feature pages
- [ ] No hardcoded colors (`bg-[#xxx]`, `text-amber-700`, etc.)
- [ ] No bare `<input type="number|time|date|datetime-local">` or `<select>` — use `NumberInput`, `TimeInput`, `DatePicker`, `DateTimePicker`, `SelectInput` from `@repo/ui`
- [ ] No cross-feature imports
- [ ] No imports from `@repo/api-client` inside features
- [ ] No `process.env` / `import.meta.env` access (use `@repo/config`)
- [ ] File count per sub-feature ≤ 10 source files
- [ ] All components ≤ 200 lines

**Header:**

- [ ] List header uses `card-surface overflow-hidden` + `px-5 py-5 sm:px-6` header padding
- [ ] Refresh button present with `aria-label="Refresh <entities>"`
- [ ] New button navigates to `/entities/new` (never opens a modal)
- [ ] New button gated by role check (`canManage`)

**Create / Edit pages:**

- [ ] `/entities/new` route registered in `app/index.tsx`
- [ ] `/entities/$entityId` route registered in `app/index.tsx`
- [ ] Create/Edit breadcrumb links back to list: `[{ label: "Entities", href: "/entities" }, { label: "New Entity" }]`
- [ ] On success, navigate with `?created=true` or `?updated=true`; list container reads and clears the flag
- [ ] Edit container initialises form from fetched data with `initialised` guard
- [ ] Edit form includes Active status toggle; Create always sets `is_active: true`

**Tests:**

- [ ] View component test file exists for every View
- [ ] Container component test file exists for every Container
- [ ] Utility/constants test file exists for every constants/service file
- [ ] Tests use `getByRole`, `getByText`, `getByLabelText` — not `getByTestId`
- [ ] Mocks defined with `vi.mock(...)` at module level
- [ ] Container tests mock `useNavigate` and assert navigation calls
- [ ] Container tests mock domain hooks with `vi.fn()` — never use real network calls

---

## Implemented features

| App         | Feature      | Sub-features                                                           | Domain package       |
| ----------- | ------------ | ---------------------------------------------------------------------- | -------------------- |
| `web-staff` | `club`       | `clubs-list`, `club-detail`                                            | `@repo/staff-domain` |
| `web-staff` | `court`      | `courts-list`                                                          | `@repo/staff-domain` |
| `web-staff` | `booking`    | `bookings-list`, `new-booking`, `manage-booking`                       | `@repo/staff-domain` |
| `web-staff` | `membership` | `membership-plans-list`, `new-membership-plan`, `edit-membership-plan` | `@repo/staff-domain` |
