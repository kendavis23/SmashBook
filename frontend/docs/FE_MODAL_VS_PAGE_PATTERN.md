_Last updated: 2026-04-24 00:00 UTC_

# Modal vs Page Pattern

How to reuse a form feature in both a full page and a compact modal without duplicating logic.

---

## Problem

Some actions (e.g. "New Booking") have a dedicated full-page route (`/bookings/new`). The same action can also be triggered from a contextual UI (e.g. the Court Availability Panel) where navigating away would break the user's flow. The solution is to render the same Container in both contexts, with the View delegating to a dedicated ModalView component when `mode="modal"`.

---

## Pattern Overview

```
Container (unchanged logic)
  └── View receives mode="page" | mode="modal"
        ├── mode="page"  → full layout: Breadcrumb + card-surface + all sections
        └── mode="modal" → delegates immediately to *ModalView component
```

The **Container** is identical in both cases — same hooks, same validation, same submit logic. Only the cancel/success callbacks differ (navigate vs close modal).

---

## File structure — always 5 files

Every feature that has both a page and a modal **always** uses this 5-file structure. Never inline the modal layout into the page View — extract it from the start.

```
new-entity/
  components/
    NewEntityView.tsx            ← page layout only; delegates modal branch to NewEntityModalView
    NewEntityModalView.tsx       ← modal layout only: sticky header + scrollable body + sticky footer
    NewEntityContainer.tsx       ← page entry: reads search params, navigates on done
    NewEntityModalContainer.tsx  ← modal entry: accepts props, calls onClose/onSuccess on done
    NewEntityModal.tsx           ← modal shell: createPortal, flex flex-col, backdrop click
```

| File                          | Purpose                                                                                |
| ----------------------------- | -------------------------------------------------------------------------------------- |
| `NewEntityView.tsx`           | Page layout only — delegates `mode="modal"` branch immediately to `NewEntityModalView` |
| `NewEntityModalView.tsx`      | Modal layout only — sticky header / scrollable body / sticky footer                    |
| `NewEntityContainer.tsx`      | Page entry — reads search params, navigates on done                                    |
| `NewEntityModalContainer.tsx` | Modal entry — accepts props, calls `onClose`/`onSuccess` on done                       |
| `NewEntityModal.tsx`          | Modal shell — `createPortal`, `flex flex-col max-h-[90vh]`, backdrop click             |

---

## Modal anatomy

```
Modal overlay  (fixed inset-0, z-50, bg-black/50, backdrop-blur-sm)
  └── Modal inner div  (flex flex-col, max-w-2xl, height 90vh, rounded-2xl — NO overflow, NO padding)
        └── ModalContainer
              └── ModalView  (flex h-full flex-col on the <form>)
                    ├── [shrink-0] Sticky header: icon badge + title + subtitle + X button
                    ├── [flex-1 min-h-0 overflow-y-auto] Scrollable body:
                    │       AlertToast (if error)
                    │       StatPill grid (read-only context)
                    │       Editable fields
                    │       Collapsible optional sections
                    └── [shrink-0] Sticky footer: Cancel + primary action button
```

**Key constraint:** The modal inner div has NO `overflow-y-auto` and NO padding. Both live inside `NewEntityModalView`. This is required so the sticky header/footer work correctly — without it, the whole form scrolls and the buttons go off-screen.

---

## `NewEntityModal.tsx` — shell

```tsx
// features/[domain]/new-entity/components/NewEntityModal.tsx
import type { JSX } from "react";
import { createPortal } from "react-dom";
import NewEntityModalContainer from "./NewEntityModalContainer";

type Props = {
    // pre-filled context props (e.g. courtId, date, startTime)
    onClose: () => void;
    onSuccess?: (label: string) => void;
};

export function NewEntityModal({ onClose, onSuccess, ...rest }: Props): JSX.Element {
    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            {/*
              IMPORTANT: flex flex-col + NO overflow-y-auto + NO padding here.
              Overflow and padding live inside NewEntityModalView.
              style={{ height: "90vh" }} is intentional — keeps the shell at a
              fixed height so the sticky header/footer inside always show.
            */}
            <div
                className="flex w-full max-w-2xl flex-col rounded-2xl border border-border bg-card shadow-2xl"
                style={{ height: "90vh" }}
            >
                <NewEntityModalContainer {...rest} onClose={onClose} onSuccess={onSuccess} />
            </div>
        </div>,
        document.body
    );
}
```

