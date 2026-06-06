_Last updated: 2026-06-06 00:00 UTC_

# Frontend Datetime & Currency Standard

This document defines the frontend standards for formatting and displaying datetime and currency values across all SmashBook apps (`web-staff`, `web-player`, `web-admin`, `mobile-player`).

---

## Guiding principles

1. **Backend is the source of truth.** The frontend never computes, converts, or adjusts datetime or currency values — it renders what it receives.
2. **No timezone mutations.** The frontend never converts UTC values into the browser's local timezone. All datetimes must be parsed and displayed as-is.
3. **No hardcoded currency.** The frontend never hardcodes `GBP`, `£`, or any currency symbol. The currency code always comes from the API response.
4. **One utility, one import path.** All datetime and currency helpers live in `@repo/ui`. Feature code never defines its own formatting functions.

---

## Part 1 — Datetime Handling

### 1.1 How the backend sends datetimes

The backend sends datetimes in three forms:

| Form                                        | Example                  | When used                                                                        |
| ------------------------------------------- | ------------------------ | -------------------------------------------------------------------------------- |
| ISO 8601 datetime with `Z` suffix           | `"2026-04-17T10:00:00Z"` | Booking `start_datetime`, `end_datetime`, `created_at`, wallet `created_at`      |
| ISO 8601 datetime without offset            | `"2026-04-17T10:00:00"`  | Some legacy or internal fields                                                   |
| Plain time string `"HH:MM"` or `"HH:MM:SS"` | `"09:00"`, `"21:30:00"`  | Operating hours `open_time`, `close_time`, pricing rule `start_time`, `end_time` |
| Plain date string `"YYYY-MM-DD"`            | `"2026-04-17"`           | Filter params, `valid_from`, `valid_until`, calendar `date`                      |

**The backend does not apply timezone conversion before sending.** All datetime values represent club-local time that has been stored as a fixed string. The frontend must display the digits it receives — it must not pass them through `new Date()` or any browser API that would shift by the local timezone offset.

### 1.2 The timezone problem

When a browser parses an ISO string through `new Date()` or `Date.toLocaleString()`, it interprets the value in the browser's local timezone. A club in London that stores `10:00` will display `02:00` to a user in Los Angeles. This is always wrong: SmashBook displays the time at the club, not the user's local time.

```ts
// ❌ WRONG — shifts to browser local timezone
new Date("2026-04-17T10:00:00Z").toLocaleTimeString(); // "02:00:00 AM" in LA
new Date("2026-04-17T10:00:00Z").toLocaleDateString(); // "Apr 16, 2026"  in LA

// ❌ WRONG — Date constructor treats bare datetime as local, not UTC
new Date("2026-04-17T10:00:00").toISOString(); // shifts by TZ offset

// ✅ CORRECT — parse the string digits directly, no timezone involved
formatUTCDateTime("2026-04-17T10:00:00Z"); // "Apr 17, 2026, 10:00 AM"
formatUTCDate("2026-04-17T10:00:00Z"); // "Apr 17, 2026"
formatUTCTime("2026-04-17T10:00:00Z"); // "10:00 AM"
```

### 1.3 Available helpers (import from `@repo/ui`)

```ts
import {
    formatUTCDateTime,
    formatUTCDate,
    formatUTCTime,
    formatPlainTime,
    datetimeLocalToApi,
} from "@repo/ui";
```

| Helper               | Input                | Output                     | When to use                                                                         |
| -------------------- | -------------------- | -------------------------- | ----------------------------------------------------------------------------------- |
| `formatUTCDateTime`  | ISO string           | `"Apr 17, 2026, 10:00 AM"` | Full date + time display (booking details, calendar tooltip)                        |
| `formatUTCDate`      | ISO string           | `"Apr 17, 2026"`           | Date-only display (booking list rows, filters)                                      |
| `formatUTCTime`      | ISO string           | `"10:00 AM"`               | Time-only display (calendar slots, booking start/end)                               |
| `formatPlainTime`    | `"HH:MM"` string     | `"10:00 AM"`               | Operating hours, pricing rule times — these are already plain time strings, not ISO |
| `datetimeLocalToApi` | `"YYYY-MM-DDTHH:mm"` | `"2026-04-17T10:00:00"`    | Converts `<input type="datetime-local">` value before sending to API                |

