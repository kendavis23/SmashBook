_Last updated: 2026-04-22 00:00 UTC_

# Modal vs Page Pattern

How to reuse a form feature in both a full page and a compact modal without duplicating logic.

---

## Problem

Some actions (e.g. "New Booking") have a dedicated full-page route (`/bookings/new`). The same action can also be triggered from a contextual UI (e.g. the Court Availability Panel) where navigating away would break the user's flow. The solution is to render the same Container in both contexts, with the View adapting its layout based on a `mode` prop.

---

## Pattern Overview

```
Container (unchanged logic)
  └── View receives mode="page" | mode="modal"
        ├── mode="page"  → full layout: Breadcrumb + card-surface + all sections
        └── mode="modal" → compact layout: no Breadcrumb, no outer card, condensed sections
```

The **Container** is identical in both cases — same hooks, same validation, same submit logic. Only the cancel/success callbacks differ (navigate vs close modal).

---

## Modal UX Rules

### Scrollable

The modal inner div must be scrollable so long forms never push CTAs off-screen:

```tsx
<div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl">
```

- `max-h-[90vh]` caps height to 90% of the viewport.
- `overflow-y-auto` scrolls the content; the header and footer CTAs scroll with the form (they are inside the same div).
- Backdrop click closes the modal: `onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}`.

### X close button

The View's modal header must include an X button. The `onClose` prop is passed from the Modal shell down through the Container to the View. The title and status badge sit on the left; the X button is a small `shrink-0` target on the right:

```tsx
<div className="mb-5 flex items-start justify-between gap-3">
    <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-foreground">Entity Name</h2>
            {/* optional status badge inline with title */}
            <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusColors.bg} ${statusColors.text}`}
            >
                {statusLabel}
            </span>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
    </div>
    {onClose ? (
        <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="shrink-0 rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
            <X size={15} />
        </button>
    ) : null}
</div>
```

### API error — stay open, show alert

On submit failure the modal stays open. The `apiError` string drives an `AlertToast` inside the form, above the fields:

```tsx
{
    apiError ? (
        <div className="mb-4">
            <AlertToast title={apiError} variant="error" onClose={onDismissError} />
        </div>
    ) : null;
}
```

`onDismissError` calls `mutation.reset()` to clear the error so the user can retry.

### Success — close modal, refresh caller, show toast

On success the modal closes, the **caller component** (not the page) refreshes its own data, and shows a toast via `AlertToast` from `@repo/ui`. The page does not reload.

- Only the **caller** refreshes — call its own `refetch` / `onRefresh` handler, not a global page reload.
- Use `AlertToast` from `@repo/ui` — never build an inline success banner with custom HTML.
- `AlertToast` renders via `createPortal` to a fixed top-right position and auto-dismisses.

```tsx
// Inside ModalContainer — handleSubmit
createMutation.mutate(payload, {
    onSuccess: () => {
        onClose();
        onSuccess?.();
    },
});
```

```tsx
// Inside the caller (e.g. AvailabilityPanel)
import { AlertToast } from "@repo/ui";

const [successMsg, setSuccessMsg] = useState<string | null>(null);

// Toast (renders top-right via portal, auto-dismisses)
{
    successMsg ? (
        <AlertToast title={successMsg} variant="success" onClose={() => setSuccessMsg(null)} />
    ) : null;
}

// Modal
<NewEntityModal
    onClose={() => setTarget(null)}
    onSuccess={(label) => {
        setTarget(null);
        setSuccessMsg(`Created: ${label}.`);
        onRefresh(); // ← refresh THIS component's data only
    }}
