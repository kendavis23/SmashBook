---
name: commit
description: Commit code directly with a proper message, skipping format/lint/test/build checks.
---

Skip format, lint, test, and build checks entirely. Proceed directly to create the git commit using the standard commit workflow (stage relevant files, write a concise commit message, commit).

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