---

## `NewEntityModalView.tsx` — layout

The `<form>` is the flex container — no extra wrapper needed.

```tsx
// features/[domain]/new-entity/components/NewEntityModalView.tsx
import type { FormEvent, JSX } from "react";
import { useState } from "react";
import { SomeIcon, X, ChevronDown, ChevronRight } from "lucide-react";
import { AlertToast, StatPill } from "@repo/ui";

type Props = {
    /* ... */
};

export function NewEntityModalView({
    form,
    apiError,
    isPending,
    onSubmit,
    onCancel,
    onDismissError,
    onClose,
    // ...context values used in StatPills
}: Props): JSX.Element {
    const [sectionOpen, setSectionOpen] = useState(false);

    return (
        <form onSubmit={onSubmit} noValidate className="flex h-full flex-col">
            {/* ── Sticky header ── */}
            <div className="shrink-0 border-b border-border px-6 pb-5 pt-6">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        {/* Icon badge */}
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                            <SomeIcon size={18} />
                        </div>
                        {/* Title + subtitle */}
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">New Entity</h2>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                Review the details and fill in the remaining information.
                            </p>
                        </div>
                    </div>
                    {/* Close button */}
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close modal"
                        className="shrink-0 rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* ── Scrollable body ── */}
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                {/* Error alert — always first in the body */}
                {apiError ? (
                    <div className="mb-4">
                        <AlertToast title={apiError} variant="error" onClose={onDismissError} />
                    </div>
                ) : null}

                <div className="space-y-5">
                    {/* Read-only context pills — first item in the body, after error */}
                    <div className="grid grid-cols-4 gap-2">
                        <StatPill label="Court" value={courtName} />
                        <StatPill label="Date" value={formattedDate} />
                        <StatPill label="Start Time" value={formattedTime} />
                        <StatPill label="Price" value={formattedPrice} />
                    </div>

                    {/* Editable fields */}
                    <div className="grid grid-cols-2 gap-4">{/* ... */}</div>

                    {/* Collapsible optional section */}
                    <div className="overflow-hidden rounded-lg border border-border">
                        <button
                            type="button"
                            onClick={() => setSectionOpen((o) => !o)}
                            className="flex w-full items-center justify-between bg-muted/20 px-4 py-3 text-left transition hover:bg-muted/40"
                            aria-expanded={sectionOpen}
                        >
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Optional Section{" "}
                                <span className="text-[10px] font-normal normal-case text-muted-foreground">
                                    (optional)
                                </span>
                            </span>
                            {sectionOpen ? (
                                <ChevronDown size={13} className="text-muted-foreground" />
                            ) : (
                                <ChevronRight size={13} className="text-muted-foreground" />
                            )}
                        </button>
                        {sectionOpen ? (
                            <div className="space-y-3 border-t border-border p-4">
                                {/* optional fields */}
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>

            {/* ── Sticky footer ── */}
            <div className="shrink-0 flex items-center justify-end gap-3 border-t border-border px-6 py-4">
                <button type="button" onClick={onCancel} className="btn-outline">
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isPending}
                    className="btn-cta flex items-center gap-2"
                >
                    <SomeIcon size={14} />
                    {isPending ? "Creating…" : "Create Entity"}
                </button>
            </div>
        </form>
    );
}
```

---

## `NewEntityView.tsx` — delegation pattern

The page View delegates to `NewEntityModalView` at the very top of the component body — before any other JSX. No modal layout lives in this file.

```tsx
// features/[domain]/new-entity/components/NewEntityView.tsx
import { NewEntityModalView } from "./NewEntityModalView";

export default function NewEntityView({ mode = "page", onClose, ...props }: Props): JSX.Element {
    // Delegate immediately — no modal layout in this file
    if (mode === "modal") {
        return <NewEntityModalView onClose={onClose ?? props.onCancel} {...props} />;
    }

    // ...page layout: Breadcrumb + card-surface + full form sections
}
```

