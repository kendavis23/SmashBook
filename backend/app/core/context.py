from contextvars import ContextVar
from typing import Optional
from uuid import UUID

# Set by TenantMiddleware at the start of each request.
# Safe for async code — each request gets its own context copy.
current_tenant_id: ContextVar[Optional[UUID]] = ContextVar("current_tenant_id", default=None)
