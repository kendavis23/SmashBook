_Last updated: 2026-06-10 (B3 landed)_

# Staff Onboarding + Permissions — Implementation Plan & Progress Tracker

> **Status doc.** Implemented across multiple sessions. Each task has a checkbox — check it off
> (`[x]`) as it lands and bump the `_Last updated_` line above. **Phase A** (✅ done) is a
> behavior-preserving refactor (no feature change); **Phase B** adds the onboarding feature and is
> split into three independently-committable sections **B1 → B2 → B3** (land one per commit, in
> order). A session should implement the lowest unchecked section in full, up to its **Exit**
> line, then stop. This is a temporary working tracker; remove it once the work is merged and the
> permanent docs (`DATA_MODEL.md`, `ENTITY_RELATIONSHIPS.md`, `IMPLEMENTED_API.md`) carry the changes.

## Context

SmashBook needs endpoints to onboard staff into clubs. Onboarding forces a fix to a structural
permissions problem first:

- **Two role systems disagree.** `users.role` (`TenantUserRole`) is a single **tenant-wide**
  column and the *only* thing authz checks ([auth.py:58-77](../backend/app/api/v1/dependencies/auth.py#L58-L77)).
  `staff_profiles.role` (`StaffRole`: trainer/ops_lead/admin/front_desk) is **per-club** but
  inert — used only to filter trainers and build the login `clubs[]` list.
- **Club authority is unenforced.** `club_id` arrives as a raw `Query(...)` param; nothing
  checks the caller belongs to that club. A tenant `admin` is implicitly admin of every club.
- **Doc drift:** `CLAUDE.md` says the JWT carries `club_id`/`role`; it actually carries only
  `{"sub","tid"}`. Role is re-read from the DB per request; club is never bound.

**Decisions locked by the user:** (B) split authority into a **tenant plane** (`owner`/`admin`)
and a **club plane** (`staff_profiles`); onboarding is **invite-based** (mirror the existing
player-invite flow). **Phased delivery:** validate current flows keep working after Phase A
before building the feature in Phase B.

---

# PHASE A — Permission infra refactor (no functional change)

**Exit criterion: the full existing integration suite passes unchanged.** This phase introduces
no new endpoints and changes no observable behavior; it only centralizes authz and adds an
unused-until-Phase-B resolver.

## Layer 1 — Capability layer (behavior-preserving; touches live guards)
Replace scattered role-set literals (`_OPS_LEAD_ROLES` duplicated in
[auth.py](../backend/app/api/v1/dependencies/auth.py),
[trainers.py:31](../backend/app/api/v1/endpoints/trainers.py#L31),
`booking_service.py:54`, `equipment_service.py:179`) with one source of truth.

- [x] **Create `app/core/permissions.py`:**
  - `Capability` constants: `STAFF_INVITE`, `STAFF_VIEW`, `STAFF_UPDATE_ROLE`, `STAFF_DEACTIVATE`
    (start scoped to onboarding; add verbs incrementally later). Also added four access-tier
    capabilities (`ACCESS_STAFF/OPS_LEAD/ADMIN/OWNER`) so the legacy `require_*` gates collapse
    into the same matrix.
  - `ROLE_RANK: dict[role -> int]` — one ordering across both planes, **keyed by role value
    string** so a tenant `admin` and a club `admin` rank identically:
    `owner(5) > admin(4) > ops_lead(3) > trainer/front_desk/staff(2) > player/viewer(1)`.
    (`staff` added at rank 2 — it was missing from the original sketch but is needed so the
    `ACCESS_STAFF` tier reproduces the legacy `_STAFF_ROLES` set exactly.)
  - `CAPABILITIES: dict[role -> set[Capability]]` (the matrix).
  - `can(effective_role, capability) -> bool` (accepts enum or value string);
    `max_grantable_rank(role) = ROLE_RANK[role] - 1`.
- [x] Route `require_staff/ops_lead/admin/owner` in
  [auth.py](../backend/app/api/v1/dependencies/auth.py) through `can()`/the matrix so the role
  sets have a single definition. **No endpoint behavior changes** (verified by a unit test that
  asserts the access tiers equal the old role sets, plus the full integration suite).
- [x] (Optional, same PR) collapse the duplicated `_OPS_LEAD_ROLES`/`_STAFF_ROLES` literals in
  `trainers.py`, `booking_service.py`, `equipment_service.py` to use `can()` from `permissions.py`.
- [x] Unit tests for the matrix + `can()` + `max_grantable_rank()` (`tests/unit/test_permissions.py`).
- [x] **Run the full existing suite — stayed green** (726 integration tests passed).

## Layer 2 — Club-context resolver (purely additive; no live consumer yet)
- [x] Add `get_club_context(club_id) -> ClubContext{club, effective_role}` in a new
  `app/api/v1/dependencies/club_context.py`:
  - `owner`/`admin` on `users.role` → that role at **every** club in their tenant (matches
    `_get_user_clubs`, [auth.py:347-355](../backend/app/api/v1/endpoints/auth.py#L347-L355)).
  - else → active `staff_profiles.role` for `(user, club)`; else player/viewer/none.
  - Validate club ∈ caller's tenant (mirrors `_get_active_club`, 404 on miss).
  - Core logic split into `resolve_club_context(db, user, tenant, club_id)` (directly
    unit-testable) with `get_club_context` as the thin FastAPI/`Query` wrapper, so Phase B
    endpoints that take `club_id` from a body can call the resolver directly.
  - `effective_role` is a unified **value string** (e.g. `"owner"`, `"trainer"`, `"front_desk"`),
    ready to pass to `can()`/`ROLE_RANK`.
- [x] Unit tests for the resolver (owner/admin tenant-wide; staff per-club; cross-tenant 404;
  player fallback; no-standing → `None`) — `tests/unit/test_club_context.py`.
- [x] Confirm nothing live consumes it yet → existing suite still green (726 integration tests).

> Retrofitting *all* existing club-scoped endpoints onto this resolver is **out of scope** —
> tracked as future work. Here it only exists for Phase B to consume.

---

# PHASE B — Staff onboarding feature (new schema + endpoints)

**Phase B is split into three independently-committable sections — land them in order:
B1 → B2 → B3.** Each ends with the full suite green and is its own commit/PR.

- **Dependency order:** B2 and B3 both require B1's migration. B3 does *not* depend on B2, so
  the two could be parallelised, but serial (B1→B2→B3) is simplest and is the assumed order here.
- **Multi-session guidance:** a session picking up Phase B should implement the **lowest unchecked
  section in full** (all its checkboxes + its exit criterion) and stop there — don't start the next
  section in the same commit. The section's "Exit" line is the definition of done.
- **Shared reference for B2 + B3:** mirror the player-invite flow
  ([players.py:129 `invite_player`](../backend/app/api/v1/endpoints/players.py#L129) +
  [auth.py:248 `complete_invitation`](../backend/app/api/v1/endpoints/auth.py#L248)), reusing
  `create_invite_token` ([security.py:48](../backend/app/core/security.py#L48), type=invite, 7-day)
  and `publish_notification_event`. The Phase-A `resolve_club_context`/`get_club_context` resolver
  and `can()`/`max_grantable_rank()` from `app/core/permissions.py` are the authority primitives —
  endpoints stay thin; club scoping + escalation guards live in the service.

## B1 — Schema foundation: `staff_invitations` table (net-new migration)
A dedicated table beats overloading `staff_profiles.is_active` (which already means
"deactivated") and cleanly supports promoting an existing tenant user (player → front_desk).
**This is the only irreversible-ish section — land it alone so the migration stays isolated and
bisectable before any endpoint depends on it.**

- [x] **Create model `app/db/models/staff_invitation.py`** — `staff_invitations`:
  `id` PK · `tenant_id` FK (`TenantScopedMixin`) · `club_id` FK · `email` · `role` (`StaffRole`) ·
  `invited_by_user_id` FK→users · `status` (`pending`/`accepted`/`revoked`/`expired`, default
  `pending`) · `expires_at` (now()+7d, matches `create_invite_token` TTL) · `accepted_at` nullable ·
  `accepted_user_id` FK→users nullable · `created_at`/`updated_at`. Service (B2) enforces ≤1
  `pending` per `(club_id, email)`.
- [x] Register model in `app/db/models/__init__.py`.
- [x] Migration (per CLAUDE.md exact order): `alembic heads` (single) → autogenerate → review
  (create enum type **before** the column) → `upgrade head` → `downgrade -1`/`upgrade head`.
  Migration `b94daf2c75e8`; new enum `staffinvitationstatus` created explicitly, `role`/`status`
  use `create_type=False` (reuses shared `staffrole`); downgrade drops only `staffinvitationstatus`.
- [x] Docs: add migration row to `DATA_MODEL.md`; add the new table + migration-group row to
  `DATA_MODEL_TARGET_STATE.md` (G-Staff group, Status ✅); add tenant/club-plane + invite
  single-use rules to `ENTITY_RELATIONSHIPS.md`; bump `_Last updated_` lines.
- [x] **Exit:** migration clean both directions (`alembic downgrade -1 && alembic upgrade head`);
  no API surface change yet → existing suite still green.

## B2 — Invite → accept vertical slice (the security-sensitive core)
The minimal end-to-end loop: an authorized staffer invites someone, the invitee accepts and can log
in. This section carries the riskiest logic (escalation guard, single-use token, find-or-create
user) — keep it isolated so review focuses on correctness of the security-sensitive path.

- [x] **Schemas** `app/schemas/staff.py` (this slice only): `StaffInviteRequest`,
  `StaffInviteResponse`, `CompleteStaffInvitationRequest` (+ `CompleteStaffInvitationResponse`;
  `full_name` collected at accept since the invitation row has no name column).
- [x] **Service** `app/services/staff_invitation_service.py` — `invite` + `accept` only (club
  scoping + escalation guard live here; endpoints stay thin). Leave `revoke`/`list` for B3.
  `invite` flushes (endpoint commits + publishes); `accept` commits.
- [x] **`POST /staff/invitations`** in [staff.py](../backend/app/api/v1/endpoints/staff.py):
  `resolve_club_context` (club_id from body) → `can(role, STAFF_INVITE)` → escalation guard
  `ROLE_RANK[body.role] <= max_grantable_rank(effective_role)` → reject duplicate pending /
  existing active profile (409) → create row → token `create_invite_token({"inv": id})` →
  `publish_notification_event("staff_invite", {...})`. For an **existing** tenant user, attach the
  `StaffProfile` directly (no email round-trip; invitation recorded `accepted`, response flags
  `attached_existing_user`, event skipped).
- [x] **`POST /auth/complete-staff-invitation`** (next to player completion in `auth.py`): decode
  token → load invitation by `inv` → validate `pending` + not expired (lazily flip `expired`) →
  find-or-create `User` by `(email, tenant_id)` (new email sets password + `email_verified_at`,
  adds `Wallet`) → create active `StaffProfile` → mark invitation `accepted` (single-use) → commit.
- [x] **Tests** (integration, `httpx.AsyncClient`): `tests/integration/test_staff_invitations.py` —
  escalation matrix (ops_lead can invite trainer/front_desk but not ops_lead/admin; admin cannot
  invite admin, owner can invite admin); ops_lead@ClubA → ClubB 403; invite role 403 /
  tenant-isolation 401 / unknown+other-tenant club 404 / invalid role 422; happy path + event;
  existing-user direct attach + already-active 409; accept new-email creates active profile + login
  works; replay/expired/revoked/malformed/wrong-type → 400; duplicate pending → 409. (Conftest
  teardown extended to clear `staff_invitations` + accept-created `staff_profiles`.)
- [x] **Exit:** invite a trainer (admin) → accept → new staff logs in and sees the club at role
  `trainer` (covered by `test_login_works_after_accept`); full suite green (**754 passed**).

## B3 — Staff management & read endpoints (additive CRUD)
The list/update/deactivate/revoke surface around the slice. Lowest-risk section; the JWT-doc fix is
a natural wrap-up here.

- [x] **Schemas** `app/schemas/staff.py` (remaining): `StaffListItem`, `StaffUpdateRequest`,
  `InvitationListItem`. (Used `Optional[...]` not `X | None` — pydantic on py3.9 can't eval the
  union syntax at runtime.)
- [x] **Service** — add `list_staff` + `list_invitations` + `revoke` + `update_staff` +
  `deactivate_staff` to `staff_invitation_service.py`. (PATCH/DELETE staff need their own service
  methods beyond the plan's terse "revoke + list".) Escalation guard centralized in
  `_require`/`_require_outranks`: an actor may only act on a member ranked strictly below them, and
  may only grant a role within `max_grantable_rank`. All flush; endpoints commit.
- [x] **Endpoints** in [staff.py](../backend/app/api/v1/endpoints/staff.py):
  - `GET /staff/invitations?club_id=` — list pending/recent, club-scoped.
  - `DELETE /staff/invitations/{id}` — revoke (status→revoked), 204.
  - `GET /staff?club_id=` — list active staff.
  - `PATCH /staff/{staff_id}` — change role/bio (escalation guard).
  - `DELETE /staff/{staff_id}` — deactivate (`is_active=false`), 204.
  - Removed the dead `POST /staff` create-profile stub (onboarding is via invitations).
- [x] **Tests** (integration, `tests/integration/test_staff_management.py`): per endpoint — role
  403 / tenant-isolation 401 / happy path; escalation guard (no acting on peer/superior, no
  granting at/above own rank); invitations don't leak into the staff list.
- [x] Docs: `IMPLEMENTED_API.md` (new Staff section + B2's invite/accept endpoints that had been
  missed; trimmed the `staff.py` stub row); corrected the JWT-claims line in `CLAUDE.md` (token
  carries only `{"sub","tid"}`; role re-read per request, club authority via `resolve_club_context`).
- [x] **Exit:** all six Phase-B endpoints live and documented; full suite green (**776 passed**).

---

## Verification (end-to-end, after Phase B)
1. `docker compose up` (auto-migrates); confirm `staff_invitations` exists.
2. `cd backend && .venv/bin/python -m pytest tests/integration/ -v` (Phase A green throughout).
3. Manual: seed owner → `POST /staff/invitations` (trainer) → inspect `staff_invite` event →
   `POST /auth/complete-staff-invitation` → login as new staff, confirm `clubs[]` shows the club
   with role `trainer`.
4. `alembic downgrade -1 && alembic upgrade head` clean both directions.

## Out of scope (future)
- Roll `get_club_context` across *all* existing club-scoped endpoints.
- Bind `club_id`/role into the JWT (per-request DB read is fine; just fix the doc).
- Capability verbs beyond onboarding (booking override, pricing, etc.).