---

## `NewEntityModalContainer.tsx` — modal entry

Same state/hooks as the page Container but:

- Accepts pre-filled context props instead of reading from `useSearch` / `useParams`
- Calls `onClose()` + `onSuccess?.()` on success
- Calls `mutation.reset()` on dismiss error
- Passes `mode="modal"` and `onClose` to the View

```tsx
// NewEntityModalContainer.tsx
type Props = {
    // pre-filled context props (e.g. courtId, date, startTime)
    onClose: () => void;
    onSuccess?: (label: string) => void;
};

export default function NewEntityModalContainer({
    onClose,
    onSuccess,
    ...prefilled
}: Props): JSX.Element {
    const { clubId } = useClubAccess();
    const createMutation = useCreateEntity(clubId ?? "");

    const handleSubmit = useCallback(
        (e: FormEvent): void => {
            e.preventDefault();
            if (!validate()) return;
            createMutation.mutate(buildPayload(form, prefilled), {
                onSuccess: () => {
                    onClose();
                    onSuccess?.(someLabel);
                },
            });
        },
        [form, createMutation, onClose, onSuccess]
    );

    return (
        <NewEntityView
            mode="modal"
            apiError={(createMutation.error as Error | null)?.message ?? ""}
            isPending={createMutation.isPending}
            onDismissError={() => createMutation.reset()}
            onCancel={onClose}
            onClose={onClose}
            onSubmit={handleSubmit}
            // ...rest of props
        />
    );
}
```

---

## StatPill — read-only context

`StatPill` from `@repo/ui` displays a read-only label + value pair. Use it at the top of the scrollable body to show immutable context values (court, date, time, price) before the editable fields.

```tsx
import { StatPill } from "@repo/ui";

<div className="grid grid-cols-4 gap-2">
    <StatPill label="Court" value={courtName} />
    <StatPill label="Date" value={formattedDate} />
    <StatPill label="Start Time" value={formattedTime} />
    <StatPill label="Price" value={formattedPrice} />
</div>;
```

**Rule:** `StatPill` goes in the **scrollable body** (`min-h-0 flex-1 overflow-y-auto`), not in the sticky header. It is always the first element inside `<div className="space-y-5">`, after the `AlertToast` error block.

**Rule:** never define a local `StatPill` in a feature file. Always import from `@repo/ui`.

---

## Modal UX rules

### Sticky layout

The modal inner div is `flex flex-col` with a fixed height (`height: "90vh"`) and **no** `overflow-y-auto`. The `<form>` inside is `flex h-full flex-col`. The header and footer are `shrink-0`; the body is `flex-1 min-h-0 overflow-y-auto`. This guarantees CTAs are always visible regardless of content length.

### Backdrop click closes

```tsx
onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
```

### API error — stay open, show alert

On submit failure the modal stays open. `AlertToast` renders inside the scrollable body, above all other content:

```tsx
{
    apiError ? (
        <div className="mb-4">
            <AlertToast title={apiError} variant="error" onClose={onDismissError} />
        </div>
    ) : null;
}
```

`onDismissError` calls `mutation.reset()` so the user can retry.

### Success — close modal, refresh caller, show toast

On success the modal closes, the **caller component** refreshes its own data, and shows a toast via `AlertToast`. The page does not reload.

```tsx
// ModalContainer — handleSubmit
createMutation.mutate(payload, {
    onSuccess: () => {
        onClose();
        onSuccess?.();
    },
});
```

```tsx
// Caller component
const [successMsg, setSuccessMsg] = useState<string | null>(null);

{
    successMsg ? (
        <AlertToast title={successMsg} variant="success" onClose={() => setSuccessMsg(null)} />
    ) : null;
}

<NewEntityModal
    onClose={() => setTarget(null)}
    onSuccess={(label) => {
        setTarget(null);
        setSuccessMsg(`Created: ${label}.`);
        onRefresh(); // ← refresh THIS component's data only, not the page
    }}
/>;
```

