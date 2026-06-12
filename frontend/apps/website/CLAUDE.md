# CLAUDE.md — @repo/website

Scope: `apps/website/` only. This file is the complete map of the app — trust it instead of scanning the tree. If a change makes it inaccurate, update it in the same change.

## What this app is

The **public marketing website** for SmashBook (React + Vite SPA, port **3003**). It is fully static content:

- **No API calls** — does not depend on `@repo/api-client`, no fetch anywhere
- **No auth** — does not depend on `@repo/auth`
- **No domain packages** — no Zustand, no TanStack Query, no forms
- **No env vars read in `src/`** — `@repo/config` is not used; site constants are hardcoded in `src/lib/site.ts`
- **No shadcn/`@repo/ui` components** — only plain JSX + Tailwind + `lucide-react` icons
- **Light theme only** — `ThemeProvider` is a stub that strips the `dark` class; `setTheme` is a no-op (dark tokens exist in `globals.css` but are unused)

Only runtime deps: `react`, `react-dom`, `react-router-dom@6`, `lucide-react`.

## Commands (from `frontend/`)

```bash
pnpm --filter @repo/website dev          # http://localhost:3003
pnpm --filter @repo/website build        # tsc -b && vite build → dist/
pnpm --filter @repo/website test         # vitest run --passWithNoTests (no tests exist yet)
pnpm --filter @repo/website lint
pnpm --filter @repo/website type-check
```

## Project graph

```
index.html
└── src/main.tsx                      # entry: StrictMode > ErrorBoundary > AppProviders > AppRouter
    ├── src/styles/globals.css        # ALL design tokens (self-contained :root vars) + btn-cta / btn-outline classes
    ├── src/layout/ErrorBoundary.tsx  # top-level error fallback
    ├── src/providers/index.tsx       # AppProviders → ThemeProvider (light-only stub), exports useTheme
    └── src/app/index.tsx             # AppRouter: BrowserRouter + ALL routes, every page lazy() + Suspense spinner
        └── src/layout/SiteLayout.tsx # shared shell: ScrollToTop + Navbar + <main pt-[60px]> Outlet + Footer
            ├── src/layout/Navbar.tsx # fixed 60px header, NAV_LINKS const, mobile menu, "Book a Demo" → /contact
            ├── src/layout/Footer.tsx # PRODUCT/COMPANY/LEGAL link columns, contact email
            └── (routed page from features/)

src/layout/usePageTitle.ts            # usePageTitle("Pricing") → "Pricing — SmashBook"; pages call it themselves
src/lib/site.ts                       # CONTACT_EMAIL, SITE_NAME, SITE_TAGLINE — the only "config"
```

## Route map (route → component, all in `src/features/`)

| Route      | Page component                       | Sub-components in same folder                             |
| ---------- | ------------------------------------ | --------------------------------------------------------- |
| `/`        | `home/components/HomePage.tsx`       | `Hero`, `ProductSplit`, `Features`, `About`, `CtaSection` |
| `/product` | `product/components/ProductPage.tsx` | `ProductCta`                                              |
| `/pricing` | `pricing/components/PricingPage.tsx` | —                                                         |
| `/about`   | `about/components/AboutPage.tsx`     | —                                                         |
| `/contact` | `contact/components/ContactPage.tsx` | —                                                         |
| `/privacy` | `legal/components/PrivacyPage.tsx`   | shared shell: `legal/components/LegalPage.tsx`            |
| `/terms`   | `legal/components/TermsPage.tsx`     | shared shell: `legal/components/LegalPage.tsx`            |
| `*`        | redirect to `/`                      | —                                                         |

Routes are registered in exactly one place: `src/app/index.tsx`. Nav links live in `Navbar.tsx` (`NAV_LINKS`) and `Footer.tsx` (`PRODUCT_LINKS`/`COMPANY_LINKS`/`LEGAL_LINKS`) — update those consts when adding a page.

## How to add a new page (the only common change)

1. Create `src/features/<name>/components/<Name>Page.tsx` — pure static JSX, call `usePageTitle("<Name>")` at the top.
2. Register it in `src/app/index.tsx`: add a `lazy()` import + `<Route path="/<name>" ...>` inside the `SiteLayout` route.
3. Add links to `NAV_LINKS` in `Navbar.tsx` and/or the footer link consts in `Footer.tsx`.
4. Update the route map table above.

Content-only edits (copy, pricing tiers, feature lists) live as inline consts/JSX inside the page component itself — there is no CMS, no content files.

## Styling rules (differs from the other apps — read this)

- Tokens are **self-contained** in `src/styles/globals.css` (`:root` HSL variables), NOT from `@repo/design-system`. The Tailwind preset comes from `@repo/tailwind-config` (see `tailwind.config.ts`), which maps the variables to classes.
- Site-specific semantic token: **`cta`** (`bg-cta`, `text-cta`, `cta-hover`, `cta-ring`) — the blue accent used for all calls-to-action and the "Book" in the logo.
- Reusable button classes (defined in `globals.css` `@layer components`, not React components): **`btn-cta`** and **`btn-outline`**. Use these instead of re-composing button styles.
- Everything else follows monorepo rules: Tailwind utilities only, semantic tokens, no hardcoded hex colors, Tailwind pinned at 3.4.17.
- Layout invariants: navbar is `fixed` at 60px (`z-[9999]`), so `SiteLayout`'s `<main>` has `pt-[60px]`; page sections use `mx-auto max-w-7xl px-6 lg:px-8`.

## Deployment notes

- `vite.config.ts` sets `base: "./"` (relative asset paths) and the `@` → `src/` alias.
- The root `frontend/CLAUDE.md` build example passes `VITE_API_PLAYER_SITE_URL` / `VITE_API_STAFF_SITE_URL`, but **no code in `src/` reads them yet** — they're reserved for future "open the player/staff portal" links. If you add such links, read the vars via `@repo/config`, not `import.meta.env` directly.
- `src/lib/site.ts` has a TODO: confirm `CONTACT_EMAIL` (ken@smashbook.app) is a live mailbox before deploying.
- SPA with client-side routing: hosting must rewrite all paths to `index.html` (deep links like `/pricing` 404 otherwise). Full deploy config: `frontend/docs/FE_DEPLOYMENT.md`.

## Code quality

Monorepo limits apply (max 300-line file / 200-line component, no `any`, no `console.log`). Largest current file is `ProductPage.tsx` at 230 lines — split it before adding much more.
