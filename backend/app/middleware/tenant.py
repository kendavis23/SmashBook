"""
Tenant resolution middleware.

Resolves the current tenant from each inbound request and stores it on
``request.state.tenant`` so downstream dependencies can access it without
hitting the database again.  It also sets the ``current_tenant_id``
ContextVar so any async code in the same request context can read the
tenant without touching the request object.

Resolution priority (first match wins):
  1. ``X-Tenant-ID`` header       — raw UUID, useful for internal / machine clients
  2. ``X-Tenant-Subdomain`` header — human-readable subdomain, handy for local dev & mobile apps
  3. Host subdomain               — ``<subdomain>.smashbook.app``  (primary production mechanism)
  4. Custom domain                — any host that isn't a SmashBook subdomain or a local address

If no tenant can be resolved the middleware lets the request through
unchanged.  This keeps auth endpoints (which look up the tenant from the
request body) working unchanged, and allows the ``get_tenant`` dependency
to raise a clean 422 if a particular endpoint actually requires a tenant.
"""

import re
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.core.context import current_tenant_id
from app.db.models.tenant import Tenant
from app.db.session import AsyncSessionLocal

_SMASHBOOK_DOMAIN = "smashbook.app"
_LOCAL_HOSTS = {"localhost", "127.0.0.1", ""}

# Paths that bypass tenant resolution entirely (e.g. infra health checks).
_BYPASS_PATHS = {"/healthz"}
# Path prefixes that bypass tenant resolution (platform-admin routes have no tenant context).
_BYPASS_PREFIXES = ("/api/v1/admin/",)


class TenantMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if path in _BYPASS_PATHS or any(path.startswith(p) for p in _BYPASS_PREFIXES):
            return await call_next(request)

        tenant = await _resolve_tenant(request)

        if tenant is not None and not tenant.is_active:
            return JSONResponse(
                {"detail": "This tenant is inactive."},
                status_code=503,
            )

        if tenant is not None:
            request.state.tenant = tenant
            token = current_tenant_id.set(tenant.id)
            try:
                return await call_next(request)
            finally:
                current_tenant_id.reset(token)

        return await call_next(request)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


async def _resolve_tenant(request: Request) -> Optional[Tenant]:
    # 1. Explicit UUID header
    raw_id = request.headers.get("X-Tenant-ID")
    if raw_id:
        try:
            tid = UUID(raw_id)
            return await _fetch_by_id(tid)
        except ValueError:
            pass  # malformed header — fall through to next strategy

    # 2. Subdomain header (handy for API clients / local dev)
    subdomain_header = request.headers.get("X-Tenant-Subdomain", "").strip().lower()
    if subdomain_header:
        return await _fetch_by_subdomain(subdomain_header)

    # 3. Host-based resolution
    host = request.headers.get("host", "").split(":")[0].lower()

    if host.endswith(f".{_SMASHBOOK_DOMAIN}"):
        # e.g.  "raquetclub.smashbook.app"
        subdomain = host[: -(len(_SMASHBOOK_DOMAIN) + 1)]
        if subdomain:
            return await _fetch_by_subdomain(subdomain)

    elif host not in _LOCAL_HOSTS and not host.endswith(_SMASHBOOK_DOMAIN):
        # Not a local address and not the bare platform domain — treat as custom domain
        return await _fetch_by_custom_domain(host)

    return None


async def _fetch_by_id(tenant_id: UUID) -> Optional[Tenant]:
    async with AsyncSessionLocal() as session:
        return await session.get(Tenant, tenant_id)


async def _fetch_by_subdomain(subdomain: str) -> Optional[Tenant]:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Tenant).where(Tenant.subdomain == subdomain)
        )
        return result.scalar_one_or_none()


async def _fetch_by_custom_domain(domain: str) -> Optional[Tenant]:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Tenant).where(Tenant.custom_domain == domain)
        )
        return result.scalar_one_or_none()
