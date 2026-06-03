_Last updated: 2026-06-03 18:30 UTC_

# Frontend Analytics Guide

How to build an analytics screen inside `web-staff`, using the **Club Utilisation** feature as the reference implementation.

This guide is analytics-specific. It assumes you already know the general feature rules in [`FE_FEATURE_LAYER_GUIDE.md`](FE_FEATURE_LAYER_GUIDE.md) and the domain rules in [`FE_DOMAIN_LAYER_GUIDE.md`](FE_DOMAIN_LAYER_GUIDE.md) — read those first. Everything below layers on top of them.

Analytics screens are **read-only dashboards**: a date range in, a set of KPIs / charts / tables out. There are no mutations, no create/edit pages, and no modals. That makes them simpler than the CRUD features described in the feature-layer guide, but they introduce two new concerns — **charts** and **range-based aggregation** — that this guide standardises.

---

## The analytics feature lives in one place

All staff analytics screens are sub-features of a single `analytics` feature:

```
apps/web-staff/src/features/analytics/
  hooks/index.ts                 # re-exports the analytics domain hooks
  store/
    index.ts                     # re-exports useClubAccess + access fns
    access.ts                    # canViewAnalytics(role) — owner/admin only
  types/index.ts                 # domain model re-exports + feature-only types
  components/
    DateRangeControl.tsx         # shared From/To pickers + dynamic range label (used by all sub-features)
  pages/                         # thin shells — one file per route (real components, NOT bare re-exports — see below)
    ClubUtilisationPage.tsx
    CourtUtilisationPage.tsx
    ClubUtilisationHeatmapPage.tsx
  club-utilisation/              # ← sub-feature (the reference)
    components/
      ClubUtilisationContainer.tsx
      ClubUtilisationView.tsx
      UtilisationKpiCards.tsx
      UtilisationLineChart.tsx
      GroupedBarChart.tsx          # grouped/series bar chart (revenue + slots)
      DailySummaryTable.tsx
      *.test.tsx
    pages/
      ClubUtilisationPage.tsx
    utilisationSummary.ts        # pure aggregation service (range totals)
    utilisationBuckets.ts        # pure time-bucketing service (daily/weekly/monthly)
    utilisationConstants.ts      # short-date/weekday formatters + shared class strings
    utilisationSummary.test.ts
    utilisationBuckets.test.ts
    utilisationConstants.test.ts
```

**Each analytics report is its own sub-feature** (`club-utilisation`, `court-utilisation`, `club-utilisation-heatmap`). Shared `hooks/`, `store/`, and `types/` sit at the `analytics/` root and are re-exported by every sub-feature. This keeps each sub-feature under the 10-source-file limit and lets reports share the access rule and date-range types without cross-feature imports.

---

## The data flow (one report = one query)

```
Sidebar link (routeConfig.ts)
  → route /analytics/<report> (app/index.tsx, gated by requireRole(["owner","admin"]))
    → <Report>Page (thin shell)
      → <Report>Container         ← owns date-range state, calls the domain hook
        → computeXSummary(points)  ← pure aggregation (service)
        → <Report>View            ← pure rendering: KPIs + charts + table
```

The domain hooks already exist in `@repo/staff-domain/hooks`:

| Hook                        | Endpoint                            | Returns                  |
| --------------------------- | ----------------------------------- | ------------------------ |
| `useClubDailyUtilisation`   | `getClubDailyUtilisationEndpoint`   | `ClubDailyUtilisation`   |
| `useClubCourtsUtilisation`  | `getClubCourtsUtilisationEndpoint`  | `ClubCourtsUtilisation`  |
| `useClubUtilisationHeatmap` | `getClubUtilisationHeatmapEndpoint` | `ClubUtilisationHeatmap` |

All three take `(clubId, { dateFrom, dateTo })`. A new report should reuse one of these, or — if a new endpoint is needed — add it in `@repo/api-client` and `@repo/staff-domain` **first** (see the API-client and domain guides), then consume it here. **Never call `fetcher` or build query strings inside the feature.**

---

## Step 1 — `hooks/index.ts`, `store/`, `types/`

Re-export only. The analytics root already has these — a new sub-feature reuses them:

```ts
// analytics/hooks/index.ts
export {
    useClubDailyUtilisation,
    useClubCourtsUtilisation,
    useClubUtilisationHeatmap,
} from "@repo/staff-domain/hooks";
```