/>;
```

**Rule:** the `onRefresh` call in `onSuccess` refreshes the caller's data (e.g. availability slots). It is NOT a full page reload. Pass the caller's own `refetch` function as `onRefresh` — do not call `window.location.reload()` or navigate away.

---

## Modal shell anatomy

```
Modal overlay (fixed inset-0, z-50, bg-black/50, backdrop-blur-sm)
  └── Modal inner div (max-w-lg, max-h-[90vh], overflow-y-auto, rounded-2xl, p-6)
        └── ModalContainer
              └── View (mode="modal")
                    ├── Header: title + inline status badge + subtitle + X button
                    ├── [AlertToast if apiError / updateSuccess]
                    ├── Overview stat pills (4-col grid, bg-muted/50 rounded-lg)
                    ├── Core fields (labelled sections with tracking-wider uppercase heading)
                    ├── Collapsible optional sections (rounded-lg border, bg-muted/20 toggle header)
                    └── Footer: [Cancel Booking?] · · · [Close] [Save Changes]
```

---

## Modal layout design

### Root wrapper

The modal content root uses `flex flex-col` (not `space-y-*`) so sections can grow independently:

```tsx
<div className="flex flex-col">
    {/* header */}
    {/* alerts */}
    {/* overview pills */}
    {/* form with space-y-5 */}
</div>
```

### Overview stat pills

When the modal shows read-only summary data (e.g. booking overview), render it as a 4-column pill grid instead of a flat `<dl>`. Each pill uses `bg-muted/50 rounded-lg px-3 py-2.5`:

```tsx
<div className="mb-5 grid grid-cols-4 gap-2">
    <div className="rounded-lg bg-muted/50 px-3 py-2.5">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Type
        </p>
        <p className="mt-1 truncate text-sm font-medium text-foreground">{value}</p>
    </div>
    {/* repeat for Players, Total, Created */}
</div>
```

Use `truncate` on the value text inside pills — pills are narrow and content overflows easily.

### Section headings inside the form

Replace `<h3>` section headings with a `<p>` at `text-[11px] font-semibold uppercase tracking-wider text-muted-foreground` and `mb-2.5`. This keeps visual weight lighter than the page layout's `text-sm` headings:

```tsx
<p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
    Core Details
</p>
```

### Read-only fields

Price and other display-only fields get a tinted background to visually distinguish them from editable inputs:

```tsx
<div className={`${fieldCls} cursor-default select-none bg-muted/30 opacity-80`}>{value}</div>
```

### Collapsible sections

Players, Event & Contact, and any other optional collapsible panels use `overflow-hidden rounded-lg border border-border` as the wrapper. The toggle button gets a subtle hover background instead of being plain:

```tsx
<div className="overflow-hidden rounded-lg border border-border">
    <button
        type="button"
        className="flex w-full items-center justify-between bg-muted/20 px-4 py-2.5 text-left transition hover:bg-muted/40"
        onClick={() => setExpanded((v) => !v)}
    >
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Section Title
        </span>
        {expanded ? (
            <ChevronUp size={13} className="text-muted-foreground" />
        ) : (
            <ChevronDown size={13} className="text-muted-foreground" />
        )}
    </button>
    {expanded ? (
        <div className="border-t border-border p-4 space-y-3">{/* section content */}</div>
    ) : null}
