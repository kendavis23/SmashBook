_Last updated: 2026-05-30 14:30 UTC_

# Mobile Player Development Guide

Quick reference for AI-assisted feature development on `apps/mobile-player`.

---

## Web Player as Feature Reference

`apps/web-player` is the player portal in web form. Mobile replicates the same features for native.

- **Read** `apps/web-player/src/features/<feature>/` to understand business logic, domain hooks used, and data shapes
- **Never modify** any file inside `apps/web-player`
- Translate web feature logic into mobile — same domain hooks, same data, different UI (NativeWind + RN primitives)

Web features that exist and need mobile equivalents: `auth`, `booking` (bookings-list, new-booking, manage-booking), `dashboard`, `my-games`.

---

## Folder Structure

```
apps/mobile-player/
├── app/                        # Expo Router file-based routes ONLY — no logic here
│   ├── (auth)/                 # Auth group screens
│   └── (player)/               # Authenticated player screens
│
└── src/
    ├── features/               # All feature UI and composition lives here
    │   └── <feature>/
    │       ├── components/     # Feature-local UI components
    │       ├── constants/      # Static options, menu rows, labels, route config
    │       ├── hooks/          # Feature-local hook composition
    │       ├── pages/          # Screen/page components
    │       ├── types/          # Feature-local TypeScript types
    │       └── utils/          # Pure helpers: formatters, parsers, mappers
    ├── components/             # Shared app-level components
    ├── providers/              # App-level React providers
    ├── store/                  # Mobile-only Zustand state
    ├── services/               # Mobile-only API calls not in api-client
    ├── hooks/                  # Mobile-only shared hooks
    ├── validators/             # Mobile-only Zod schemas
    └── lib/                    # Utilities
```

For features with sub-features (e.g. booking has bookings-list, new-booking, manage-booking), mirror the web-player nesting:

```
features/
└── booking/
    ├── bookings-list/
    │   ├── components/
    │   └── pages/
    ├── new-booking/
    │   ├── components/
    │   └── pages/
    ├── components/             # Shared across booking sub-features
    └── hooks/
```

**Rule:** `app/` route files only import from `src/features/`. All logic stays in `src/`.

### Feature Folder Rules

- Keep `app/` files thin: route params, auth fallback, and rendering the feature screen only.
- Use `pages/*Screen.tsx` for full-screen stack/tab screens.
- Use `*Sheet.tsx` only for real bottom sheets/action sheets, not because NativeWind is used.
- Put static arrays and labels in `constants/`, not inside screen files.
- Put reusable row/card/input pieces in `components/`.
- Put shared feature types in `types/`; keep one-off prop types beside the component.
- Put pure display helpers in `utils/` (`getInitials`, `formatDate`, `parseSkillLevel`).
- Create sub-feature folders only when the feature has separate flows, not for one small screen.

---

## Route → Feature Mapping Pattern

Every route file is a thin wrapper — no JSX, no hooks, no logic:

```tsx
// app/(player)/bookings.tsx
import { BookingsPage } from "@/src/features/booking/bookings-list/pages";
export default BookingsPage;
```

`(player)/_layout.tsx` is the **only** place that enforces the auth guard:

```tsx
// app/(player)/_layout.tsx
import { useAuth } from "@repo/auth";
import { Redirect, Stack, type Href } from "expo-router";

export default function PlayerLayout() {
    const { isAuthenticated } = useAuth();
    if (!isAuthenticated) {
        return <Redirect href={"/(auth)/login" as Href} />;
    }
    return <Stack>...</Stack>;
}
```

Use full group paths in all redirects — never bare `/login` or `/home`:

```tsx
router.replace("/(player)/home" as Href); // correct
router.replace("/home" as Href); // wrong — ambiguous between groups
```

Inside `pages/`, split container and view when the screen has meaningful data/loading/error orchestration. Small static screens can stay as one `*Screen.tsx`. Zod schemas go in a sibling `types.ts` or feature `types/` when shared:

```tsx
// src/features/booking/bookings-list/pages/index.tsx  (Container)
import { usePlayerBookings } from "@repo/player-domain";
import { BookingsListView } from "./BookingsListView";

export function BookingsPage() {
    const { data, isLoading, error } = usePlayerBookings();
    if (isLoading) return <LoadingState />;
    if (error) return <ErrorState error={error} />;
    return <BookingsListView bookings={data ?? []} />;
}
```

