_Last updated: 2026-05-03 00:00 UTC_

# React 18 → 19 Upgrade Plan (Web Apps)

> Scope: `web-staff` and `web-player` only. `mobile-player` already runs React 19.1.0.

---

## Audit Summary

| Category                                    | Status   | Count                  |
| ------------------------------------------- | -------- | ---------------------- |
| `forwardRef` usage (deprecated in React 19) | Must fix | 2 files                |
| `React.FC` / implicit children              | Clean    | 0 issues               |
| `children` prop typing                      | Clean    | all explicit           |
| `useRef` patterns                           | Clean    | 34 instances, all safe |
| `memo()` usage                              | Clean    | 5 instances, all safe  |
| Context API                                 | Clean    | 3 files, all modern    |
| Entry points (`createRoot`)                 | Clean    | both apps              |

**Effort:** Low. Only 2 components need code changes; everything else is version-bump-only.

---

## Files That Need Changes

### Phase 1 — package.json version bumps (6 files)

| File                                  | Field                              | From      | To        |
| ------------------------------------- | ---------------------------------- | --------- | --------- |
| `apps/web-staff/package.json`         | `dependencies.react`               | `18.3.1`  | `19.1.0`  |
| `apps/web-staff/package.json`         | `dependencies.react-dom`           | `18.3.1`  | `19.1.0`  |
| `apps/web-staff/package.json`         | `devDependencies.@types/react`     | `^18.3.1` | `^19.0.0` |
| `apps/web-staff/package.json`         | `devDependencies.@types/react-dom` | `^18.3.0` | `^19.0.0` |
| `apps/web-player/package.json`        | `dependencies.react`               | `18.3.1`  | `19.1.0`  |
| `apps/web-player/package.json`        | `dependencies.react-dom`           | `18.3.1`  | `19.1.0`  |
| `apps/web-player/package.json`        | `devDependencies.@types/react`     | `^18.3.1` | `^19.0.0` |
| `apps/web-player/package.json`        | `devDependencies.@types/react-dom` | `^18.3.0` | `^19.0.0` |
| `packages/ui/package.json`            | `peerDependencies.react`           | `18.3.1`  | `^19.0.0` |
| `packages/ui/package.json`            | `peerDependencies.react-dom`       | `18.3.1`  | `^19.0.0` |
| `packages/ui/package.json`            | `devDependencies.@types/react`     | `^18.3.1` | `^19.0.0` |
| `packages/ui/package.json`            | `devDependencies.@types/react-dom` | `^18.3.0` | `^19.0.0` |
| `packages/auth/package.json`          | `peerDependencies.react`           | `18.3.1`  | `^19.0.0` |
| `packages/auth/package.json`          | `devDependencies.@types/react`     | `^18.3.1` | `^19.0.0` |
| `packages/player-domain/package.json` | `peerDependencies.react`           | `18.3.1`  | `^19.0.0` |
| `packages/player-domain/package.json` | `devDependencies.@types/react`     | `^18.3.1` | `^19.0.0` |
| `packages/player-domain/package.json` | `devDependencies.@types/react-dom` | `^18.3.0` | `^19.0.0` |
| `packages/staff-domain/package.json`  | `peerDependencies.react`           | `18.3.1`  | `^19.0.0` |
| `packages/staff-domain/package.json`  | `devDependencies.@types/react`     | `^18.3.1` | `^19.0.0` |
| `packages/staff-domain/package.json`  | `devDependencies.@types/react-dom` | `^18.3.0` | `^19.0.0` |

### Phase 2 — Code changes (2 files)

React 19 deprecates `forwardRef`. `ref` is now a regular prop on function components.

#### `packages/ui/components/TimeInput.tsx`

**Before:**

```tsx
import { forwardRef } from "react";

const TimeInput = forwardRef<HTMLInputElement, TimeInputProps>(({ ...props }, ref) => {
    return <input ref={ref} {...props} />;
});
TimeInput.displayName = "TimeInput";
```

**After:**

```tsx
import { Ref } from "react";

type TimeInputProps = {
    // existing props...
    ref?: Ref<HTMLInputElement>;
};

function TimeInput({ ref, ...props }: TimeInputProps) {
    return <input ref={ref} {...props} />;
}
```

#### `packages/ui/components/NumberInput.tsx`

**Before:**

```tsx
import { forwardRef } from "react";

const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(({ ...props }, ref) => {
    return <input ref={ref} {...props} />;
});
NumberInput.displayName = "NumberInput";
```

**After:**

```tsx
import { Ref } from "react";

type NumberInputProps = {
    // existing props...
    ref?: Ref<HTMLInputElement>;
};

function NumberInput({ ref, ...props }: NumberInputProps) {
    return <input ref={ref} {...props} />;
}
```

> Note: `displayName` is no longer needed since the function is named — remove it.

---

## Step-by-Step Execution

```
Step 1 — Update package.json files (Phase 1 table above)
Step 2 — Refactor TimeInput.tsx and NumberInput.tsx (Phase 2 above)
Step 3 — pnpm install
Step 4 — pnpm type-check
         Fix any remaining type errors surfaced by @types/react@^19 before continuing
Step 5 — pnpm --filter web-staff test -- --run
         pnpm --filter web-player test -- --run
Step 6 — pnpm --filter web-staff build
         pnpm --filter web-player build
Step 7 — Manual smoke test both portals:
         - Login / logout
         - Any form that uses TimeInput or NumberInput (ref forwarding)
         - Any modal that uses forwardRef-based shadcn primitives
```

---

## React 19 Breaking Changes — Why Each Matters Here

| Breaking Change                       | Impact on This Codebase                                           |
| ------------------------------------- | ----------------------------------------------------------------- |
| `forwardRef` deprecated               | 2 components need rewrite (Phase 2)                               |
| `children` no longer implicit on `FC` | No impact — no `React.FC` used; all children are explicitly typed |
| `ReactDOM.render` removed             | No impact — both apps already use `createRoot`                    |
| `act()` import moved                  | No impact — tests import from `@testing-library/react`            |
| `string refs` removed                 | No impact — none found                                            |
| `findDOMNode` removed                 | No impact — none found                                            |
| Stricter `ref` types                  | Covered by Phase 2 refactor                                       |

---

## Dependencies — Compatibility Confirmed

| Package                      | Version in Use | React 19 Compatible               |
| ---------------------------- | -------------- | --------------------------------- |
| react-router-dom             | 6.28.0         | Yes                               |
| @tanstack/react-query        | 5.62.9         | Yes                               |
| zustand                      | 4.5.5          | Yes                               |
| react-hook-form              | 7.54.0         | Yes                               |
| @testing-library/react       | 16.x           | Yes                               |
| lucide-react                 | 0.446.0        | Yes                               |
| shadcn/ui (Radix primitives) | 2.1.8          | Yes (Radix 1.x supports React 19) |

---

## Also Update

After completing the upgrade, update these two files to reflect the new pinned versions:

- `CLAUDE.md` — update the `React web apps` pinned version line from `18.3.1` → `19.1.0`
- `docs/FE_ARCHITECTURE.md` — update the React row in the Web stack table