---

## Token / class reference

| Element                   | Classes                                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Modal shell inner div     | `flex w-full max-w-2xl flex-col rounded-2xl border border-border bg-card shadow-2xl` + `style={{ height: "90vh" }}` |
| Form root                 | `flex h-full flex-col`                                                                                              |
| Sticky header wrapper     | `shrink-0 border-b border-border px-6 pb-5 pt-6`                                                                    |
| Icon badge                | `flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground`             |
| Modal title               | `text-lg font-semibold text-foreground`                                                                             |
| Modal subtitle            | `mt-0.5 text-xs text-muted-foreground`                                                                              |
| Close (X) button          | `shrink-0 rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground`                   |
| Scrollable body wrapper   | `min-h-0 flex-1 overflow-y-auto px-6 py-5`                                                                          |
| Body content wrapper      | `space-y-5`                                                                                                         |
| StatPill grid             | `grid grid-cols-4 gap-2` — first child of `space-y-5`, after error alert                                            |
| StatPill (from @repo/ui)  | `rounded-lg bg-muted/50 px-3 py-2.5`                                                                                |
| Sticky footer wrapper     | `shrink-0 flex items-center justify-end gap-3 border-t border-border px-6 py-4`                                     |
| Footer (with destructive) | `shrink-0 flex items-center justify-between border-t border-border px-6 py-4`                                       |
| Collapsible wrapper       | `overflow-hidden rounded-lg border border-border`                                                                   |
| Collapsible toggle        | `flex w-full items-center justify-between bg-muted/20 px-4 py-3 text-left transition hover:bg-muted/40`             |
| Collapsible label         | `text-[11px] font-semibold uppercase tracking-wider text-muted-foreground`                                          |
| Collapsible chevron       | `size={13} className="text-muted-foreground"`                                                                       |
| Collapsible body          | `space-y-3 border-t border-border p-4`                                                                              |
| Inline status badge       | `rounded-full px-2.5 py-0.5 text-[11px] font-medium {statusColors.bg} {statusColors.text}`                          |
| Read-only field           | `{fieldCls} cursor-default select-none bg-muted/30 opacity-80`                                                      |
| Icon-only action button   | `rounded p-0.5 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-40`           |
| Table header row          | `bg-muted/10`                                                                                                       |
| Table header cell         | `px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground`                       |
| Table body row            | `hover:bg-muted/20`                                                                                                 |
| Table body cell           | `px-3 py-2 font-medium text-foreground`                                                                             |

---

## Footer variants

### Create modal (action only, no destructive)

```tsx
<div className="shrink-0 flex items-center justify-end gap-3 border-t border-border px-6 py-4">
    <button type="button" onClick={onCancel} className="btn-outline">
        Cancel
    </button>
    <button type="submit" disabled={isPending} className="btn-cta flex items-center gap-2">
        <SomeIcon size={14} />
        {isPending ? "Creating…" : "Create Entity"}
    </button>
</div>
```

### Manage modal (destructive left, save right)

```tsx
<div className="shrink-0 flex items-center justify-between border-t border-border px-6 py-4">
    {isCancellable ? (
        <button
            type="button"
            onClick={onCancelEntity}
            disabled={isCancelling}
            className="btn-destructive"
        >
            {isCancelling ? "Cancelling…" : "Cancel Entity"}
        </button>
    ) : (
        <span />
    )}
    <div className="flex items-center gap-2">
        <button type="button" onClick={onBack} className="btn-outline">
            Close
        </button>
        <button
            type="submit"
            disabled={!isDirty || isUpdating}
            className="btn-cta disabled:opacity-50"
        >
            {isUpdating ? "Saving…" : "Save Changes"}
        </button>
    </div>
</div>
```

---

## How to apply to a new feature

### Step 1 — Create all 5 files upfront

Do not start with a single View and extract later. Create all 5 files from the beginning.

### Step 2 — Add `mode` and `onClose` to the shared View