```tsx
// src/features/booking/bookings-list/pages/BookingsListView.tsx  (View — pure rendering)
import type { Booking } from "@repo/player-domain";

type Props = { bookings: Booking[] };
export function BookingsListView({ bookings }: Props) { ... }
```

```ts
// src/features/booking/bookings-list/pages/types.ts  (Zod schemas + inferred types)
import { z } from "zod";
export const bookingSchema = z.object({ ... });
export type BookingFormValues = z.infer<typeof bookingSchema>;
```

---

## Shared Packages

### `@repo/auth`

```tsx
import { useLogin, useAuth, useLogout, setAuthStorage } from "@repo/auth";

// Root layout (_layout.tsx) — call inside useEffect, NOT at module level
import { useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function RootLayout() {
    useEffect(() => {
        setAuthStorage(AsyncStorage);
    }, []);
    // ...
}

// In a feature container
const { user, isAuthenticated } = useAuth();
const { mutate: login, isPending } = useLogin("player");
const { mutate: logout } = useLogout();
```

Key exports: `useAuth`, `useLogin`, `useLogout`, `useInitAuth`, `useRegister`, `usePasswordResetRequest`, `usePasswordResetConfirm`, `setAuthStorage`, `useAuthStore`, `getAccessToken`, `getTenantSubdomain`.

### `@repo/player-domain`

```tsx
import { usePlayerBookings, usePlayerProfile } from "@repo/player-domain";
import type { Booking, PlayerProfile } from "@repo/player-domain";
```

Always import from `@repo/player-domain` directly — never from subfolders like `@repo/player-domain/hooks`.

### `@repo/config`

```tsx
import { config } from "@repo/config";
// Never read import.meta.env or process.env directly in app code
```

---

## Styling — Theme Tokens (NativeWind + `useTheme()`)

**All colors come from the theme. Never hardcode a hex/rgb value** (`#2563EB`, `rgba(...)`) or a raw Tailwind palette class (`bg-slate-100`, `text-[#0f172a]`) in a feature file. Light/dark are driven by the OS color scheme; new screens get dark mode for free as long as every color is a token.

There are two places color is applied in React Native, and each has its own token source:

| Where color is applied                                                                     | How to theme it                                          |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| NativeWind `className`                                                                     | Semantic token classes (`bg-card`, `text-foreground`, …) |
| Inline `style={{}}`, `<Ionicons color>`, `placeholderTextColor`, `android_ripple`, shadows | `useThemeColors()` from `@/src/theme`                    |

NativeWind `className` cannot resolve into inline `style` props or `color={}` props, so anything that is not a `className` must read from the `useThemeColors()` hook.

### The theme module (`src/theme/`)

```tsx
import { useThemeColors } from "../../../theme"; // adjust depth, or "@/src/theme"

function MyCard() {
    const colors = useThemeColors();
    return (
        <View style={{ backgroundColor: colors.card, borderColor: colors.border }}>
            <Ionicons name="add" size={20} color={colors.cta} />
            <Text className="text-foreground">Hello</Text>
        </View>
    );
}
```

- `src/theme/palette.ts` — raw fixed hue/shade constants (`blue600`, `slate100`, …). Mode-agnostic.
- `src/theme/themes.ts` — `lightColors` / `darkColors` semantic token objects (the RN-side mirror of `tokens.css`).
- `src/theme/ThemeProvider.tsx` — `<ThemeProvider>` (wired into `AppProviders`) + `useTheme()` / `useThemeColors()`. The active theme follows `useColorScheme()`; light is the default look today. A manual toggle can be added later without touching consumers.

### Semantic token reference