### 1.4 Input handling

When the user enters a date or time in a form:

- Use `DatePicker`, `TimeInput`, or `DateTimePicker` from `@repo/ui` — never bare `<input type="date">`, `<input type="time">`, or `<input type="datetime-local">`.
- `DatePicker` yields a `"YYYY-MM-DD"` string — send it as-is to the API.
- `TimeInput` yields a `"HH:MM"` string — send it as-is to the API.
- `DateTimePicker` yields a `"YYYY-MM-DDTHH:mm"` string. Before sending to the API, convert it with `datetimeLocalToApi(value)` to produce `"YYYY-MM-DDTHH:mm:00"`. No `Z` is appended — the backend applies its own timezone handling, so the wall-clock time is sent as-is.

```tsx
// ✅ CORRECT — convert datetime-local to the API datetime string (no Z)
import { datetimeLocalToApi } from "@repo/ui";

const payload = {
    start_datetime: datetimeLocalToApi(form.start_datetime), // "2026-04-17T10:00:00"
};

// ❌ WRONG — shifts by the browser's local TZ offset
const payload = {
    start_datetime: new Date(form.start_datetime).toISOString(),
};
```

### 1.5 Mapper layer (form pre-fill only)

When an ISO datetime from the API must pre-fill a `DateTimePicker` (a `"YYYY-MM-DDTHH:mm"` input), strip the timezone suffix in the **mapper** — not in the component.

```ts
// packages/staff-domain/mappers/club.mapper.ts
function toDatetimeLocal(iso: string): string {
    const stripped = iso.replace("Z", "").replace(/[+-]\d{2}:\d{2}$/, "");
    return stripped.slice(0, 16); // "YYYY-MM-DDTHH:mm"
}
```

**Rule:** this conversion happens at the domain layer boundary (mapper), not inside a View or Container. The domain model documents fields that store a datetime-local string by noting `// stored as datetime-local ("YYYY-MM-DDTHH:mm") after mapping from ISO`.

### 1.6 Quick reference — display vs send

| Situation                              | Correct approach                                |
| -------------------------------------- | ----------------------------------------------- |
| Display `start_datetime` from API      | `formatUTCDateTime(booking.start_datetime)`     |
| Display date only from API             | `formatUTCDate(booking.start_datetime)`         |
| Display time only from API             | `formatUTCTime(booking.start_datetime)`         |
| Display `open_time` / `close_time`     | `formatPlainTime(hours.open_time)`              |
| Pre-fill `DateTimePicker` from API ISO | Strip offset in mapper → `toDatetimeLocal(iso)` |
| Send `DateTimePicker` value to API     | `datetimeLocalToApi(form.start_datetime)`       |
| Send `DatePicker` value to API         | Send as-is (`"YYYY-MM-DD"`)                     |
| Send `TimeInput` value to API          | Send as-is (`"HH:MM"`)                          |

### 1.7 Dos and don'ts

**Do:**

- Import all datetime formatters from `@repo/ui`
- Use `formatUTCDateTime`, `formatUTCDate`, `formatUTCTime` for every ISO string display
- Use `formatPlainTime` for `"HH:MM"` operating hours and pricing rule time fields
- Strip timezone offset in the mapper layer before pre-filling a `DateTimePicker`
- Use `datetimeLocalToApi` before sending a `DateTimePicker` value to the API

**Don't:**

- Never call `new Date(isoString)` to parse a backend datetime
- Never call `.toLocaleString()`, `.toLocaleDateString()`, `.toLocaleTimeString()` on any API value
- Never call `new Date().toISOString()` to build an API payload from a form input
- Never define a local formatting function inside a feature file
- Never add a new formatter to a feature — add it to `packages/ui/utils/datetime.ts` instead

---

## Part 2 — Currency Handling

### 2.1 How the backend sends currency

The backend sends a `currency` field (ISO 4217 code, e.g. `"GBP"`, `"EUR"`, `"USD"`) alongside every monetary value. **The currency is always a separate field — it is never embedded in the amount.**

Key API response shapes that carry currency:

```ts
// Club — the primary source of currency for all club-scoped amounts
Club.currency: string                      // "GBP"

// Payment flows
PaymentIntent.currency: string             // "GBP"
WalletTopUp.currency: string               // "GBP"
Wallet.currency: string                    // "GBP"

// Revenue analytics — may be null when aggregating across different currencies
ClubRevenueSummary.currency: string | null
ClubRevenueTimeseries.currency: string | null
ClubRevenueComparisonRow.currency: string | null
```

**The `Club` model is the canonical currency source for all display within a club context.** All monetary amounts shown on staff-portal pages (booking prices, pricing rules, revenue) belong to a club and must use `club.currency`.

### 2.2 Available helper

```ts
import { formatCurrency } from "@repo/ui";
```

**Current signature:**

```ts
formatCurrency(amount: number | string | null | undefined): string
```

Returns `"—"` for `null`, `undefined`, or non-numeric input.

**Current limitation:** the helper is hardcoded to `GBP`. This must be migrated (see §2.4) before multi-currency support is required. Do not add new call sites that depend on the hardcoded currency.

### 2.3 Correct usage today

While the migration to dynamic currency is pending, always pass the currency code to `formatCurrency` even if the helper does not yet use it. This makes future migration a single signature change with no call-site rewrites.

```tsx
// ✅ CORRECT — pass currency alongside amount; ready for multi-currency
import { formatCurrency } from "@repo/ui";

<span>{formatCurrency(booking.total_price, club.currency)}</span>
<span>{formatCurrency(rule.price_per_slot, club.currency)}</span>
<span>{formatCurrency(wallet.balance, wallet.currency)}</span>

// ❌ WRONG — hardcodes £ inline
<span>£{booking.total_price?.toFixed(2)}</span>

// ❌ WRONG — uses Intl.NumberFormat directly in a feature component
<span>{new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(price)}</span>

// ❌ WRONG — uses .toFixed() directly
<span>{price.toFixed(2)}</span>
```

> **Note:** Until `formatCurrency` accepts a second `currency` argument, pass it anyway as a forward-compatibility annotation. The helper will accept and ignore it until the migration lands.

### 2.4 Required migration — dynamic currency

The following change must be applied to `packages/ui/utils/currency.ts` before any multi-currency club is onboarded:

```ts
// packages/ui/utils/currency.ts  (target signature)

/**
 * Formats a monetary amount using the provided ISO 4217 currency code.
 * Falls back to "GBP" only if currency is omitted — new call sites must always pass currency.
 * Returns "—" for null/undefined/invalid amounts.
 */
export function formatCurrency(
    amount: number | string | null | undefined,
    currency: string = "GBP" // TODO: remove default when all call sites pass currency
): string {
    if (amount == null) return "—";
    const numericAmount = typeof amount === "string" ? Number.parseFloat(amount) : amount;
    if (Number.isNaN(numericAmount)) return "—";
    return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
    }).format(numericAmount);
}
```

`Intl.NumberFormat` with `style: "currency"` automatically selects the locale-appropriate symbol and placement (e.g. `£50.00`, `€50,00`, `$50.00`) — no manual symbol injection is needed.

### 2.5 Where currency comes from in practice

| Context                                       | Currency source                                                                                            |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Staff portal (booking, pricing rules, courts) | `useClubAccess().club.currency` or `club.currency` from `useGetClub`                                       |
| Revenue analytics                             | `ClubRevenueSummary.currency` / `ClubRevenueTimeseries.currency` — may be `null` for cross-club aggregates |
| Player portal (payment intent, wallet)        | `PaymentIntent.currency` / `Wallet.currency`                                                               |
| Cross-club tenant revenue comparison          | Each row has its own `ClubRevenueComparisonRow.currency`                                                   |

**For cross-club aggregates where `currency` is `null`:** do not display a formatted amount. Show `"—"` or a raw number with an explanatory note ("mixed currencies"). Never fall back to `"GBP"` silently.

### 2.6 Container / View currency pattern

Containers pass the currency code down to Views as a prop. Views never call `useClubAccess()` or any hook to resolve currency — they receive it as a typed prop.

```tsx
// Container
const { club } = useClubAccess();

return (
    <BookingDetailView
        booking={booking}
        currency={club.currency} // ← pass currency explicitly
    />
);

// View prop type
type Props = {
    booking: Booking;
    currency: string;
};

// View rendering
<span>{formatCurrency(booking.total_price, currency)}</span>;
```

### 2.7 Dos and don'ts