```ts
// analytics/store/access.ts — single source of truth for the role gate
import type { TenantUserRole } from "@repo/auth";

const VIEW_ANALYTICS_ROLES: TenantUserRole[] = ["owner", "admin"];

export function canViewAnalytics(role: TenantUserRole | null): boolean {
    return role !== null && VIEW_ANALYTICS_ROLES.includes(role);
}
```

```ts
// analytics/store/index.ts
export { useClubAccess } from "@repo/staff-domain/store";
export { canViewAnalytics } from "./access";
```

`types/index.ts` re-exports the domain models the reports consume and defines feature-only shapes — the local date-range picker state and the computed summary type:

```ts
export type {
    DailyUtilisationPoint,
    ClubDailyUtilisation,
    UtilisationDateRange,
} from "@repo/staff-domain/models";

/** Local date-range state for the picker. Both fields are "YYYY-MM-DD". */
export type DateRange = { from: string; to: string };

/** Aggregate figures computed across every day in the selected range. */
export type UtilisationSummary = {
    totalSlots: number;
    bookedSlots: number;
    avgUtilisationPct: number; // booked / total × 100, slot-weighted
    revenueActual: number;
    revenuePotential: number;
    revenueOpportunity: number; // potential − actual, clamped ≥ 0
    revenueOpportunityPct: number;
    isSingleDay: boolean; // range resolves to exactly one snapshot day
    dayCount: number;
};
```

