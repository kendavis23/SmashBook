Last updated: 2026-05-20 00:00 UTC\_

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

## Styling — NativeWind Only

Light theme is used throughout. Use NativeWind `className` on every component. **Never use `StyleSheet.create`, `StyleSheet`, or inline `style={{}}`. NativeWind is always required for styling.**

```tsx
// Correct
<View className="flex-1 bg-background px-4 py-6">
  <Text className="text-2xl font-bold text-foreground">Hello</Text>
</View>

// Wrong
<View style={{ flex: 1, backgroundColor: '#ffffff' }}>
```

Use semantic token class names (`bg-background`, `text-foreground`, `border-border`, `bg-primary`, `text-primary-foreground`, `bg-muted`, `text-muted-foreground`, `bg-destructive`, `text-destructive`) — never hardcoded color values.

**Platform-specific classes:**

```tsx
<View className="pt-4 ios:pt-8 android:pt-6">
```

**NativeWind caveats:**

- `KeyboardAvoidingView` behavior still needs `Platform.OS` check — this is native behavior, not styling
- Animated values from Reanimated use inline styles on `Animated.View` — that is the only exception

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
7. Style with NativeWind `className`; no `StyleSheet.create` and no inline styles except native/animated exceptions.

---

## Running the App

```bash
pnpm --filter mobile-player start   # Metro bundler
pnpm --filter mobile-player android # Android
pnpm --filter mobile-player ios     # iOS
```

Use EAS dev client (not Expo Go) when the feature uses MMKV or any native module.
