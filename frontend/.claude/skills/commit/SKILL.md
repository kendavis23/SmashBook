---
name: commit
description: Format, test, lint, and build must all pass before committing.
---

Run the following steps **in order** from the `frontend/` directory. If any step fails, stop immediately and report which step failed and why — do NOT proceed to the next step or commit.

1. **Format** — `pnpm format`
2. **Test** — `pnpm --filter !mobile-player test -- --run`
3. **Lint** — `pnpm lint`
4. **Build** — `pnpm build`

Only if all four steps pass, proceed to create the git commit using the standard commit workflow (stage relevant files, write a concise commit message, commit).

## Commit message format

```
<type>(<scope>): <short description>
```

- **type**: `feat`, `fix`, `test`, `chore`, `refactor`, `style`, `docs`
- **scope**: one or more affected features/packages in lowercase, comma-separated (e.g. `calendar`, `booking,reservation`, `auth`)
- **description**: imperative, lowercase, no period, single line, meaningful summary of the change

Examples:

```
feat(calendar): improve calendar CSS and layout for day/week timeline boards
feat(booking,reservation,calendar): add modal pattern for new and manage flows
fix(auth): include staging env in X-Tenant-Subdomain header injection
test(reservations): fix ReservationsView test mock for ConfirmDeleteModal
```

If the user passed a commit message as an argument (`$ARGUMENTS`), use it verbatim. Otherwise derive a single-line message in this format from the staged diff.