</div>
```

For sections with a table (e.g. Players), the expanded content is `overflow-x-auto border-t border-border` with no padding — the table handles its own spacing:

```tsx
{
    expanded ? (
        <div className="overflow-x-auto border-t border-border">
            <table className="w-full min-w-[380px] border-collapse text-sm">
                <thead>
                    <tr className="bg-muted/10">
                        <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Name
                        </th>
                        {/* ... */}
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {rows.map((r) => (
                        <tr key={r.id} className="hover:bg-muted/20">
                            <td className="px-3 py-2 font-medium text-foreground">{r.name}</td>
                            {/* ... */}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    ) : null;
}
```

### Refresh icon button

When a small icon-only action button appears inline (e.g. refresh slots), wrap it in a hover target:

```tsx
<button
    type="button"
    onClick={onRefreshSlots}
    disabled={slotsLoading}
    title="Refresh slots"
    className="rounded p-0.5 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-40"
>
    <RefreshCw size={12} className={slotsLoading ? "animate-spin" : ""} />
</button>
```

### Footer

The footer separates destructive actions (left) from primary actions (right) with `justify-between`. Button gap is `gap-2`:

```tsx
<div className="flex items-center justify-between border-t border-border pt-4">
    {isCancellable ? (
        <button
            type="button"
            onClick={onCancelBooking}
            disabled={isCancelling}
            className="btn-destructive"
        >
            {isCancelling ? "Cancelling…" : "Cancel Booking"}
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

## Token / class reference for modal elements

| Element                  | Classes                                                                                                   |
| ------------------------ | --------------------------------------------------------------------------------------------------------- |
| Root wrapper             | `flex flex-col`                                                                                           |
| Header wrapper           | `mb-5 flex items-start justify-between gap-3`                                                             |
| Title                    | `text-base font-semibold text-foreground`                                                                 |
| Inline status badge      | `rounded-full px-2.5 py-0.5 text-[11px] font-medium {statusColors.bg} {statusColors.text}`                |
| Subtitle / datetime      | `mt-0.5 text-xs text-muted-foreground`                                                                    |
| Close (X) button         | `shrink-0 rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground`         |
| Overview pill grid       | `mb-5 grid grid-cols-4 gap-2`                                                                             |
| Overview pill            | `rounded-lg bg-muted/50 px-3 py-2.5`                                                                      |
| Pill label               | `text-[10px] font-medium uppercase tracking-wide text-muted-foreground`                                   |
| Pill value               | `mt-1 truncate text-sm font-medium text-foreground`                                                       |
| Form wrapper             | `space-y-5`                                                                                               |
| Section heading          | `mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground`                         |
| Read-only field          | `{fieldCls} cursor-default select-none bg-muted/30 opacity-80`                                            |
| Collapsible wrapper      | `overflow-hidden rounded-lg border border-border`                                                         |
| Collapsible toggle btn   | `flex w-full items-center justify-between bg-muted/20 px-4 py-2.5 text-left transition hover:bg-muted/40` |
| Collapsible toggle label | `text-[11px] font-semibold uppercase tracking-wider text-muted-foreground`                                |
| Collapsible chevron      | `size={13} className="text-muted-foreground"`                                                             |
| Table header row         | `bg-muted/10`                                                                                             |
| Table header cell        | `px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground`             |
| Table body row           | `hover:bg-muted/20`                                                                                       |
| Table primary cell       | `px-3 py-2 font-medium text-foreground`                                                                   |
| Table secondary cell     | `px-3 py-2 capitalize text-muted-foreground`                                                              |
| Icon-only action button  | `rounded p-0.5 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-40` |
| Footer wrapper           | `flex items-center justify-between border-t border-border pt-4`                                           |
| Footer button gap        | `flex items-center gap-2`                                                                                 |

---

## Event & Contact field layout (2-row grid)

Optional sections use a 2-column grid. Contact fields are grouped in two rows:

```
Row 1: Contact name  │  Contact email
Row 2: Contact phone │  On behalf of (user ID)
```

```tsx
<div className="space-y-3">
    <div>/* Event name — full width */</div>
    <div className="grid grid-cols-2 gap-3">
        <div>/* Contact name */</div>
        <div>/* Contact email */</div>
    </div>
    <div>/* Contact phone — full width or grid if paired */</div>
</div>
```

---

## How to apply to a new feature

### Step 1 — Add `mode` and `onClose` props to the View

```tsx
type Props = {
    // ...existing props
    mode?: "page" | "modal"; // default: "page"
    onClose?: () => void; // only used in modal mode for the X button
};
```

### Step 2 — Branch layout in the View

```tsx
export default function NewEntityView({ mode = "page", onClose, ...props }: Props) {
    if (mode === "modal") {
        return (
            <div className="flex flex-col">
                {/* Header */}
                <div className="mb-5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-base font-semibold text-foreground">New Entity</h2>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
                    </div>
                    {onClose ? (
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close modal"
                            className="shrink-0 rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        >
                            <X size={15} />
                        </button>
                    ) : null}
                </div>

                {/* API error */}
                {apiError ? (
                    <div className="mb-4">
                        <AlertToast title={apiError} variant="error" onClose={onDismissError} />
                    </div>
                ) : null}

                {/* Overview stat pills — omit if no read-only summary data */}
                <div className="mb-5 grid grid-cols-4 gap-2">
                    {statItems.map((s) => (
                        <div key={s.label} className="rounded-lg bg-muted/50 px-3 py-2.5">
                            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                {s.label}
                            </p>
                            <p className="mt-1 truncate text-sm font-medium text-foreground">
                                {s.value}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Form */}
                <form onSubmit={onSubmit} noValidate className="space-y-5">
                    {/* Section heading */}
                    <div>
                        <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Core Details
                        </p>
                        {/* fields */}
                    </div>

                    {/* Collapsible optional section */}
                    <div className="overflow-hidden rounded-lg border border-border">
                        <button
                            type="button"
                            className="flex w-full items-center justify-between bg-muted/20 px-4 py-2.5 text-left transition hover:bg-muted/40"
                            onClick={() => setExpanded((v) => !v)}
                        >
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Optional Section
                            </span>
                            {expanded ? (
                                <ChevronUp size={13} className="text-muted-foreground" />
                            ) : (
                                <ChevronDown size={13} className="text-muted-foreground" />
                            )}
                        </button>
                        {expanded ? (
                            <div className="space-y-3 border-t border-border p-4">
                                {/* optional fields */}
                            </div>
                        ) : null}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between border-t border-border pt-4">
                        <span /> {/* left slot — destructive action or empty span */}
                        <div className="flex items-center gap-2">
                            <button type="button" onClick={onCancel} className="btn-outline">
                                Close
                            </button>
                            <button
                                type="submit"
                                disabled={isPending}
                                className="btn-cta disabled:opacity-50"
                            >
                                {isPending ? "Saving…" : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        );
    }

    // ...existing page layout
}
```

Keep both layouts in the same file as long as the total stays under 300 lines. If it exceeds 300 lines, extract `NewEntityViewCompact.tsx` alongside.

### Step 3 — Create the Modal shell

```tsx
// features/[domain]/[feature]/components/NewEntityModal.tsx
import type { JSX } from "react";
import { createPortal } from "react-dom";
import NewEntityModalContainer from "./NewEntityModalContainer";

type Props = {
    // pre-filled context props
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
            <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl">
                <NewEntityModalContainer {...rest} onClose={onClose} onSuccess={onSuccess} />
            </div>
        </div>,
        document.body
    );
}
```

### Step 4 — Create the ModalContainer

Same state/hooks as the page Container but:

- Accepts pre-filled props instead of reading from `useSearch`
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

export default function NewEntityModalContainer({ onClose, onSuccess, ...prefilled }: Props) {
    const createMutation = useCreateEntity(clubId ?? "");
    const apiError = (createMutation.error as Error | null)?.message ?? "";

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        createMutation.mutate(payload, {
            onSuccess: () => {
                onClose();
                onSuccess?.(someLabel);
            },
        });
    };

    return (
        <NewEntityView
            mode="modal"
            apiError={apiError}
            onDismissError={() => createMutation.reset()}
            onCancel={onClose}
            onClose={onClose}
            onSubmit={handleSubmit}
            isPending={createMutation.isPending}
            // ...rest of props
        />
    );
}
```

### Step 5 — Caller usage

```tsx
// e.g. SomePanel.tsx
import { AlertToast } from "@repo/ui";
import { useState } from "react";
import { NewEntityModal } from "../...";

const [target, setTarget] = useState<{ id: string } | null>(null);
const [successMsg, setSuccessMsg] = useState<string | null>(null);

// Toast — renders top-right via portal, auto-dismisses after 10s
{
    successMsg ? (
        <AlertToast title={successMsg} variant="success" onClose={() => setSuccessMsg(null)} />
    ) : null;
}

// Trigger
<button onClick={() => setTarget({ id: item.id })}>Open</button>;

// Modal
{
    target ? (
        <NewEntityModal
            id={target.id}
            onClose={() => setTarget(null)}
            onSuccess={(label) => {
                setTarget(null);
                setSuccessMsg(`Created: ${label}.`);
                onRefresh(); // refresh THIS component's data (e.g. refetch slots)
            }}
        />
    ) : null;
}
```

---

## File naming

| File                          | Purpose                                                          |
| ----------------------------- | ---------------------------------------------------------------- |
| `NewEntityView.tsx`           | Handles both `mode="page"` and `mode="modal"` layout             |
| `NewEntityContainer.tsx`      | Page entry — reads search params, navigates on done              |
| `NewEntityModalContainer.tsx` | Modal entry — accepts props, calls onClose/onSuccess on done     |
| `NewEntityModal.tsx`          | Modal shell — `createPortal`, scrollable wrapper, backdrop click |

---

## When to use this pattern

Use this pattern whenever:

- A "New Entity" action exists on its own route AND can be triggered contextually (e.g. from a panel, list row, or detail page)
- The contextual trigger has enough pre-filled information to skip the full form
- Navigating away from the current page would break the user's context

Do NOT use this pattern if:

- The form is always standalone (page only) — keep the Container + View as-is
- The modal version needs significantly different fields — build a separate smaller form component instead

---

## Checklist

- [ ] `mode` prop added to View with `"page"` default
- [ ] `onClose` prop added to View (used for X button in modal header)
- [ ] Modal shell uses `createPortal`, `max-h-[90vh] overflow-y-auto`, backdrop click closes
- [ ] Header: `flex items-start justify-between gap-3` with `min-w-0` title block and `shrink-0` X button
- [ ] Status badge inline with title (`rounded-full px-2.5 py-0.5 text-[11px] font-medium`)
- [ ] X button: `shrink-0 rounded-md p-1.5`, `<X size={15} />`
- [ ] API error: `AlertToast` inside the form; modal stays open; `onDismissError` calls `mutation.reset()`
- [ ] Success: `onClose()` + `onSuccess?.()` called in `onSuccess` of mutation; modal closes
- [ ] Overview stat pills: `grid grid-cols-4 gap-2`, each pill `rounded-lg bg-muted/50 px-3 py-2.5`
- [ ] Form wrapper uses `space-y-5`
- [ ] Section headings: `text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5`
- [ ] Read-only fields: `bg-muted/30 opacity-80 cursor-default select-none`
- [ ] Collapsible wrapper: `overflow-hidden rounded-lg border border-border`
- [ ] Collapsible toggle: `bg-muted/20 hover:bg-muted/40 transition`, chevron `size={13}`
- [ ] Table header row: `bg-muted/10`, cells `text-[11px] font-semibold uppercase tracking-wide`
- [ ] Icon-only action button: `rounded p-0.5 hover:bg-muted`
- [ ] Footer: `justify-between` with destructive action left, `gap-2` button cluster right
- [ ] Caller shows `<AlertToast variant="success" />` from `@repo/ui` after modal closes (never a custom inline banner)
- [ ] Caller calls its own `onRefresh` / `refetch` in `onSuccess` — only the caller component refreshes, not the page
- [ ] Optional sections use `grid grid-cols-2 gap-3` for paired fields (e.g. name+email)
- [ ] Existing page Container and page tests unchanged
- [ ] Modal Container test file added
- [ ] Modal View tests cover `mode="modal"` layout (no breadcrumb, stat pills present, X button present)