| Token (`colors.*` / `className`)                                           | Use for                                                     |
| -------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `background` / `foreground`                                                | Page background, primary text                               |
| `card` / `cardForeground`                                                  | Card/sheet surfaces                                         |
| `muted` / `mutedForeground`                                                | Subtle surfaces, secondary text, inactive icons             |
| `border` / `input`                                                         | Borders, input outlines                                     |
| `cta` / `ctaForeground` / `ctaSurface` / `ctaBorder`                       | Primary blue buttons, links, active states, soft blue chips |
| `destructive` / `destructiveSurface`                                       | Errors, destructive actions                                 |
| `success` / `successSurface`                                               | Confirmed/paid/positive states                              |
| `warning` / `warningSurface`                                               | Pending/caution states                                      |
| `hero` / `heroForeground` / `heroMuted` / `heroGlass` / `heroGlassBorder`  | Blue hero header (see Hero pattern below)                   |
| `contentSurface`                                                           | The slate area that lifts over the hero                     |
| `tabBar` / `tabBarBorder` / `tabActive` / `tabActiveLabel` / `tabInactive` | Bottom tab bar                                              |
| `overlay` / `placeholder` / `shadow` / `ripple`                            | Modal scrim, input placeholder, shadowColor, android_ripple |

Status/payment/invite badge colors live in `getStatusConfig(colors)` / `getPaymentConfig(colors)` / `getInviteConfig(colors)` builder functions in the feature `constants/` files — call them with `useThemeColors()`, never read the old `STATUS_CONFIG` constant.

```tsx
// Wrong — hardcoded
<View style={{ backgroundColor: "#2563EB" }}>
<Text className="text-[#0f172a]">
<Ionicons color="#94A3B8" />

// Correct — themed
<View style={{ backgroundColor: colors.cta }}>
<Text className="text-foreground">
<Ionicons color={colors.mutedForeground} />
```

### Decorative-accent exception

A small set of **decorative** colors are intentionally fixed brand accents, not semantic tokens: the per-row icon-chip colors in `profile/constants/profileModules.ts` and `profile/constants/notificationOptions.ts` (one distinct hue per menu item). These read fine on both light and dark and are the **only** sanctioned hardcoded colors. Don't add new ones without a comment explaining why a semantic token won't do.

### Migration status

Themed: `auth`, `home`, `my-games`, all of `booking`, all of `profile`, the bottom tab bar, and shared components. The only sanctioned fixed colors are the documented decorative icon-chip accents in `profile/constants/profileModules.ts` and `profile/constants/notificationOptions.ts`.

**Platform-specific classes:**

```tsx
<View className="pt-4 ios:pt-8 android:pt-6">
```

**Styling caveats:**