```tsx
type Props = {
    // ...existing props
    mode?: "page" | "modal"; // default: "page"
    onClose?: () => void; // required in modal mode for the X button
};
```

### Step 3 — Delegate at the top of the page View

```tsx
export default function NewEntityView({ mode = "page", onClose, ...props }: Props): JSX.Element {
    if (mode === "modal") {
        return <NewEntityModalView onClose={onClose ?? props.onCancel} {...props} />;
    }
    // ...page layout
}
```

### Step 4 — Build `NewEntityModalView` with the sticky layout

Follow the structure above: `flex h-full flex-col` on the form, `shrink-0` header, `min-h-0 flex-1 overflow-y-auto` body, `shrink-0` footer. StatPills go in the body, not the header.

### Step 5 — Create `NewEntityModalContainer`

Same logic as the page Container. Accepts pre-filled props, calls `onClose` + `onSuccess` on done.

### Step 6 — Create `NewEntityModal` shell

`createPortal` with `fixed inset-0 z-50` overlay. Inner div: `flex flex-col` + `style={{ height: "90vh" }}`, no overflow, no padding.

### Step 7 — Wire up the caller

```tsx
{
    target ? (
        <NewEntityModal
            {...target}
            onClose={() => setTarget(null)}
            onSuccess={(label) => {
                setTarget(null);
                setSuccessMsg(`Created: ${label}.`);
                void refetch();
            }}
        />
    ) : null;
}
```

---

## When to use this pattern

Use when:

- A "New/Manage Entity" action exists on its own route **and** can be triggered contextually
- The contextual trigger has enough pre-filled information to skip the full form
- Navigating away would break the user's current context

Do NOT use when:

- The form is always standalone (page only) — keep Container + View as-is
- The modal version needs significantly different fields — build a separate smaller form component

---

## Checklist

**Shell (`NewEntityModal.tsx`):**

- [ ] Uses `createPortal` to `document.body`
- [ ] Overlay: `fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm`
- [ ] Backdrop click calls `onClose` via `e.target === e.currentTarget` check
- [ ] Inner div: `flex w-full max-w-2xl flex-col rounded-2xl border border-border bg-card shadow-2xl` + `style={{ height: "90vh" }}`
- [ ] Inner div has **no** `overflow-y-auto` and **no** padding

**ModalView (`NewEntityModalView.tsx`):**

- [ ] Form root: `flex h-full flex-col`
- [ ] Sticky header: `shrink-0 border-b border-border px-6 pb-5 pt-6`
- [ ] Header has icon badge (`h-10 w-10 rounded-xl bg-secondary`), title, subtitle, and X button
- [ ] X button: `shrink-0 rounded-md p-1.5` with `<X size={16} />`
- [ ] Scrollable body: `min-h-0 flex-1 overflow-y-auto px-6 py-5`
- [ ] Body content wrapped in `space-y-5`
- [ ] `AlertToast` error block is **first** inside body, before `space-y-5`
- [ ] `StatPill` grid is **first child** of `space-y-5` — never in the sticky header
- [ ] `StatPill` imported from `@repo/ui` — no local definition
- [ ] Sticky footer: `shrink-0 flex items-center ... border-t border-border px-6 py-4`
- [ ] Collapsible sections use `overflow-hidden rounded-lg border border-border` wrapper

**Page View (`NewEntityView.tsx`):**

- [ ] Delegates `mode="modal"` at the very top — before any other JSX
- [ ] No modal layout code in this file

**ModalContainer (`NewEntityModalContainer.tsx`):**

- [ ] Accepts pre-filled context props (not `useSearch`/`useParams`)
- [ ] Calls `onClose()` + `onSuccess?.()` on mutation success
- [ ] `onDismissError` calls `mutation.reset()`
- [ ] Passes `mode="modal"` and `onClose` to View

**UX:**

- [ ] API error shows `AlertToast` in the body; modal stays open
- [ ] Success closes modal and calls caller's `onSuccess` — no page reload
- [ ] Caller shows `<AlertToast variant="success" />` after modal closes
- [ ] Caller calls its own `refetch` in `onSuccess` — not `window.location.reload()`
