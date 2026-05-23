# Production Audit Tracker

_Last updated: 2026-05-23_

This document tracks the main production-readiness gaps for SmashBook as a UK multi-tenant SaaS product. Keep it short and update the status as each item is fixed.

## Key UK Standards

| Standard                                 | Why it matters                                                                                                                                                                                         |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| UK GDPR / Data Protection Act 2018       | Required for handling player, staff, tenant, booking, payment-reference, and account data. Needs lawful basis, privacy notices, retention, DSAR handling, auditability, and data protection by design. |
| PCI DSS                                  | Required because the platform takes card payments through Stripe. Even with Stripe Elements, the payment page and scripts can remain in PCI scope.                                                     |
| WCAG 2.2 AA                              | Accessibility expectation for modern UK SaaS, especially for business customers and public-sector style procurement.                                                                                   |
| Cyber Essentials / Cyber Essentials Plus | Common UK security baseline for SaaS vendors. Helps prove secure configuration, access control, malware protection, patching, and firewall controls.                                                   |
| ISO 27001 / SOC 2                        | Not always legally required, but often requested by larger UK business customers for security governance, risk management, and operational controls.                                                   |
| PECR                                     | Relevant for marketing emails, cookies, tracking, and some notification preferences.                                                                                                                   |

## Status Legend

| Status  | Meaning                                                                 |
| ------- | ----------------------------------------------------------------------- |
| Current | Existing implementation has a known gap or risk.                        |
| Pending | Work has been planned or started, but not fully released and verified.  |
| Done    | Implemented, tested, documented, and verified in production or staging. |

## Improvement Checklist

