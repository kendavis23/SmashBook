# Integration Testing

This document explains how the integration test suite works, why it's structured this way, and how to extend it.

---

## Why Integration Tests Alongside Unit Tests?

The existing unit tests call endpoint handler functions directly with mocked database sessions. They verify business logic in isolation but cannot catch:

- Wrong route paths or HTTP method mismatches
- Missing or misconfigured auth guards
- Middleware rejecting a request before it reaches the handler
- Pydantic validation errors on the incoming HTTP body
- Incorrect HTTP status codes in the response
- Cross-tenant data leaks (token from Tenant A used against Tenant B's API)
- Real database constraint violations (FK errors, unique violations)

Integration tests fill this gap by sending real HTTP requests through the full stack.

---

## How `pytest` + `httpx.AsyncClient` Works

### In-Process HTTP — No Running Server Required

`AsyncClient` with `ASGITransport` calls the FastAPI app directly in the same process, with no network hop. There are no ports, no sockets, and no server startup.

```
Your test code
     ↓
httpx.AsyncClient     (acts like a real HTTP client)
     ↓
ASGITransport         (bypasses the network; calls the ASGI interface directly)
     ↓
FastAPI app           (your real app — all middleware, routing, and auth run)
     ↓
SQLAlchemy            (hits the real test database)
```

Every layer of the stack runs — `TenantMiddleware`, JWT validation, Pydantic schema parsing, route handlers, and ORM queries — exactly as in production.

---

## Fixture Architecture

```
backend/tests/
├── conftest.py              ← root: sets required env vars before any app import
├── unit/                    ← existing unit tests (mocked DB)
└── integration/
    ├── conftest.py          ← engine, session factory, client, seed fixtures
    ├── test_auth.py         ← register, login, refresh, cross-tenant
    ├── test_clubs.py        ← (next: CRUD, role enforcement, plan limits)
    └── test_courts.py       ← (next: create, update, role enforcement)
```

### Fixture Dependency Chain

```
test_engine (session-scoped)
└── test_session_factory (session-scoped)
    ├── client (function-scoped) — overrides get_db + get_read_db
    ├── plan (function-scoped)
    │   └── tenant (function-scoped)
    │       ├── player (function-scoped)
    │       ├── staff (function-scoped)
    │       ├── admin (function-scoped)
    │       └── club (function-scoped)
    └── player_headers / staff_headers / admin_headers (sync fixtures)
```

---

## The TenantMiddleware Problem (and Solution)

`TenantMiddleware` opens its **own** database session using `AsyncSessionLocal` — the module-level session factory in `app.db.session`. This factory is created at import time using `DATABASE_URL`, which the root `conftest.py` points at the test database before any app module is imported.

This means:
- All seed fixtures **commit** their data (not just flush). Committed data is visible to the middleware's independent session.
- The middleware resolves the tenant from the `X-Tenant-ID` header (a UUID) in tests. Pass this header in every request that needs a tenant context.
- Auth endpoints (`/auth/*`) look up the tenant from the request body (`tenant_subdomain`), so they work even without the `X-Tenant-ID` header.

---

## How the DB Dependency Override Works

Routes use `Depends(get_db)` and `Depends(get_read_db)`. In tests, these are overridden via FastAPI's `dependency_overrides`:

```python
async def override_get_db():
    async with test_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise

app.dependency_overrides[get_db] = override_get_db
```

Every route that depends on `get_db` gets a session from the test database. The override closely mirrors the real `get_db` generator so commit/rollback behaviour is identical.

---

## How Test Isolation Works

### Why Not Rollback?

The typical rollback-based isolation (wrap each test in a transaction, rollback at the end) **does not work here** because `TenantMiddleware` opens a completely separate database connection. Data written inside an uncommitted transaction is invisible to that separate connection.

### Approach: Commit + Explicit Cleanup

Each seed fixture commits its data, then deletes it in the teardown phase. The teardown order is guaranteed by pytest: fixtures are torn down in reverse order of their setup. Since `player`, `staff`, and `club` all depend on `tenant`, they are always torn down before `tenant`.

### Uniqueness

All seed fixtures use UUID-suffixed values for subdomains and email addresses. This prevents unique-constraint conflicts between tests that run in the same session.

```python
subdomain = f"testclub-{uuid.uuid4().hex[:8]}"
email = f"player-{uuid.uuid4().hex[:6]}@test.com"
```

### Session-Start Truncation

`test_engine` truncates all tables when the test session starts. This ensures a clean slate even if a previous run left data behind (e.g. due to a crash mid-teardown).

---

## How Auth Works in Tests

### Option A — Pre-signed Token (used by most tests)

Skips the login round-trip. Still exercises JWT decode and `get_current_user` on every protected request.

```python
@pytest.fixture
def admin_headers(admin, tenant):
    token = create_access_token({"sub": str(admin.id), "tid": str(tenant.id)})
    return {"Authorization": f"Bearer {token}", "X-Tenant-ID": str(tenant.id)}
```

### Option B — Real Login (used by auth endpoint tests)

Calls `POST /auth/login` and extracts the token from the response. Use this when you specifically want to test the auth flow.

```python
resp = await client.post("/api/v1/auth/login", json={
    "tenant_subdomain": tenant.subdomain,
    "email": player.email,
    "password": "Test1234!",
})
token = resp.json()["access_token"]
```

---

## How Multi-Tenancy Works in Tests

Pass the `X-Tenant-ID` header with the tenant's UUID. `TenantMiddleware` resolves the tenant from this header and sets `request.state.tenant`, which `get_tenant` and `get_current_user` then read.

```python
headers = {
    "Authorization": f"Bearer {token}",
    "X-Tenant-ID": str(tenant.id),
}
```

To test cross-tenant isolation, deliberately mismatched the token's `tid` claim against the `X-Tenant-ID` header:

```python
# Token is for tenant A; header says tenant B — should return 401
resp = await client.get("/api/v1/clubs", headers={
    "Authorization": f"Bearer {token_for_tenant_a}",
    "X-Tenant-ID": str(tenant_b.id),
})
assert resp.status_code == 401
```

---

## The Full Flow of One Test

```python
async def test_create_court_requires_staff(client, player_headers, club):
    resp = await client.post("/api/v1/courts", json={
        "club_id": str(club.id),
        "name": "Court 1",
        "surface_type": "indoor",
    }, headers=player_headers)
    assert resp.status_code == 403
```

What runs when this executes:

1. `AsyncClient` sends a POST with JSON body and `Authorization` + `X-Tenant-ID` headers.
2. `ASGITransport` routes it to FastAPI without a network hop.
3. `TenantMiddleware` reads `X-Tenant-ID`, queries the test DB, sets `request.state.tenant`.
4. FastAPI matches route `/api/v1/courts` → `courts.py` handler.
5. `require_staff` dependency: decodes JWT → looks up user → checks `TenantUser` role → raises 403 (player role).
6. FastAPI returns `{"detail": "Insufficient permissions"}` with status 403.
7. Test asserts `resp.status_code == 403`. ✓

---

## Event Loop Configuration

`pytest.ini` sets:

```ini
asyncio_mode = auto
asyncio_default_fixture_loop_scope = session
asyncio_default_test_loop_scope = session
```

All async fixtures and tests share a single session-scoped event loop. This is required because asyncpg connection pools are tied to the event loop on which they are first used — mixing loop scopes causes `"PostgreSQLProtocol was attached to a different event loop"` errors.

---

## Test Database Setup

Integration tests require a PostgreSQL instance at `postgresql://test:test@localhost/test`.

The recommended approach is Docker — it is isolated from any dev database, trivial to reset, and requires no system-level installation.

### Start the container

```bash
docker run -d \
  --name smashbook-test-db \
  -e POSTGRES_USER=test \
  -e POSTGRES_PASSWORD=test \
  -e POSTGRES_DB=test \
  -p 5432:5432 \
  postgres:16
```

### Verify it is ready

```bash
# Wait ~5 seconds after starting, then:
docker exec smashbook-test-db pg_isready -U test
```

### Stop and start between sessions

```bash
docker stop smashbook-test-db
docker start smashbook-test-db
```

### Wipe and recreate from scratch

```bash
docker rm -f smashbook-test-db
# re-run the docker run command above
```

You do not need to run Alembic migrations — the `test_engine` fixture calls `Base.metadata.create_all` on first use, which creates all tables automatically.

---

## Running the Tests

### Auth flows (first test suite)

```bash
cd /Users/ken/SmashBook/backend
.venv/bin/python -m pytest tests/integration/test_auth.py -v
```

Expected output:

```
tests/integration/test_auth.py::TestRegister::test_success PASSED
tests/integration/test_auth.py::TestRegister::test_duplicate_email_returns_409 PASSED
tests/integration/test_auth.py::TestRegister::test_unknown_tenant_returns_404 PASSED
tests/integration/test_auth.py::TestRegister::test_short_password_returns_422 PASSED
tests/integration/test_auth.py::TestLogin::test_success PASSED
tests/integration/test_auth.py::TestLogin::test_wrong_password_returns_401 PASSED
tests/integration/test_auth.py::TestLogin::test_unknown_email_returns_401 PASSED
tests/integration/test_auth.py::TestLogin::test_inactive_user_returns_403 PASSED
tests/integration/test_auth.py::TestRefreshToken::test_success PASSED
tests/integration/test_auth.py::TestRefreshToken::test_access_token_rejected_as_refresh PASSED
tests/integration/test_auth.py::TestRefreshToken::test_garbage_token_rejected PASSED
tests/integration/test_auth.py::TestCrossTenantRejection::test_token_for_tenant_a_rejected_by_tenant_b PASSED
```

### All integration tests

```bash
cd backend
pytest tests/integration/ -v
```

### All tests (unit + integration)

```bash
pytest -v
```

### Useful flags for debugging failures

```bash
# Stop at first failure
.venv/bin/python -m pytest tests/integration/test_auth.py -v -x

# Show print statements and full tracebacks
.venv/bin/python -m pytest tests/integration/test_auth.py -v -s

# Run a single test by name
.venv/bin/python -m pytest tests/integration/test_auth.py::TestLogin::test_inactive_user_returns_403 -v -s
```

### Common failure causes

| Symptom | Likely cause |
|---------|-------------|
| `connection refused` | Docker container not running — `docker start smashbook-test-db` |
| `role "test" does not exist` | Container created without env vars — recreate it |
| `asyncpg.InvalidCatalogNameError` | Database `test` doesn't exist — recreate container |
| `422` where `201` expected | Request body field mismatch — check Pydantic schema |
| All tests fail with import error | Run from `backend/` directory, not project root |

---

## What to Test Per Endpoint (Priority Order)

| Priority | What to test |
|----------|-------------|
| 1 | Auth flows — register, login, refresh, cross-tenant rejection |
| 2 | Role enforcement — one 403 test per role boundary per endpoint |
| 3 | Tenant isolation — user from Tenant A cannot access Tenant B's data |
| 4 | Happy path — success case with correct status code and response shape |
| 5 | Business rule enforcement — plan limits, booking windows, operating hours |
| 6 | Input validation — missing required fields, invalid enum values |

---

## Extending the Test Suite

### Adding a new test file

Create `tests/integration/test_<resource>.py`. Import the fixtures you need from `conftest.py`:

```python
async def test_create_booking_success(client, staff_headers, club):
    resp = await client.post("/api/v1/bookings", json={...}, headers=staff_headers)
    assert resp.status_code == 201
```

### Adding new seed fixtures

Add them to `tests/integration/conftest.py` following the same pattern: commit data, yield the object, delete on teardown.

### Extending cleanup for new models

If a new test creates data in tables that have FK dependencies on `clubs` or `users` (e.g. `bookings`, `staff_profiles`), extend the `_cleanup_tenant` function in `conftest.py` to delete those rows before the club/user/tenant rows. The comment in `_cleanup_tenant` marks exactly where to add this.