> The domain `UtilisationDateRange` uses `{ dateFrom, dateTo }` (it maps to the API's `date_from` / `date_to`). The feature-local `DateRange` uses `{ from, to }` for the picker. The container is the only place that converts between them.

---

## Step 2 — The aggregation service (pure, tested)

Range-based reports must show **range totals** when several days are selected and a **single day's figures** when one day is selected. Put this logic in a pure function in the sub-feature root — never inside a component, and never as an inline `useMemo` body.

```ts
// club-utilisation/utilisationSummary.ts
export function computeUtilisationSummary(points: DailyUtilisationPoint[]): UtilisationSummary {
    const totalSlots = sumBy(points, (p) => p.total_slots);
    const bookedSlots = sumBy(points, (p) => p.booked_slots);
    // ...
    const avgUtilisationPct = totalSlots > 0 ? (bookedSlots / totalSlots) * 100 : 0;
    // ...
    return { /* ... */ isSingleDay: points.length === 1, dayCount: points.length };
}

// sumBy coerces via Number() because the API returns decimal fields
// (revenue_actual, revenue_potential, utilisation_pct) as strings.
function sumBy(
    points: DailyUtilisationPoint[],
    pick: (p: DailyUtilisationPoint) => number | string
): number {
    return points.reduce((acc, p) => {
        const v = Number(pick(p));
        return acc + (Number.isFinite(v) ? v : 0);
    }, 0);
}
```

**Two rules this function enforces — copy them into any new report:**

1. **Slot-weighted utilisation, never an average of percentages.** Compute `bookedSlots / totalSlots`, not `mean(point.utilisation_pct)`. A day with 100 slots must count more than a day with 10. Averaging the per-day percentages silently distorts the headline number.
2. **Guard every divisor.** When `total_slots === 0` (a closed day, a club with no courts yet, an empty range) return `0`, never `NaN`. `revenueOpportunityPct` is likewise `0` when actual revenue is `0`. **This is the single most important correctness rule in analytics** — `0/0` is the default-looking edge case that ships broken.

These functions are trivial to unit-test and **must** be (zero/empty input, single day, multi-day, zero-slots, revenue-over-potential). See `utilisationSummary.test.ts`.

---

## Step 3 — The Container

The container owns date-range state and nothing else visual. The **default range is the last 30 calendar days** (`to` is yesterday, `from` is 29 days before `to`, inclusive — today's data is incomplete so the range ends yesterday). It reads `clubId` from `useClubAccess`, calls the hook, runs the aggregation service, derives a human label, and hands everything to the View.

```tsx
function formatLocalDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
        date.getDate()
    ).padStart(2, "0")}`;
}

function defaultRange(): DateRange {
    const toDate = new Date();
    toDate.setDate(toDate.getDate() - 1); // yesterday — today's data is incomplete
    const fromDate = new Date(toDate);
    fromDate.setDate(toDate.getDate() - 29); // 30 days inclusive
    return { from: formatLocalDate(fromDate), to: formatLocalDate(toDate) };
}

export default function ClubUtilisationContainer(): JSX.Element {
    const { clubId } = useClubAccess();
    const [range, setRange] = useState<DateRange>(() => defaultRange());

    const { data, isLoading, error, refetch } = useClubDailyUtilisation(clubId ?? "", {
        dateFrom: range.from,
        dateTo: range.to,
    });

    const points = useMemo(() => (data as ClubDailyUtilisation | undefined)?.points ?? [], [data]);
    const summary = useMemo(() => computeUtilisationSummary(points), [points]);
    const rangeLabel = useMemo(
        () =>
            range.from === range.to
                ? formatShortDate(range.from)
                : `${formatShortDate(range.from)} – ${formatShortDate(range.to)}`,
        [range]
    );

    return (
        <ClubUtilisationView
            range={range}
            rangeLabel={rangeLabel}
            points={points}
            summary={summary}
            isLoading={isLoading}
            error={(error as Error | null) ?? null}
            onRangeChange={setRange}
            onRefresh={() => void refetch()}
        />
    );
}
```

**Container conventions for analytics:**

- Default range = last 30 calendar days (`to` is yesterday, `from` is 29 days before `to`, inclusive). Pass the day count as a constant so it is easy to change per-report without touching shared code.
- `clubId ?? ""` — the hook is `enabled: Boolean(clubId)`, so an empty club id simply yields no query rather than crashing.
- Derive `points` and `summary` with `useMemo` so charts don't recompute on unrelated re-renders.
- Pass a single `range` object + an `onRangeChange(range)` setter. Range state lives **only** here.

> **Date-range filters are local state, not URL state.** The feature-layer guide's URL-persistence pattern is for list→detail→back navigation. Analytics dashboards have no detail page to navigate to, so persisting the range in the URL adds no value. Keep it in `useState`. (If a future report links out to a drill-down, revisit this and follow the URL-persistence pattern then.)

---

## Step 4 — The View: KPIs → charts → table

The View is pure rendering. It receives `range`, `rangeLabel`, `points`, `summary`, `isLoading`, `error`, and the two callbacks. It renders, in order:

1. **Header** — title, subtitle, the shared `DateRangeControl` (from `analytics/components/DateRangeControl`), a Refresh button (`aria-label="Refresh analytics"`).
2. **State branches** — `error` → alert; `isLoading` → spinner; `points.length === 0` → empty state; otherwise the dashboard.
3. **KPI cards** (`UtilisationKpiCards`) — Total Slots, Booked Slots, (Average) Utilisation, Revenue actual / potential.
4. **A zero-slots warning banner** when `summary.totalSlots === 0` but data exists.
5. **Charts row** — daily-utilisation line chart + the actual-vs-potential revenue **grouped bar chart** (one Actual/Potential pair per time bucket, with its revenue-opportunity callout) side by side.
6. **Total vs Booked Slots** — a full-width `GroupedBarChart` of total-vs-booked slots, one pair per time bucket.
7. **Daily summary table** with a Total / Avg column.

Both bar charts are **time-bucketed** and carry a granularity selector — see the granularity section in Step 5.

### Single-day vs multi-day copy

The View adapts labels off `summary.isSingleDay`:

| Element            | Multi-day               | Single day     |
| ------------------ | ----------------------- | -------------- |
| Utilisation KPI    | "Average Utilisation"   | "Utilisation"  |
| KPI caption        | "Across selected dates" | "Selected day" |
| Chart subtitle     | "Range total"           | "Selected day" |
| Summary table head | "Daily Summary"         | "Day Summary"  |

### Every async UI state is mandatory

Loading, error, **and** empty must each render. The empty state ("No data for this period") is distinct from the zero-slots banner: empty = the API returned no snapshot rows; zero-slots = rows exist but `total_slots` sums to 0 (so percentages are meaningless and we say so instead of printing `NaN%` or a misleading `0%` without context).

---

## Step 5 — Charts: hand-rolled SVG, no charting library

**`web-staff` has no charting dependency (no recharts, no chart.js) and we are not adding one.** Charts are small, self-contained SVG components that live in the sub-feature's `components/`. This matches the existing `SkillLineChart` in `@repo/ui` and keeps the bundle lean. A chart component:

- Takes already-shaped data as props (the container/service does the math; the chart only positions).
- Renders an explicit **"No data" / "No data to display"** branch when its input is empty or its max value is `0`.
- Uses a fixed `viewBox` and `width="100%" height="100%"` so it scales to its panel.
- Colours fills/strokes with **`hsl(var(--token))`**, never a hex literal and never `var(--color-…)`. The design tokens are HSL triplets (`--cta: 221 83% 53%`), so the correct form is `hsl(var(--cta))` or `hsl(var(--muted-foreground) / 0.45)` for an alpha variant. Axis labels and gridlines use Tailwind `className` with `fill-*`/`text-*` tokens.

The reference feature ships two reusable chart primitives:

| Component              | Use                                                              | Shape of `data`           |
| ---------------------- | ---------------------------------------------------------------- | ------------------------- |
| `UtilisationLineChart` | Daily utilisation %, one point per snapshot day, 0–100 axis      | `DailyUtilisationPoint[]` |
| `GroupedBarChart`      | N series compared side by side within each group (a time bucket) | `groups[]` + `series[]`   |

`GroupedBarChart` is deliberately generic — it drives **both** the Actual-vs-Potential **revenue** chart and the Total-vs-Booked **slots** chart from the same component. **Prefer one generic chart over two near-identical ones.** When you add a report, check whether these primitives already cover it before writing a new SVG; only build a new primitive for a genuinely new shape (e.g. the heatmap grid).

`GroupedBarChart` takes `groups: string[]` (one x-axis label per bucket) and `series: GroupedSeries[]`, where each series has a `key`, `label`, `color`, a `values[]` aligned to `groups`, and a **pre-formatted** `display[]` (the labels drawn above each bar — `"£2,860"`, `"350"`). It draws a real **y-axis**: it rounds the largest value up to a tidy ceiling (`niceCeil`), lays out evenly-spaced dashed gridlines, and labels each tick. Props:

- `showLegend` — renders a colour-keyed legend above the plot (each series' `label` + `color`).
- `formatTick(value) => string` — formats the y-axis tick labels. Defaults to a locale-grouped integer (`"50"`), so the **slots** chart passes nothing; the **revenue** chart passes `formatTick={(v) => formatCurrency(v)}` to get `£0 / £150 / …`. The tick formatter and `display[]` are the **only** number formatting near the chart — formatting happens in the View (via `formatCurrency`), never inside the chart.
- `showValueLabels` — draws the `display` value above each bar (as in the mock). Defaults **on** when there are few enough groups to stay legible and **off** beyond that; pass it explicitly to force either way.

### Time-bucket granularity (daily / weekly / monthly)

A range of more than a week is unreadable as one-bar-per-day, so both bar charts **aggregate the daily points into buckets**. The bucketing is a pure, tested service — `utilisationBuckets.ts` — never inline in a component:

- `bucketPoints(points, granularity)` → `UtilisationBucket[]`, summing slots and revenue per bucket and returning them in chronological order. `daily` is a pass-through (one bucket per point) so the View has a single code path. Weeks are **Monday-anchored**; months are calendar months. Labels: `"1 Apr"` (daily) · `"30 Mar – 5 Apr"` (weekly) · `"Apr"` (monthly).
- `defaultGranularity(dayCount)` → the auto default: **≤ 7 days daily, ≤ 30 days weekly, otherwise monthly**.
- `availableGranularities(dayCount)` → what the selector offers: a single snapshot day offers nothing (one bar regardless); any multi-day range offers the full `daily → weekly → monthly` set so the user can keep the readable default or coarsen.

In the View, each chart owns a `Granularity | null` `useState` (UI-only state, so `useState` not Zustand — see the state rules). `null` means "follow the auto default", so the chart re-defaults when the range changes until the user explicitly overrides it; a non-null value is the override. Resolve with `granularity ?? defaultGranularity(points.length)`, run `bucketPoints`, then map buckets to the chart's `groups` + `series`. Render the selector with `SelectInput` from `@repo/ui` (only when `availableGranularities(...).length > 1`), `aria-label="… chart granularity"`. The same dates flow through `bucketOf`, which uses `Date.UTC` so weekday/month lookups never shift across timezones (see Step 6).

---

## Step 6 — Formatting

| Need                         | Use                                                       | Never                                   |
| ---------------------------- | --------------------------------------------------------- | --------------------------------------- |
| Money (`£2,860.00`)          | `formatCurrency` from `@repo/ui`                          | inline `Intl.NumberFormat` / `.toFixed` |
| Axis / table date ("25 May") | `formatShortDate` (sub-feature `utilisationConstants.ts`) | `toLocaleDateString` (timezone shift)   |
| Weekday ("Mon")              | `formatWeekday` (uses `Date.UTC` — no shift)              | `new Date(s).getDay()` on a local date  |
| Percentages                  | `value.toFixed(1) + "%"`, gated on `total > 0`            | printing an unguarded ratio             |

`snapshot_date` values are plain `YYYY-MM-DD` calendar dates (no time, no zone). Formatting them through the browser's `Date` constructor and `toLocaleDateString` shifts them by the local offset and can show the wrong day. The sub-feature's `formatShortDate` / `formatWeekday` parse the string parts directly (and use `Date.UTC` only for weekday lookup), so the day never moves. The `@repo/ui` `formatUTCDate` helper is for ISO _datetimes_ from the API; for bare snapshot dates the sub-feature formatters are correct.

The month/weekday abbreviation arrays themselves are **not** redefined per sub-feature. `MONTHS_SHORT` and `WEEKDAYS_SHORT` are exported from `@repo/ui` (`utils/datetime.ts`) — the same place `formatUTCDate` etc. live — and `utilisationConstants.ts` imports them. Any new report (or non-analytics feature) that needs short month/weekday labels imports them from `@repo/ui`; never copy the literal arrays into a feature again.

Utilisation-percentage badges in the table are bucketed by `utilisationTone(pct)` → `success` (≥60) / `warning` (≥40) / `muted` (<40), rendered with `bg-success/15 text-success` etc. — semantic tokens only.

---

## Step 7 — Routing and the sidebar

Three things must agree, or the page silently 404s or shows a stub:

1. **`apps/web-staff/src/config/routeConfig.ts`** — the sidebar entry: `path: "/analytics/<report>"`, label, icon, role gate.
2. **`apps/web-staff/src/app/index.tsx`** — a `createRoute` with the **same** path, `beforeLoad: requireRole(["owner", "admin"])`, a lazily-imported page component, and the route added to `dashboardLayoutRoute.addChildren([...])`.
3. **The page file** the route lazy-imports.

```tsx
// app/index.tsx
const ClubUtilisationPage = lazy(() => import("../features/analytics/pages/ClubUtilisationPage"));

const clubUtilisationRoute = createRoute({
    getParentRoute: () => dashboardLayoutRoute,
    path: "/analytics/club-utilisation",
    beforeLoad: requireRole(["owner", "admin"]),
    component: ClubUtilisationPage,
});
// …and add clubUtilisationRoute to the dashboardLayoutRoute.addChildren([...]) array.
```

### ⚠️ Pages must be real thin-shell components, not bare re-exports

The top-level page (the file the route lazy-imports) must be a **concrete component**:

```tsx
// ✅ analytics/pages/ClubUtilisationPage.tsx
import type { JSX } from "react";
import ClubUtilisationContainer from "../club-utilisation/components/ClubUtilisationContainer";

export default function ClubUtilisationPage(): JSX.Element {
    return <ClubUtilisationContainer />;
}
```

```tsx
// ❌ Do NOT use a bare default re-export for a lazy-loaded route page
export { default } from "../club-utilisation/pages/ClubUtilisationPage";
```

A bare `export { default } from "…"` works for ordinary imports, but combined with `React.lazy` + Vite HMR it can leave the route resolving to a **stale cached module** (symptom: the old "… — coming soon" stub keeps rendering after you've implemented the page). Giving the route a concrete module to track avoids this. If you ever do hit a stale page, also clear the dev cache: `rm -rf apps/web-staff/node_modules/.vite` and restart `pnpm --filter web-staff dev`.

> The feature-layer guide shows `export { default } from …` for top-level `pages/`. That is fine for components imported eagerly; for the **lazy route entry** of an analytics screen, use the concrete-component form above.

---

## Step 8 — Tests (required)

Same testing rules as every feature ([`FE_FEATURE_LAYER_GUIDE.md`](FE_FEATURE_LAYER_GUIDE.md) Step 7). Analytics-specific required cases:

**Aggregation service (`utilisationSummary.test.ts`)** — the highest-value tests:

- empty input → all zeros, `isSingleDay: false`
- single day → `isSingleDay: true`, `dayCount: 1`
- multi-day → slots and revenue summed
- **slot-weighted utilisation** ≠ mean of per-day percentages
- **`total_slots === 0` → `0`, never `NaN`**
- revenue opportunity clamps negatives to `0`

**Bucketing service (`utilisationBuckets.test.ts`)** — also high-value:

- `defaultGranularity` thresholds (7 → daily, 8/30 → weekly, 31 → monthly)
- `availableGranularities` (1 day → `["daily"]`; multi-day → full set)
- `bucketPoints` daily pass-through, **Monday-anchored** weekly grouping, calendar-month grouping, string-decimal coercion, chronological order

**Constants (`utilisationConstants.test.ts`)** — `formatShortDate`, `formatWeekday` (assert no timezone drift), `utilisationTone` buckets.

**View** — mock `@repo/ui` (`formatCurrency`, `SelectInput`, `DatePicker`); assert title + the chart sections render, loading/error/empty branches, the zero-slots banner, single-day vs multi-day copy, the revenue-opportunity callout, the **granularity selector** (present for multi-day, hidden for a single day, defaults to the range-length default), and that Refresh / date-change fire their callbacks. Avoid asserting on text that appears in more than one place (e.g. the word "Utilisation" is both a KPI label and a chart legend — assert on something unique like "Average Utilisation" / "Day Summary" instead).

**Container** — mock the domain hook and `useClubAccess`; assert the default range is the last 7 calendar days, the hook is called with `clubId` + `{ dateFrom, dateTo }`, points are forwarded, Refresh calls `refetch`, the range label updates on range change, and a missing club id passes `""`. Mock the View to capture props rather than rendering the full SVG tree.

Run them:

```bash
pnpm --filter web-staff test -- --run src/features/analytics
pnpm --filter web-staff type-check
pnpm --filter web-staff lint
```

---

## Checklist — new analytics report

- [ ] Sub-feature folder `analytics/<report>/` with `components/`, `pages/`, a pure summary service, and a constants file
- [ ] Reuses root `analytics/hooks`, `analytics/store`, `analytics/types` (no new cross-feature imports)
- [ ] Domain hook already exists in `@repo/staff-domain/hooks` (add via api-client + domain guides first if not)
- [ ] Container owns date-range state; **default range = last 30 calendar days** (`to` = yesterday, `from` = 29 days before)
- [ ] Aggregation is a pure, unit-tested function — **slot-weighted, divide-by-zero guarded**
- [ ] View renders loading **and** error **and** empty states
- [ ] Single-day vs multi-day copy switches on `summary.isSingleDay`
- [ ] Zero-slots (`total_slots === 0`) shows an explanatory banner, never `NaN%`
- [ ] Charts are hand-rolled SVG (no charting library); reuse `GroupedBarChart` / `UtilisationLineChart` where the shape fits
- [ ] Multi-bar charts bucket the range with `bucketPoints` (pure, tested) and expose a granularity selector defaulting to `defaultGranularity(dayCount)`
- [ ] Chart colours use `hsl(var(--token))`; labels use `fill-*`/`text-*` tokens — no hex, no `var(--color-…)`
- [ ] `formatCurrency` for money; `formatShortDate`/`formatWeekday` for snapshot dates (no `toLocaleDateString`)
- [ ] `DatePicker` from `@repo/ui` with `className="input-base"` — never a bare `<input type="date">`
- [ ] Route registered in `app/index.tsx` (path matches `routeConfig.ts`) and added to `dashboardLayoutRoute.addChildren`
- [ ] Role gate `requireRole(["owner", "admin"])` on the route; `canViewAnalytics` in `access.ts`
- [ ] **Top-level page is a concrete thin-shell component, not a bare `export { default } from …`** (avoids stale-lazy-module HMR bug)
- [ ] Tests for service, constants, View, and Container; `type-check` + `lint` clean

---

## Implemented analytics reports

| Sub-feature                | Route                                 | Domain hook                                                                   | Status   |
| -------------------------- | ------------------------------------- | ----------------------------------------------------------------------------- | -------- |
| `club-utilisation`         | `/analytics/club-utilisation`         | `useClubDailyUtilisation`                                                     | ✅ Built |
| `court-utilisation`        | `/analytics/court-utilisation`        | `useClubCourtsUtilisation`                                                    | ⬜ Stub  |
| `club-utilisation-heatmap` | `/analytics/club-utilisation-heatmap` | `useClubUtilisationHeatmap`                                                   | ⬜ Stub  |
| `player-value`             | `/analytics/player-value`             | `usePlayerValueLeaderboard` + `useMostActivePlayers` + `useInactiveMembers`   | ✅ Built |
| `player-segments`          | `/analytics/player-segments`          | `usePlayerValueByGroup`                                                       | ✅ Built |
| `player-activity`          | `/analytics/player-activity`          | `useActivePlayersKpi` + `useActivePlayersTimeseries` + `useSignupsTimeseries` | ✅ Built |
