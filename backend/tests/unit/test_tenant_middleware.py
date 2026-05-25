"""
Unit tests for TenantMiddleware resolution logic.

These tests mock the DB fetch helpers so no real database is required.
They focus on the header/host-parsing logic and the middleware's response
to active vs inactive tenants.
"""

import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest

# ---------------------------------------------------------------------------
# Helpers to build minimal Request-like objects
# ---------------------------------------------------------------------------


def _make_request(headers: dict, path: str = "/api/v1/courts") -> SimpleNamespace:
    """Return a minimal request stub accepted by _resolve_tenant."""
    return SimpleNamespace(
        url=SimpleNamespace(path=path),
        headers=headers,
        state=SimpleNamespace(),
    )


# ---------------------------------------------------------------------------
# Import the private resolution helper directly so tests stay fast and pure
# ---------------------------------------------------------------------------

from app.middleware.tenant import _resolve_tenant  # noqa: E402


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

TENANT_ID = uuid.uuid4()
TENANT_ACTIVE = SimpleNamespace(
    id=TENANT_ID,
    player_subdomain="raquetclub",
    staff_subdomain="raquetclub-staff",
    is_active=True,
)
TENANT_INACTIVE = SimpleNamespace(
    id=TENANT_ID,
    player_subdomain="raquetclub",
    staff_subdomain="raquetclub-staff",
    is_active=False,
)


# ---------------------------------------------------------------------------
# Resolution via X-Tenant-ID header
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_resolve_by_x_tenant_id_header():
    request = _make_request({"X-Tenant-ID": str(TENANT_ID)})
    with patch("app.middleware.tenant._fetch_by_id", AsyncMock(return_value=TENANT_ACTIVE)):
        tenant, portal = await _resolve_tenant(request)
    assert tenant is TENANT_ACTIVE
    # UUID-based resolution doesn't tell us which portal the request came from.
    assert portal is None


@pytest.mark.asyncio
async def test_resolve_by_x_tenant_id_malformed_falls_through():
    """A garbled X-Tenant-ID header should be ignored; resolution should
    continue with the next strategy (subdomain header in this case)."""
    request = _make_request({
        "X-Tenant-ID": "not-a-uuid",
        "X-Tenant-Subdomain": "raquetclub",
    })
    with patch(
        "app.middleware.tenant._fetch_by_subdomain",
        AsyncMock(return_value=(TENANT_ACTIVE, "player")),
    ):
        tenant, portal = await _resolve_tenant(request)
    assert tenant is TENANT_ACTIVE
    assert portal == "player"


# ---------------------------------------------------------------------------
# Resolution via X-Tenant-Subdomain header
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_resolve_by_player_subdomain_tags_portal_player():
    request = _make_request({"X-Tenant-Subdomain": "raquetclub"})
    with patch(
        "app.middleware.tenant._fetch_by_subdomain",
        AsyncMock(return_value=(TENANT_ACTIVE, "player")),
    ) as mock:
        tenant, portal = await _resolve_tenant(request)
    mock.assert_awaited_once_with("raquetclub")
    assert tenant is TENANT_ACTIVE
    assert portal == "player"


@pytest.mark.asyncio
async def test_resolve_by_staff_subdomain_tags_portal_staff():
    request = _make_request({"X-Tenant-Subdomain": "raquetclub-staff"})
    with patch(
        "app.middleware.tenant._fetch_by_subdomain",
        AsyncMock(return_value=(TENANT_ACTIVE, "staff")),
    ) as mock:
        tenant, portal = await _resolve_tenant(request)
    mock.assert_awaited_once_with("raquetclub-staff")
    assert tenant is TENANT_ACTIVE
    assert portal == "staff"


@pytest.mark.asyncio
async def test_resolve_subdomain_header_normalised_to_lowercase():
    request = _make_request({"X-Tenant-Subdomain": "  RaquetClub  "})
    with patch(
        "app.middleware.tenant._fetch_by_subdomain",
        AsyncMock(return_value=(TENANT_ACTIVE, "player")),
    ) as mock:
        await _resolve_tenant(request)
    mock.assert_awaited_once_with("raquetclub")


# ---------------------------------------------------------------------------
# Resolution via Host subdomain
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_resolve_by_host_subdomain():
    request = _make_request({"host": "raquetclub.smashbook.app"})
    with patch(
        "app.middleware.tenant._fetch_by_subdomain",
        AsyncMock(return_value=(TENANT_ACTIVE, "player")),
    ) as mock:
        tenant, portal = await _resolve_tenant(request)
    mock.assert_awaited_once_with("raquetclub")
    assert tenant is TENANT_ACTIVE
    assert portal == "player"


