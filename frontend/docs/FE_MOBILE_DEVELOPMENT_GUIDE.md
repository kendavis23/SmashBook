Last updated: 2026-05-10 00:00 UTC_

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
    │       ├── hooks/          # Feature-local hook composition
    │       └── pages/          # Container + View pairs — one per screen
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
router.replace("/(player)/home" as Href);   // correct
router.replace("/home" as Href);             // wrong — ambiguous between groups
```

Inside `pages/`, always split container and view. Zod schemas go in a sibling `types.ts`:

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

Light theme is used throughout. Use NativeWind `className` on every component. **Never use `StyleSheet.create` or inline `style={{}}`.**

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

| Concern              | How to handle                                                                    |
| -------------------- | -------------------------------------------------------------------------------- |
| Safe area            | Wrap screens in `<SafeAreaView className="flex-1 bg-background">`                |
| Keyboard             | `<KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>` |
| Status bar           | `<StatusBar style="dark" />` from `expo-status-bar`                              |
| Platform classes     | Use NativeWind `ios:` / `android:` prefixes                                      |
| `accessibilityLabel` | Required on all interactive elements                                             |
| `accessibilityRole`  | Set `"button"`, `"link"`, `"checkbox"` on `Pressable`                            |

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

1. Read the equivalent feature in `apps/web-player/src/features/<feature>/` for context
2. Create route file in `app/(player)/` — thin wrapper only
3. Create the feature folder under `src/features/<feature>/pages/` with container + view
4. Register the screen in `app/(player)/_layout.tsx` if needed
5. Use domain hooks from `@repo/player-domain` for data
6. Style with NativeWind className — no StyleSheet, no hardcoded colors

---

## Running the App

```bash
pnpm --filter mobile-player start   # Metro bundler
pnpm --filter mobile-player android # Android
pnpm --filter mobile-player ios     # iOS
```

Use EAS dev client (not Expo Go) when the feature uses MMKV or any native module.