| Area                   | What needs improvement                                                                        | Severity | Status  | Recommended fix                                                                                                                                                   | Best-practice example                                                                                 |
| ---------------------- | --------------------------------------------------------------------------------------------- | -------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Authentication         | Tokens are stored in browser localStorage.                                                    | High     | Current | Move refresh tokens to `HttpOnly`, `Secure`, `SameSite` cookies or use a backend-for-frontend auth flow. Keep access tokens short-lived and preferably in memory. | Refresh token in secure cookie, access token rotated often, logout revokes refresh token server-side. |
| Admin Security         | Platform admin uses a shared static platform key.                                             | Critical | Current | Replace platform key login with named admin users, SSO/OIDC, MFA, RBAC, and audit logs.                                                                           | Google/Microsoft SSO with MFA and role-based admin permissions.                                       |
| Authorization          | Frontend route guards depend on client-persisted role.                                        | High     | Current | Treat frontend role checks as UI only. Enforce all permissions on backend per user, role, tenant, and club.                                                       | Every API endpoint validates authenticated user membership for the requested club.                    |
| Multi-tenant Isolation | API calls pass `club_id` from the client.                                                     | Critical | Current | Backend must derive tenant from trusted host/JWT context and validate every `club_id` against user membership. Add IDOR tests.                                    | Request for another tenant's club returns `403` even if a valid ID is guessed.                        |
| Payment Reliability    | Frontend can show payment success before backend webhook confirmation is verified.            | High     | Current | After Stripe confirmation, poll/refetch backend payment or booking status until backend marks it paid.                                                            | UI shows "Processing payment" until webhook updates booking as `paid`.                                |
| Payment Idempotency    | Booking and payment mutations do not show an idempotency strategy in frontend APIs.           | High     | Current | Generate and send idempotency keys for booking creation, PaymentIntent creation, wallet payment, and retries. Backend must enforce uniqueness.                    | Same checkout attempt cannot create duplicate bookings or duplicate Stripe intents.                   |
| PCI Compliance         | PCI scope and SAQ evidence are not documented.                                                | High     | Current | Decide SAQ A vs SAQ A-EP with acquirer/QSA. Maintain Stripe AOC, script inventory, CSP, payment-page change monitoring, and scan evidence.                        | Payment page only loads approved scripts and has documented PCI controls.                             |
| GDPR Compliance        | GDPR operating controls are not documented in the repo.                                       | High     | Current | Add privacy notice, retention rules, DSAR process, deletion/anonymisation process, RoPA, DPIA, breach process, and subprocessors list.                            | A tenant can request export/delete and the process is documented and auditable.                       |
| Security Headers       | CSP, HSTS, frame protection, and other browser security headers are not evidenced.            | High     | Current | Configure Cloudflare/GCS/LB headers: CSP, HSTS, `frame-ancestors`, `X-Content-Type-Options`, referrer policy, permissions policy.                                 | Strict CSP allowing only app assets, Stripe, API origin, and required analytics.                      |
| Accessibility          | Modals and complex UI need stronger keyboard/focus handling evidence.                         | Medium   | Current | Use accessible dialog primitives, focus trap, Escape close, focus return, labels, and automated axe tests.                                                        | Payment modal can be completed using keyboard and screen reader.                                      |
| Mobile UX              | Payment and booking flows need mobile viewport verification.                                  | Medium   | Current | Add Playwright/mobile screenshot checks for booking, payment, login, dashboards, and modals.                                                                      | No clipped buttons, hidden totals, or unusable forms on 360px width.                                  |
| Observability          | Frontend monitoring and payment/auth error telemetry are not evidenced.                       | Medium   | Current | Add Sentry/Datadog/OpenTelemetry, release tracking, source maps, and alerts for API/payment/auth errors.                                                          | Alert when payment failures spike or login refresh starts failing.                                    |
| Error Handling         | API errors are normalised, but product-level recovery paths need review.                      | Medium   | Current | Add retry/recovery UX for network failures, expired sessions, delayed payment webhooks, and booking conflicts.                                                    | User can retry payment safely without duplicate charges.                                              |
| CI/CD                  | Deployment pipeline is documented but workflow files are not present in this repo.            | Medium   | Current | Add or link GitHub Actions/Terraform repo. Include lint, test, type-check, build, security scan, smoke, rollback.                                                 | Protected production deployment with approvals and rollback by SHA.                                   |
| Cloud Infrastructure   | Frontend infra is documented but not verifiable from this repo.                               | Medium   | Current | Keep Terraform in source control or link infra repo. Verify WAF, TLS, headers, cache rules, secrets, backups, and access controls.                                | Infrastructure changes go through PR review and Terraform plan.                                       |
| Logging & Audit Trails | Security/audit logging is not evidenced.                                                      | High     | Current | Backend should log admin actions, tenant changes, billing changes, login events, failed access attempts, and payment state transitions.                           | Audit log shows who changed club settings, when, from where, and old/new values.                      |
| Email Infrastructure   | Email deliverability and compliance controls are not documented.                              | Medium   | Current | Document provider, SPF/DKIM/DMARC, bounce handling, unsubscribe/preferences, templates, and audit logs.                                                           | Booking/payment emails have delivery tracking and compliant opt-out where required.                   |
| Subscription Billing   | Subscription state machine and dunning flow are not fully evidenced.                          | Medium   | Current | Document Stripe subscription lifecycle, invoice states, failed payment retries, grace periods, cancellation, and webhook handling.                                | Failed subscription payment triggers dunning and controlled access changes.                           |
| Database Design        | Database schema, migrations, indexes, backups, and tenant constraints are not available here. | High     | Current | Audit backend schema for tenant keys, foreign keys, indexes, unique constraints, RLS or equivalent, backups, and restore tests.                                   | Every tenant-owned table has enforced tenant/club ownership constraints.                              |
| Performance            | Frontend uses lazy routes, but performance budgets are not documented.                        | Medium   | Current | Add bundle analysis, Lighthouse budget, route-level code splitting checks, API pagination, and CDN cache verification.                                            | Main routes meet agreed LCP/INP/CLS budgets on mobile.                                                |
| UX Completeness        | Some staff routes still show placeholder pages.                                               | Medium   | Current | Hide unfinished routes behind feature flags or complete them before production launch.                                                                            | Finance, reports, support, staff pages are complete or not visible.                                   |
| Maintainability        | Architecture is good, but access rules can drift between route config and router guards.      | Medium   | Current | Generate router guards from route config or centralise role policy in one module.                                                                                 | One source of truth controls sidebar visibility and route access.                                     |

## Suggested Fix Order

1. Admin security: remove shared platform key.
2. Backend tenant isolation and server-side authorization.
3. Token storage and session hardening.
4. Payment webhook confirmation and idempotency.
5. GDPR and PCI documentation/evidence.
6. Security headers and CSP.
7. Observability, audit logs, and alerting.
8. Accessibility and mobile verification.
9. CI/CD, infrastructure evidence, and production runbooks.
10. UX completeness, performance budgets, and maintainability cleanup.

## How To Update This Tracker

When work starts, change `Status` from `Current` to `Pending`.

When the fix is released and verified, change `Status` to `Done` and add a short note or link to the PR, test, runbook, or evidence.
