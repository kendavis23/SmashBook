from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.permissions import Capability, can
from app.core.security import decode_token
from app.db.models.user import User

security = HTTPBearer()


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = decode_token(credentials.credentials)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user = await db.get(User, payload.get("sub"))
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

    # If TenantMiddleware resolved a tenant, the JWT's tid claim must match
    # both the resolved tenant and the user's own tenant_id.  This prevents
    # a token issued for Tenant A from being used against Tenant B's API.
    request_tenant = getattr(request.state, "tenant", None)
    token_tid = payload.get("tid")

    if request_tenant is not None:
        if token_tid is None or str(request_tenant.id) != token_tid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token tenant does not match the current tenant",
            )

    if token_tid is not None and str(user.tenant_id) != token_tid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token tenant does not match user's tenant",
        )

    return user


def _require_capability(user: User, capability: Capability) -> User:
    if not can(user.role, capability):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    return user


async def require_staff(current_user: User = Depends(get_current_user)) -> User:
    return _require_capability(current_user, Capability.ACCESS_STAFF)


async def require_ops_lead(current_user: User = Depends(get_current_user)) -> User:
    return _require_capability(current_user, Capability.ACCESS_OPS_LEAD)


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    return _require_capability(current_user, Capability.ACCESS_ADMIN)


async def require_owner(current_user: User = Depends(get_current_user)) -> User:
    return _require_capability(current_user, Capability.ACCESS_OWNER)