@pytest.mark.asyncio
async def test_resolve_by_host_with_port():
    """Port suffix should be stripped before matching."""
    request = _make_request({"host": "raquetclub.smashbook.app:8000"})
    with patch(
        "app.middleware.tenant._fetch_by_subdomain",
        AsyncMock(return_value=(TENANT_ACTIVE, "player")),
    ) as mock:
        tenant, _portal = await _resolve_tenant(request)
    mock.assert_awaited_once_with("raquetclub")
    assert tenant is TENANT_ACTIVE


@pytest.mark.asyncio
async def test_bare_platform_domain_returns_none():
    """A request to smashbook.app itself (no subdomain) should not resolve a tenant."""
    request = _make_request({"host": "smashbook.app"})
    tenant, portal = await _resolve_tenant(request)
    assert tenant is None
    assert portal is None


# ---------------------------------------------------------------------------
# Resolution via custom domain
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_resolve_by_custom_domain():
    request = _make_request({"host": "book.raquetclub.com"})
    with patch(
        "app.middleware.tenant._fetch_by_custom_domain",
        AsyncMock(return_value=TENANT_ACTIVE),
    ) as mock:
        tenant, portal = await _resolve_tenant(request)
    mock.assert_awaited_once_with("book.raquetclub.com")
    assert tenant is TENANT_ACTIVE
    # Custom domain resolution doesn't disambiguate player vs staff portal.
    assert portal is None


# ---------------------------------------------------------------------------
# Localhost / dev environment
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_localhost_returns_none():
    request = _make_request({"host": "localhost"})
    tenant, _ = await _resolve_tenant(request)
    assert tenant is None


@pytest.mark.asyncio
async def test_loopback_returns_none():
    request = _make_request({"host": "127.0.0.1"})
    tenant, _ = await _resolve_tenant(request)
    assert tenant is None


@pytest.mark.asyncio
async def test_localhost_with_subdomain_header_resolves():
    """Even on localhost, explicit X-Tenant-Subdomain should still work."""
    request = _make_request({"host": "localhost:8000", "X-Tenant-Subdomain": "raquetclub"})
    with patch(
        "app.middleware.tenant._fetch_by_subdomain",
        AsyncMock(return_value=(TENANT_ACTIVE, "player")),
    ) as mock:
        tenant, _ = await _resolve_tenant(request)
    mock.assert_awaited_once_with("raquetclub")
    assert tenant is TENANT_ACTIVE


# ---------------------------------------------------------------------------
# Unknown / not-found tenant
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_unknown_subdomain_returns_none():
    request = _make_request({"host": "unknown.smashbook.app"})
    with patch(
        "app.middleware.tenant._fetch_by_subdomain",
        AsyncMock(return_value=(None, None)),
    ):
        tenant, portal = await _resolve_tenant(request)
    assert tenant is None
    assert portal is None


# ---------------------------------------------------------------------------
# Health-check bypass (tested via the full middleware dispatch)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_healthz_bypasses_resolution():
    """Requests to /healthz must skip tenant resolution entirely."""
    from app.middleware.tenant import TenantMiddleware

    call_next_called = False

    async def call_next(req):
        nonlocal call_next_called
        call_next_called = True
        return SimpleNamespace(status_code=200)

    request = _make_request({"host": "raquetclub.smashbook.app"}, path="/healthz")
    request.url = SimpleNamespace(path="/healthz")

    middleware = TenantMiddleware(app=None)  # app not used in dispatch logic

    with patch("app.middleware.tenant._resolve_tenant", AsyncMock()) as mock_resolve:
        await middleware.dispatch(request, call_next)

    mock_resolve.assert_not_called()
    assert call_next_called


# ---------------------------------------------------------------------------
# Inactive tenant returns 503
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_inactive_tenant_returns_503():
    from app.middleware.tenant import TenantMiddleware

    request = _make_request({"host": "raquetclub.smashbook.app"})
    request.url = SimpleNamespace(path="/api/v1/courts")

    middleware = TenantMiddleware(app=None)

    with patch(
        "app.middleware.tenant._resolve_tenant",
        AsyncMock(return_value=(TENANT_INACTIVE, "player")),
    ):
        response = await middleware.dispatch(request, AsyncMock())

    assert response.status_code == 503


@pytest.mark.asyncio
async def test_active_tenant_sets_tenant_portal_on_request_state():
    from app.middleware.tenant import TenantMiddleware

    captured_state = {}

    async def call_next(req):
        captured_state["tenant"] = req.state.tenant
        captured_state["portal"] = req.state.tenant_portal
        return SimpleNamespace(status_code=200)

    request = _make_request({"host": "raquetclub.smashbook.app"})
    middleware = TenantMiddleware(app=None)

    with patch(
        "app.middleware.tenant._resolve_tenant",
        AsyncMock(return_value=(TENANT_ACTIVE, "staff")),
    ):
        await middleware.dispatch(request, call_next)

    assert captured_state["tenant"] is TENANT_ACTIVE
    assert captured_state["portal"] == "staff"
