---
name: commit
description: Format, test, lint, and build must all pass before committing.
---

Run the following steps **in order** from the `frontend/` directory. If any step fails, stop immediately and report which step failed and why — do NOT proceed to the next step or commit.

1. **Format** — `pnpm format`
2. **Test** — `pnpm test`
3. **Lint** — `pnpm lint`
4. **Build** — `pnpm build`

Only if all four steps pass, proceed to create the git commit using the standard commit workflow (stage relevant files, write a concise commit message, commit).

If the user passed a commit message as an argument (`$ARGUMENTS`), use it. Otherwise derive a message from the staged diff.