- `KeyboardAvoidingView` behavior still needs `Platform.OS` check — this is native behavior, not styling
- Animated values from Reanimated use inline styles on `Animated.View`
- Inline `style={{}}` is expected for layout and for color values read from `useThemeColors()` (RN props can't take `className`). Never put a hardcoded color in an inline style. Do not use `StyleSheet.create`.

---

## Date and Time Formatting

**Never use `new Date(iso).toLocaleString()`, `toLocaleDateString()`, or `toLocaleTimeString()`** to display API dates. These methods shift times by the device's local timezone — a booking at `10:00Z` displays as `15:30` on a device set to IST (UTC+5:30).

Always use the helpers from `@/src/lib` (mobile-local copies of the UTC-safe formatters — `@repo/ui` is web-only and cannot be imported into Metro):

| Helper              | Output example           | When to use              |
| ------------------- | ------------------------ | ------------------------ |
| `formatUTCDateTime` | `Apr 17, 2026, 10:00 AM` | Full date + time display |
| `formatUTCDate`     | `Apr 17, 2026`           | Date-only display        |
| `formatUTCTime`     | `10:00 AM`               | Time-only display        |

```tsx
import { formatUTCDate, formatUTCTime, formatUTCDateTime } from "../../lib"; // adjust depth

// Display a booking date
<Text>{formatUTCDate(booking.start_datetime)}</Text>

// Display a time range
<Text>{formatUTCTime(booking.start_datetime)} – {formatUTCTime(booking.end_datetime)}</Text>

// Display full date + time
<Text>{formatUTCDateTime(booking.start_datetime)}</Text>
```

**Building a datetime for the API** — when composing a `start_datetime` from a date picker (`"YYYY-MM-DD"`) and a time picker (`"HH:MM"`), never use `new Date(...).toISOString()` — it converts local time to UTC. Use `datetimeLocalToUTC` from `@repo/ui` instead:

```tsx
import { datetimeLocalToUTC } from "../../lib"; // adjust depth

// Correct — treats the picker value as UTC, appends Z without shifting
const startDatetime = datetimeLocalToUTC(`${form.bookingDate}T${form.startTime}`);

// Wrong — shifts the local time to UTC (adds 5:30 offset on an IST device)
const startDatetime = new Date(`${form.bookingDate}T${form.startTime}:00`).toISOString();
```

**Computing a UTC calendar date** (e.g. a filter default of "today") — use `Date.UTC` to avoid off-by-one near midnight:

```tsx
// Correct — always produces today's UTC calendar date regardless of device timezone
const todayUtc = new Date().toISOString().slice(0, 10);

// Correct — 3 months ago in UTC
const threeMonthsAgo = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 3, now.getUTCDate())
);
const fromIso = threeMonthsAgo.toISOString().slice(0, 10);
```

**Rule:** every ISO string from the API must go through `formatUTCDate`, `formatUTCTime`, or `formatUTCDateTime` before display. Never write inline `new Date(iso).toLocale*()` calls in feature files.

---

## Currency Formatting

Always use `formatCurrency` from `@/src/lib`. Never write inline `new Intl.NumberFormat(...)` or `.toFixed()` calls in feature files.

```tsx
import { formatCurrency } from "../../lib"; // adjust depth

// Display a monetary amount
<Text>{formatCurrency(booking.total_price)}</Text>;
```

`formatCurrency` returns `"—"` for `null` / `undefined` / `NaN`. If a feature needs a zero fallback instead, wrap the call:

```tsx
const display = formatCurrency(amount) === "—" ? "£0.00" : formatCurrency(amount);
```

**Rule:** every numeric monetary value from the API must be formatted through `formatCurrency` before display. Import from `@/src/lib` — never define a local currency formatter in a feature file.

---

## Forms

Use React Hook Form with Zod via `<Controller>` for every input:

```tsx
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({ email: z.string().email() });
type FormValues = z.infer<typeof schema>;

const { control, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(schema),
});

<Controller
    control={control}
    name="email"
    render={({ field, fieldState }) => (
        <TextInput
            className={`h-14 rounded-2xl border px-4 text-foreground ${fieldState.error ? "border-destructive" : "border-border"}`}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
        />
    )}
/>;
```

---

## Android & iOS Support

| Concern              | How to handle                                                                          |
| -------------------- | -------------------------------------------------------------------------------------- |
| Safe area            | Import `SafeAreaView` from `react-native-safe-area-context`; never from `react-native` |
| Keyboard             | `<KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>`       |
| Status bar           | `<StatusBar style="dark" />` from `expo-status-bar`                                    |
| Platform classes     | Use NativeWind `ios:` / `android:` prefixes                                            |
| `accessibilityLabel` | Required on all interactive elements                                                   |
| `accessibilityRole`  | Set `"button"`, `"link"`, `"checkbox"` on `Pressable`                                  |

---

## Blue Hero Header Pattern

Every main tab screen uses the same two-part layout: a fixed blue hero header that bleeds into the status bar, and a scrollable slate content area that lifts over it with rounded top corners. Use this pattern on every new tab screen — never a plain white header.

**Colors are theme tokens.** Read them from `useThemeColors()` (`colors.hero`, `colors.heroForeground`, `colors.heroMuted`, `colors.heroGlass`, `colors.heroGlassBorder`, `colors.contentSurface`, `colors.shadow`). The literal hex values shown below are the _light-theme_ resolved values for reference only — write the token, not the hex.

### Layout tree

```
SafeAreaView          backgroundColor: colors.hero   edges={["top"]}
  StatusBar           style="light"
  View                hero header — FIXED, never scrolls
  ScrollView          scrollable content — lifts over hero with rounded top corners
    ...content
```

**The header must be outside the `ScrollView`.** Placing it inside (as a first child of `ScrollView`) causes it to scroll away. `BookScreen.tsx` and `HomeView.tsx` both follow this structure.

---

### Exact style values

#### Outer wrapper (rendered by the Screen container)

```tsx
<SafeAreaView style={{ flex: 1, backgroundColor: colors.hero }} edges={["top"]}>
```

`backgroundColor: colors.hero` fills the status bar notch area on iOS/Android notched devices with the same blue. `edges={["top"]}` means safe-area padding is applied only at the top — the bottom is handled by the tab bar.

#### Hero header (fixed, does not scroll)

```tsx
<View
    style={{
        backgroundColor: colors.hero,
        paddingHorizontal: 20,   // left/right gutters
        paddingTop: 8,           // space below the safe-area notch
        paddingBottom: 28,       // extra bottom padding — creates overlap room for the card below
    }}
>
```

Inner row layout (title left, action buttons right):

```tsx
<View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
    <View style={{ flex: 1 }}>
        {/* Eyebrow — small label above the title */}
        <Text
            style={{ fontSize: 13, color: colors.heroMuted, fontWeight: "500", letterSpacing: 0.3 }}
        >
            Eyebrow label
        </Text>
        {/* Page title */}
        <Text
            style={{
                fontSize: 26,
                fontWeight: "700",
                color: colors.heroForeground,
                marginTop: 2,
                letterSpacing: -0.3,
            }}
        >
            Page Title
        </Text>
        {/* Subtitle */}
        <Text style={{ fontSize: 13, color: colors.heroMuted, marginTop: 4, fontWeight: "400" }}>
            Supporting detail
        </Text>
    </View>

    {/* Action buttons — see button styles below */}
</View>
```

Token reference (light-theme hex shown for context only — always write the token):

| Role               | Token                   | Light hex |
| ------------------ | ----------------------- | --------- |
| Title              | `colors.heroForeground` | `#FFFFFF` |
| Eyebrow / subtitle | `colors.heroMuted`      | `#BFDBFE` |
| Background         | `colors.hero`           | `#2563EB` |

#### Scrollable content card (lifts over hero)

```tsx
<ScrollView
    style={{
        flex: 1,
        backgroundColor: colors.contentSurface, // slate-100 in light — not pure white
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        marginTop: -16,                  // pulls card up 16 px into the hero overlap zone
    }}
    showsVerticalScrollIndicator={false}
    contentContainerStyle={{ paddingBottom: 120 }}  // clears the tab bar
>
```

The `marginTop: -16` + `paddingBottom: 28` on the hero together create the visual lift effect where the card appears to float over the blue area.

If the screen content is not scrollable (e.g. it contains its own `FlatList` or `SectionList`), replace `ScrollView` with a plain `View` using the same `style` block but omit `contentContainerStyle`:

```tsx
<View
    style={{
        flex: 1,
        backgroundColor: colors.contentSurface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        marginTop: -16,
        overflow: "hidden",
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 6,
    }}
>
```

---

### Full shell (copy this for a new screen)

```tsx
import { type JSX } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useThemeColors } from "@/src/theme"; // or relative ../../../theme

export function MyScreen(): JSX.Element {
    const colors = useThemeColors();
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.hero }} edges={["top"]}>
            <StatusBar style="light" />

            {/* ── Hero header — fixed, does not scroll ── */}
            <View
                style={{
                    backgroundColor: colors.hero,
                    paddingHorizontal: 20,
                    paddingTop: 8,
                    paddingBottom: 28,
                }}
            >
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                    }}
                >
                    <View style={{ flex: 1 }}>
                        <Text
                            style={{
                                fontSize: 13,
                                color: colors.heroMuted,
                                fontWeight: "500",
                                letterSpacing: 0.3,
                            }}
                        >
                            Eyebrow label
                        </Text>
                        <Text
                            style={{
                                fontSize: 26,
                                fontWeight: "700",
                                color: colors.heroForeground,
                                marginTop: 2,
                                letterSpacing: -0.3,
                            }}
                        >
                            Page Title
                        </Text>
                        <Text
                            style={{
                                fontSize: 13,
                                color: colors.heroMuted,
                                marginTop: 4,
                                fontWeight: "400",
                            }}
                        >
                            Supporting detail
                        </Text>
                    </View>
                    {/* action buttons go here */}
                </View>
            </View>

            {/* ── Scrollable content — lifts over hero ── */}
            <ScrollView
                style={{
                    flex: 1,
                    backgroundColor: colors.contentSurface,
                    borderTopLeftRadius: 24,
                    borderTopRightRadius: 24,
                    marginTop: -16,
                }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 120 }}
            >
                {/* content here */}
            </ScrollView>
        </SafeAreaView>
    );
}
```

---

### Header action buttons

Right-side icon buttons sit inside the hero row. Two styles:

| Style         | When to use                                       | `style` values                                                                           |
| ------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Frosted glass | Secondary action (refresh, filter, notifications) | `backgroundColor: colors.heroGlass, borderWidth: 1, borderColor: colors.heroGlassBorder` |
| White fill    | Primary action (new booking, add)                 | `backgroundColor: colors.heroForeground` — icon color `colors.hero`                      |

Both buttons share: `width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center"`.

```tsx
{
    /* Frosted glass — secondary */
}
<Pressable
    onPress={onRefresh}
    accessibilityRole="button"
    accessibilityLabel="Refresh"
    hitSlop={12}
    style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.heroGlass,
        borderWidth: 1,
        borderColor: colors.heroGlassBorder,
        alignItems: "center",
        justifyContent: "center",
    }}
>
    <Ionicons name="refresh-outline" size={18} color={colors.heroForeground} />
</Pressable>;

{
    /* White fill — primary */
}
<Pressable
    onPress={onAdd}
    accessibilityRole="button"
    accessibilityLabel="New booking"
    style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.heroForeground,
        alignItems: "center",
        justifyContent: "center",
    }}
>
    <Ionicons name="add" size={22} color={colors.hero} />
</Pressable>;
```

---

### Rules

- **Header outside `ScrollView`** — the hero `View` must be a sibling of `ScrollView`, never a child.
- **`SafeAreaView` background must be `colors.hero`** so the status bar notch area fills blue on all devices.
- **`StatusBar style="light"`** — keeps clock/battery icons white on the blue background.
- **`paddingBottom: 28` on the hero + `marginTop: -16` on the scroll area** creates the overlap lift.
- **Content card background is `colors.contentSurface`** (slate-100 in light) — `colors.card` is only for individual cards inside it.
- **`contentContainerStyle={{ paddingBottom: 120 }}`** on `ScrollView` — prevents the last card from hiding behind the tab bar.
- **No hardcoded hex** — every color above is a `colors.*` token from `useThemeColors()`.
- Reference implementations: `HomeView.tsx` / `HomeScreen.tsx` (scrollable content), `BookScreen.tsx` (list content).

---

## State Rules

| State type                   | Where                                        |
| ---------------------------- | -------------------------------------------- |
| Server / domain data         | `@repo/player-domain` hooks (TanStack Query) |
| Auth state                   | `@repo/auth` → `useAuth()`                   |
| Mobile-only persistent state | `src/store/` with MMKV persistence           |
| UI state (modals, tabs)      | Component `useState` — never Zustand         |

---

## Error Handling

- Always render loading, error, and empty states in containers
- Check `error.code` (e.g. `"FORBIDDEN"`, `"NOT_FOUND"`), never `error.status`
- 401 is handled automatically by `fetcher.ts` — do not handle it in features

---

## Adding a New Screen

1. Read `apps/web-player/src/features/<feature>/` for business logic and data shape.
2. Create a thin route file in `app/(player)/` or `app/` for stack screens.
3. Create `src/features/<feature>/pages/<FeatureScreen>.tsx`.
4. Add `components/`, `constants/`, `types/`, `utils/`, or `hooks/` only when the screen needs them.
5. Register the route in the relevant `_layout.tsx` if it is a stack/tab screen.
6. Use `@repo/player-domain` hooks for server data.
7. Style with NativeWind `className` for layout and token classes; for inline `style`/`color`/`placeholderTextColor`/ripple/shadows read colors from `useThemeColors()`. Never hardcode a hex/rgb value or a raw palette class; no `StyleSheet.create`.
8. Format all dates with `formatUTCDate` / `formatUTCTime` / `formatUTCDateTime` from `@repo/ui`.
9. Format all monetary amounts with `formatCurrency` from `@repo/ui`.

---

## Running the App

```bash
pnpm --filter mobile-player start   # Metro bundler
pnpm --filter mobile-player android # Android
pnpm --filter mobile-player ios     # iOS
```

Use EAS dev client (not Expo Go) when the feature uses MMKV or any native module.
