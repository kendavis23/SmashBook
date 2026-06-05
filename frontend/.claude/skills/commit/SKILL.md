---
name: commit
description: Generate a ready-to-run git commit command with a proper message. Does NOT commit — outputs the command for the user to run.
---

Do NOT run `git commit`. Instead, derive the correct commit message from the staged diff and output a ready-to-run command the user can copy and execute themselves.

## Output format

Output exactly one code block containing the git commit command:

```
git commit -m "<type>(<scope>): <short description>"
```

Nothing else — no explanation, no preamble, no trailing summary.

## Commit message format

```
<type>(<scope>): <short description>
```

- **type**: `feat`, `fix`, `test`, `chore`, `refactor`, `style`, `docs`
- **scope**: one or more affected features/packages in lowercase, comma-separated (e.g. `calendar`, `booking,reservation`, `auth`)
- **description**: imperative, lowercase, no period, single line, meaningful summary of the change

Examples:

```
git commit -m "feat(calendar): improve calendar CSS and layout for day/week timeline boards"
git commit -m "feat(booking,reservation,calendar): add modal pattern for new and manage flows"
git commit -m "fix(auth): include staging env in X-Tenant-Subdomain header injection"
git commit -m "test(reservations): fix ReservationsView test mock for ConfirmDeleteModal"
```

If the user passed a commit message as an argument (`$ARGUMENTS`), use it verbatim as the message. Otherwise derive a single-line message from the staged diff.
