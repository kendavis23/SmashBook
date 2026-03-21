from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.security import decode_token
from app.db.models.user import User, TenantUserRole

security = HTTPBearer()

_STAFF_ROLES = {
    TenantUserRole.owner,
    TenantUserRole.admin,
    TenantUserRole.staff,
    TenantUserRole.trainer,
    TenantUserRole.ops_lead,
}
_OPS_LEAD_ROLES = {TenantUserRole.owner, TenantUserRole.admin, TenantUserRole.ops_lead}
_ADMIN_ROLES = {TenantUserRole.owner, TenantUserRole.admin}


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


def _require_role(user: User, allowed_roles: set[TenantUserRole]) -> User:
    if user.role not in allowed_roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    return user


async def require_staff(current_user: User = Depends(get_current_user)) -> User:
    return _require_role(current_user, _STAFF_ROLES)


async def require_ops_lead(current_user: User = Depends(get_current_user)) -> User:
    return _require_role(current_user, _OPS_LEAD_ROLES)


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    return _require_role(current_user, _ADMIN_ROLES)
