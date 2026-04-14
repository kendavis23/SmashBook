---
name: error-handling
description: How errors flow from fetcher to features — ApiError codes, retry rules, and UI responses.
---

## Error shape

```ts
type ApiErrorCode =
    | "UNAUTHORIZED"
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "VALIDATION_ERROR"
    | "RATE_LIMITED"
    | "SERVER_ERROR"
    | "NETWORK_ERROR"
    | "UNKNOWN";

interface ApiError {
    code: ApiErrorCode;
    status: number;
    message: string;
    detail?: unknown;
}
```

## Who handles what

| Code               | HTTP | Handler                              | UI response                  |
| ------------------ | ---- | ------------------------------------ | ---------------------------- |
| `UNAUTHORIZED`     | 401  | `fetcher.ts` auto-refresh → sign-out | Redirect to `/login`         |
| `FORBIDDEN`        | 403  | Feature component                    | `<AccessDenied />`           |
| `NOT_FOUND`        | 404  | Feature component                    | `<EmptyState />` or redirect |
| `VALIDATION_ERROR` | 422  | Domain hook `onError`                | Surface field errors via RHF |
| `RATE_LIMITED`     | 429  | `fetcher.ts` + retry                 | Toast: "Too many requests"   |
| `SERVER_ERROR`     | 5xx  | Domain hook `onError`                | Toast or `<ErrorBanner />`   |
| `NETWORK_ERROR`    | —    | Domain hook `onError`                | Offline banner               |

## Rules

- `fetcher.ts` owns ALL 401 handling — features never intercept 401
- Features react to `error.code`, **never** to `error.status`
- Every async UI state must render loading + error + empty states — none optional
- Do not swallow errors silently

## Domain hook — retry rule

```ts
retry: (failureCount, error: ApiError) =>
    !["UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND", "VALIDATION_ERROR"].includes(error.code)
    && failureCount < 2,
```

## Feature error handling

```tsx
const { data, error } = useBookings();
if (error?.code === "FORBIDDEN") return <AccessDenied />;
if (error?.code === "NOT_FOUND") return <EmptyState />;
if (error) return <ErrorBanner />;
```

## Mutation validation errors

Handle `VALIDATION_ERROR` inside the domain hook — normalise field errors and expose to the form. Never handle 422 in the feature component directly.

## Ref: `docs/FE_CODING_STANDARD.md` §14