**Do:**

- Always import `formatCurrency` from `@repo/ui`
- Always pass `currency` to `formatCurrency` (even while the default is still `"GBP"`)
- Use `club.currency` (from the `Club` model) as the primary currency source in club-scoped pages
- Pass currency down from Container to View as a typed prop
- Use `Intl.NumberFormat` only inside `packages/ui/utils/currency.ts` — never in feature code

**Don't:**

- Never hardcode `"GBP"`, `"£"`, `"€"`, or any currency symbol in a feature component
- Never use `.toFixed(2)` to format a monetary display value
- Never use `Intl.NumberFormat` directly inside a feature component
- Never fall back to a hardcoded currency when the API returns `null` — show `"—"` instead
- Never define a local currency helper inside a feature folder

---

## Part 3 — Architecture and Utility Location

### 3.1 Where utilities live

| Utility type                           | File                                    | Import path                |
| -------------------------------------- | --------------------------------------- | -------------------------- |
| Datetime formatters + parsers          | `packages/ui/utils/datetime.ts`         | `@repo/ui`                 |
| Currency formatter                     | `packages/ui/utils/currency.ts`         | `@repo/ui`                 |
| DTO → domain model datetime transforms | `packages/*-domain/mappers/*.mapper.ts` | Internal to domain package |

**Rule:** never add a datetime or currency utility to a feature folder (`apps/*/features/`) or to a domain package hooks/services file. Utilities belong in `@repo/ui`; DTO transforms belong in domain mappers.

### 3.2 Adding a new utility

If a formatter is needed that `@repo/ui` does not yet export:

1. Add the function to `packages/ui/utils/datetime.ts` or `packages/ui/utils/currency.ts`.
2. Ensure it is exported from `packages/ui/index.ts` (via `export * from "./utils/datetime"` / `export * from "./utils/currency"`).
3. Import it in the feature via `@repo/ui`.

Never build a one-off formatter inside a feature. If a formatter is needed once, it will be needed again.

### 3.3 Mobile (`mobile-player`)

The same helpers from `@repo/ui` apply to React Native components — `@repo/ui` is a shared package available to the mobile app. Do not implement separate datetime or currency formatters in `apps/mobile-player/`.

---

## Part 4 — Future Multi-Timezone Support

SmashBook is a multi-club SaaS platform. Clubs in different countries will have different local times. The current approach — display the digits exactly as the backend sends them — is intentionally forward-compatible:

- The backend stores and returns club-local time as a fixed string. When a club in Madrid stores `10:00`, that is `10:00 Madrid time`, and the backend returns `10:00`.
- The frontend displays `10:00` — correct for any viewer, anywhere.
- If the platform evolves to show times in a viewer's local timezone (e.g. "10:00 Madrid / 09:00 London"), the backend will add an explicit offset field to the API response. The frontend will use that offset explicitly — it will not infer it from `new Date()`.

**The safe rule to follow now:** treat every datetime string as an opaque, timezone-free label. Pass it to a `formatUTC*` helper. Never let JavaScript's `Date` object touch it.

---

## Checklist — datetime and currency in new features

**Datetime:**

- [ ] All ISO datetime displays use `formatUTCDateTime`, `formatUTCDate`, or `formatUTCTime` from `@repo/ui`
- [ ] All `"HH:MM"` time-only displays use `formatPlainTime` from `@repo/ui`
- [ ] `DateTimePicker` values are converted with `datetimeLocalToApi` before sending to the API
- [ ] ISO → datetime-local conversion for form pre-fill lives in the domain mapper, not the component
- [ ] No `new Date(isoString)` calls in feature components
- [ ] No `.toLocaleString()`, `.toLocaleDateString()`, `.toLocaleTimeString()` calls anywhere

**Currency:**

- [ ] All monetary amounts displayed via `formatCurrency(amount, currency)` from `@repo/ui`
- [ ] `currency` prop passed explicitly from Container to View
- [ ] `club.currency` used as the source for all club-scoped amounts
- [ ] No hardcoded `"GBP"`, `"£"`, `"€"` in any feature component
- [ ] No `.toFixed()` on monetary values
- [ ] No inline `Intl.NumberFormat` in any feature component
- [ ] Cross-club `null` currency shown as `"—"`, not silently defaulted
