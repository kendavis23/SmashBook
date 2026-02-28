from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db, get_read_db
from app.core.security import decode_token
from app.db.models.user import User, TenantUser, TenantUserRole

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
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = decode_token(credentials.credentials)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = await db.get(User, payload.get("sub"))
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    return user


async def _require_role(user: User, allowed_roles: set[TenantUserRole], db: AsyncSession) -> User:
    result = await db.execute(
        select(TenantUser).where(
            TenantUser.user_id == user.id,
            TenantUser.role.in_(allowed_roles),
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    return user


async def require_staff(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_read_db),
) -> User:
    return await _require_role(current_user, _STAFF_ROLES, db)


async def require_ops_lead(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_read_db),
) -> User:
    return await _require_role(current_user, _OPS_LEAD_ROLES, db)


async def require_admin(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_read_db),
) -> User:
    return await _require_role(current_user, _ADMIN_ROLES, db)
